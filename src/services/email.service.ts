import nodemailer from "nodemailer";
import { config } from "../config/environment";

export class EmailService {
  private transporter: nodemailer.Transporter | null;

  constructor() {
    this.transporter = EmailService.isConfigured()
      ? nodemailer.createTransport({
          host: config.email.host,
          port: Number(config.email.port),
          secure: false,
          auth: {
            user: config.email.user,
            pass: config.email.password,
          },
          tls: {
            rejectUnauthorized: true,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        })
      : null;
  }

  static isConfigured(): boolean {
    return Boolean(config.email.user && config.email.password);
  }

  private canSendOptionalMail(): boolean {
    return EmailService.isConfigured() && config.server.nodeEnv !== "test";
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new Error("Email is not configured");
    }

    // Password-reset links must open the installed app via App Links / Universal Links.
    // Never send localhost (common when FRONTEND_URL is left as a local web CORS origin).
    let resetBase = (config.frontend.url || "https://app.anchorworld.org").replace(/\/$/, "");
    if (/localhost|127\.0\.0\.1/i.test(resetBase) || /^http:\/\/192\./i.test(resetBase)) {
      resetBase = "https://app.anchorworld.org";
    }
    const resetUrl = `${resetBase}/reset-password?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: config.email.from || `"Anchor World" <${config.email.user}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #007bff; word-break: break-all;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    if (!this.canSendOptionalMail() || !this.transporter) {
      return;
    }

    const mailOptions = {
      from: config.email.from || `"Anchor World" <${config.email.user}>`,
      to: email,
      subject: "Welcome to Anchor World!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome, ${fullName}!</h2>
          <p>Thank you for joining Anchor World. We're excited to have you in the community!</p>
          <p>Start exploring circles, connect with people who share your interests, and share your story.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch {
      // Welcome email is best-effort; never fail registration or tests.
    }
  }

  async sendEmailVerificationCode(
    email: string,
    code: string,
    fullName?: string
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error("Email is not configured");
    }

    const greeting = fullName ? `Hi ${fullName},` : "Hi,";
    const mailOptions = {
      from: config.email.from || `"Anchor World" <${config.email.user}>`,
      to: email,
      subject: "Verify your Anchor World email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email</h2>
          <p>${greeting}</p>
          <p>Use this code to finish creating your Anchor World account:</p>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1f6feb; margin: 24px 0;">${code}</p>
          <p style="color: #666; font-size: 14px;">This code expires in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email verification code sent to ${email}`);
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }
}
