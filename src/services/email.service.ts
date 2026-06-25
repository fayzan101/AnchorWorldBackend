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

    const resetBase = config.frontend.url.replace(/\/$/, "");
    const resetUrl = `${resetBase}/reset-password?token=${token}`;

    const mailOptions = {
      from: config.email.from || `"Anchor App" <${config.email.user}>`,
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
      from: config.email.from || `"Anchor App" <${config.email.user}>`,
      to: email,
      subject: "Welcome to Dating App!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome, ${fullName}!</h2>
          <p>Thank you for joining our dating app. We're excited to have you here!</p>
          <p>Start exploring and connect with amazing people today.</p>
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
}
