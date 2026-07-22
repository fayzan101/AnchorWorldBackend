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
      subject: "Reset your Anchor World password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f4f7fb;">
          <div style="background: #ffffff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(26,35,50,0.06);">
            <h2 style="margin: 0 0 12px; color: #1a2332; font-size: 22px;">Reset your password</h2>
            <p style="margin: 0 0 24px; color: #4b5565; line-height: 1.5;">
              We received a request to reset your Anchor World password. Tap the button below to choose a new one.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
              <tr>
                <td align="center" bgcolor="#1f6feb" style="border-radius: 12px;">
                  <a href="${resetUrl}"
                     target="_blank"
                     style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">
                    Reset password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.45;">
              This button expires in 1 hour. If you didn’t request a reset, you can ignore this email.
            </p>
          </div>
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
