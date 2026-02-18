import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Permission } from '../../common/enums/permission.enum';
import { UserPayload } from './types';
import { EmailService } from '../email/email.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
    deviceId: string,
  ): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // 1. If user has no Device ID, bind it to this device
      if (!user.deviceId) {
        await this.userService.update(user.id, { deviceId });
        user.deviceId = deviceId;
      }
      // 2. If user has Device ID, check for match
      else if (user.deviceId !== deviceId) {
        const errorMsg = `Login failed: registered device ${user.deviceId}, request device ${deviceId}`;
        console.warn(errorMsg); // Log for security monitoring
        throw new ForbiddenException('Login failed: Invalid Device ID');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: UserPayload) {
    const { email, role, id, permissions } = user;

    this.logger.log(`User ${email} logged in successfully`);

    const tokens = await this.getTokens(id, email, role, permissions);
    await this.updateRefreshToken(id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    return this.userService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.permissions,
    );
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    await this.userService.updateRefreshToken(userId, refreshToken);
  }

  async getTokens(
    userId: number,
    email: string,
    role: string,
    permissions?: Permission[],
  ) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, permissions },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '1d',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role, permissions },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken: at,
      refreshToken: rt,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userService.verifyEmail(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if user exists
      return {
        message:
          'If your email is in our system, you will receive a reset link',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    await this.userService.updateResetPasswordToken(email, resetToken, expires);
    await this.emailService.sendPasswordResetEmail(
      email,
      user.fullName,
      resetToken,
    );

    return {
      message: 'If your email is in our system, you will receive a reset link',
    };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const user = await this.userService.findByResetToken(resetDto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.userService.updatePassword(user.id, resetDto.newPassword);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, changeDto: ChangePasswordDto) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const passwordMatches = await bcrypt.compare(
      changeDto.oldPassword,
      user.password,
    );
    if (!passwordMatches) {
      throw new BadRequestException('Old password does not match');
    }

    await this.userService.updatePassword(userId, changeDto.newPassword);
    return { message: 'Password changed successfully' };
  }
}
