import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Chào mừng đến với hệ thống quản lý kinh doanh đồ uống',
      template: './welcome',
      context: {
        fullName,
        appName: 'Hệ thống quản lý kinh doanh đồ uống',
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      template: './reset-password',
      context: {
        fullName,
        resetUrl,
        appName: 'Hệ thống quản lý kinh doanh đồ uống',
      },
    });
  }

  async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác thực email của bạn',
      template: './verify-email',
      context: {
        fullName,
        verificationUrl,
        appName: 'Hệ thống quản lý kinh doanh đồ uống',
      },
    });
  }
}
