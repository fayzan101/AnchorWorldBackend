import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { EmailService } from './email.service';
import { PointsService } from './points.service';
import { ReferralService } from './referral.service';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { RegisterDto, LoginDto } from '../types';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private userRepository: UserRepository;
  private refreshTokenRepository: RefreshTokenRepository;
  private emailService: EmailService;
  private pointsService: PointsService;
  private referralService: ReferralService;

  constructor() {
    this.userRepository = new UserRepository();
    this.refreshTokenRepository = new RefreshTokenRepository();
    this.emailService = new EmailService();
    this.pointsService = new PointsService();
    this.referralService = new ReferralService();
  }

  async register(data: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await this.userRepository.create({
      email: data.email,
      password_hash: passwordHash,
      full_name: data.full_name,
      date_of_birth: new Date(data.date_of_birth),
      gender: data.gender,
      email_verified_at: null,
    });

    // Generate personal referral code
    try {
      await this.referralService.ensureReferralCode(user.id);
    } catch (error) {
      // Non-fatal: user can still register; code can be generated later via GET /referrals/me
      console.error("Failed to generate referral code on register:", error);
    }

    // Apply invite code if provided
    if (data.referral_code?.trim()) {
      try {
        await this.referralService.applyCode(user.id, data.referral_code);
      } catch (error) {
        // Soft-fail invalid codes at register so signup still succeeds
        if (!(error instanceof AppError) || error.statusCode === 500) {
          throw error;
        }
      }
    }

    const emailConfigured = EmailService.isConfigured() && process.env.NODE_ENV !== 'test';
    let emailVerificationRequired = false;

    if (emailConfigured) {
      const code = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      await this.userRepository.setEmailVerificationCode(user.id, code, expiresAt);
      emailVerificationRequired = true;
      try {
        await this.emailService.sendEmailVerificationCode(user.email, code, user.full_name);
      } catch (error) {
        // Keep the account + code; client can open verify screen and tap Resend.
        console.error("[register] Failed to send verification email:", error);
      }
    } else {
      // Dev/CI without SMTP: mark verified so local flows keep working.
      await this.userRepository.markEmailVerified(user.id);
      user.email_verified_at = new Date();
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      user: {
        ...user,
        email_verified_at: emailVerificationRequired ? null : user.email_verified_at ?? new Date(),
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      email_verification_required: emailVerificationRequired,
    };
  }

  async login(data: LoginDto) {
    // Find user with password
    const user = await this.userRepository.findByEmailWithPassword(data.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check report count
    if(Number(user.report_count) > 3){
      throw new AppError('You have been reported too many times, you cannot log in', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.email_verified_at) {
      // Refresh OTP so they can finish verification from sign-in.
      if (EmailService.isConfigured() && process.env.NODE_ENV !== 'test') {
        try {
          await this.issueVerificationCode(user.id, user.email, user.full_name);
        } catch (error) {
          console.error("[login] Failed to resend verification email:", error);
        }
      }
      throw new AppError(
        'Please verify your email before signing in. We sent you a new code.',
        403,
        true,
        'EMAIL_NOT_VERIFIED'
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store refresh token (replace existing sessions on new login)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokenRepository.deleteByUserId(user.id);
    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);

    await this.pointsService.awardDailyLogin(user.id).catch(console.error);

    return {
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.userRepository.findByEmailWithVerification(email.trim().toLowerCase());
    if (!user) {
      throw new AppError('Invalid verification code', 400);
    }

    if (user.email_verified_at) {
      return { message: 'Email already verified', email_verified: true };
    }

    const stored = (user.email_verification_code || '').trim();
    const expires = user.email_verification_expires;
    if (!stored || !expires || expires < new Date()) {
      throw new AppError('Verification code expired. Please request a new one.', 400);
    }
    if (stored !== code.trim()) {
      throw new AppError('Invalid verification code', 400);
    }

    await this.userRepository.markEmailVerified(user.id);
    void this.emailService.sendWelcomeEmail(user.email, user.full_name);

    // Issue tokens so verify-from-login (no prior session) can continue.
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokenRepository.deleteByUserId(user.id);
    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      message: 'Email verified successfully',
      email_verified: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async resendVerification(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalized);
    // Do not reveal whether the email exists.
    if (!user) {
      return { message: 'If an account exists, a verification code has been sent' };
    }
    if (user.email_verified_at) {
      return { message: 'Email is already verified' };
    }
    if (!EmailService.isConfigured() || process.env.NODE_ENV === 'test') {
      await this.userRepository.markEmailVerified(user.id);
      return { message: 'Email verified (email delivery unavailable in this environment)' };
    }

    try {
      await this.issueVerificationCode(user.id, user.email, user.full_name);
    } catch (error) {
      console.error("[resend-verification] Failed to send email:", error);
      throw new AppError(
        "Unable to send verification email. Please try again later.",
        503
      );
    }

    return { message: 'If an account exists, a verification code has been sent' };
  }

  private generateVerificationCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async issueVerificationCode(
    userId: string,
    email: string,
    fullName: string
  ): Promise<void> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    await this.userRepository.setEmailVerificationCode(userId, code, expiresAt);
    await this.emailService.sendEmailVerificationCode(email, code, fullName);
  }

  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if token exists in database
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!storedToken) {
      throw new AppError('Refresh token not found', 401);
    }

    // Check if token is expired
    if (storedToken.expires_at < new Date()) {
      await this.refreshTokenRepository.deleteByToken(refreshToken);
      throw new AppError('Refresh token expired', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({ id: decoded.id, email: decoded.email });

    return {
      access_token: accessToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store reset token
    await this.userRepository.setResetToken(user.id, resetToken, expiresAt);

    // Send reset email (required when user exists)
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error("[forgot-password] Failed to send reset email:", error);
      throw new AppError(
        "Unable to send password reset email. Please try again later.",
        503
      );
    }

    return { message: 'If email exists, reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find user by reset token
    const user = await this.userRepository.findByResetToken(token);
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await this.userRepository.update(user.id, { password_hash: passwordHash });
    await this.userRepository.clearResetToken(user.id);

    // Invalidate all refresh tokens
    await this.refreshTokenRepository.deleteByUserId(user.id);

    return { message: 'Password reset successful' };
  }

  async logout(refreshToken: string) {
    await this.refreshTokenRepository.deleteByToken(refreshToken);
    return { message: 'Logged out successfully' };
  }
}