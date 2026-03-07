import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { User, UserStatus } from '../../modules/user/entities/user.entity';
import { Role } from '../../modules/role/entities/role.entity';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Permission } from '../../common/enums/permission.enum';
import { EmailService } from '../email/email.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MESSAGES } from '../../common/constants/messages.constant';

export interface UserPayload {
  sub: number;
  email: string;
  fullName?: string;
  role: string | { name: string; [key: string]: any };
  permissions?: Permission[];
  id?: number;
}

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
  ): Promise<Partial<User> | null> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException(MESSAGES.USER_LOCKED);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Partial<User>) {
    const email = user.email!;
    const id = user.id!;
    const permissions =
      typeof user.role === 'object' ? user.role?.permissions : [];
    const role =
      typeof user.role === 'string' ? user.role : user.role?.name || '';

    this.logger.log(`User ${email} logged in successfully`);

    const tokens = await this.getTokens(
      id,
      email,
      role,
      user.fullName,
      permissions,
      user.avatar,
    );
    await this.updateRefreshToken(id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number) {
    return this.userService.updateRefreshToken(userId, null);
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.refreshToken || user.status !== UserStatus.ACTIVE)
      throw new ForbiddenException(MESSAGES.ACCESS_DENIED_LOCKED);

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches)
      throw new ForbiddenException(MESSAGES.ACCESS_DENIED);

    const roleName = typeof user.role === 'string' ? user.role : user.role.name;

    const tokens = await this.getTokens(
      user.id,
      user.email,
      roleName,
      user.fullName,
      (user.role as Role)?.permissions,
      user.avatar,
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
    fullName?: string,
    permissions?: Permission[],
    avatar?: string | null,
  ) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role, fullName, permissions, avatar },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '1d',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role, fullName, permissions, avatar },
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
      throw new BadRequestException(MESSAGES.INVALID_VERIFICATION_TOKEN);
    }
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return {
        message:
          'If your email is in our system, you will receive a reset link',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

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
      throw new BadRequestException(MESSAGES.INVALID_RESET_TOKEN);
    }

    await this.userService.updatePassword(user.id, resetDto.newPassword);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, changeDto: ChangePasswordDto) {
    const user = await this.userService.findWithPasswordById(userId);
    if (!user) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);

    const passwordMatches = await bcrypt.compare(
      changeDto.oldPassword,
      user.password,
    );
    if (!passwordMatches) {
      throw new BadRequestException(MESSAGES.INVALID_OLD_PASSWORD);
    }

    await this.userService.updatePassword(userId, changeDto.newPassword);
    return { message: 'Password changed successfully' };
  }
}
