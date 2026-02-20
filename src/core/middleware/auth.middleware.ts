import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth/types';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    // Nếu không có token → để JwtAuthGuard ở controller xử lý (không throw ở đây)
    // Đây là pattern chuẩn NestJS 11: middleware không block route công khai
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Nếu có token → verify và gắn user vào request
    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Map payload to UserPayload structure
      req.user = {
        ...payload,
        id: payload.sub,
      };
      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
