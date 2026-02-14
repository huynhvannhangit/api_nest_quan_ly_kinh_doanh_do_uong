import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    const body = req.body as { deviceId?: string };
    const deviceId = body.deviceId;

    if (!deviceId) {
      throw new UnauthorizedException('Device ID is required in request body');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = await this.authService.validateUser(email, password, deviceId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
