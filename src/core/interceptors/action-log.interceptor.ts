import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request as ExpressRequest } from 'express';
import { LoggingService } from '../../modules/logging/logging.service';
import {
  ACTION_LOG_KEY,
  ActionLogOptions,
} from '../decorators/action-log.decorator';

@Injectable()
export class ActionLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private loggingService: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<ActionLogOptions>(
      ACTION_LOG_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<ExpressRequest>();
    const user = request.user as { id: number } | undefined;
    const { method, url } = request;
    let { ip } = request;
    const userAgent = request.get('user-agent') || '';

    // Normalize IPv6 loopback and mapped IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    } else if (ip && ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    return next.handle().pipe(
      tap(() => {
        // Fire and forget logging
        this.loggingService
          .logAction({
            userId: user?.id,
            action: options.action,
            module: options.module,
            description: options.description || `${method} ${url}`,
            ipAddress: ip,
            userAgent: userAgent,
            metadata: {
              method,
              url,
              body: this.maskSensitiveInfo(request.body as Record<string, any>),
              params: request.params as Record<string, any>,
              query: request.query as Record<string, any>,
            },
          })
          .catch((error) => {
            console.error('Action Logging Error:', error);
          });
      }),
    );
  }

  private maskSensitiveInfo(body: Record<string, any>): Record<string, any> {
    if (!body || typeof body !== 'object') return body;

    const maskedBody = { ...body };
    const sensitiveKeys = [
      'password',
      'oldPassword',
      'newPassword',
      'refreshToken',
      'token',
      'accessToken',
    ];

    for (const key of sensitiveKeys) {
      if (key in maskedBody) {
        maskedBody[key] = '********';
      }
    }

    return maskedBody;
  }
}
