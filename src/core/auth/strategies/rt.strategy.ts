import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, UserPayload } from '../types';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract from cookie or authorization header depending on design
          // Here assuming Bearer token as fallback or specific header, but plan mentioned cookie.
          // Implementing cookie extraction:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          let data = request?.cookies?.['refresh_token'];
          if (!data) {
            const authHeader = request.headers['authorization'];
            if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
              data = authHeader.split(' ')[1];
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return data;
        },
      ]),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtPayload,
  ): UserPayload & { refreshToken: string } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken =
      req?.get('authorization')?.replace('Bearer', '').trim() ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.cookies?.['refresh_token'];

    if (!refreshToken) throw new ForbiddenException('Refresh token malformed');

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      refreshToken,
    };
  }
}
