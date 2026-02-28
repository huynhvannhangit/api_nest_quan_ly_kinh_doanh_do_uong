import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedUser {
  id?: number;
  email?: string;
  username?: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Methods
  green: '\x1b[32m', // GET
  yellow: '\x1b[33m', // POST / PATCH / PUT
  blue: '\x1b[34m', // dashboard / neutral
  magenta: '\x1b[35m', // user email / identity
  cyan: '\x1b[36m', // route path
  red: '\x1b[31m', // DELETE / errors
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function colorMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return `${C.bold}${C.green}GET   ${C.reset}`;
    case 'POST':
      return `${C.bold}${C.yellow}POST  ${C.reset}`;
    case 'PATCH':
      return `${C.bold}${C.yellow}PATCH ${C.reset}`;
    case 'PUT':
      return `${C.bold}${C.yellow}PUT   ${C.reset}`;
    case 'DELETE':
      return `${C.bold}${C.red}DELETE${C.reset}`;
    default:
      return `${C.bold}${method.padEnd(6)}${C.reset}`;
  }
}

function colorStatus(status: number): string {
  if (status >= 500) return `${C.bold}${C.red}${status}${C.reset}`;
  if (status >= 400) return `${C.bold}${C.yellow}${status}${C.reset}`;
  if (status >= 300) return `${C.bold}${C.cyan}${status}${C.reset}`;
  return `${C.bold}${C.green}${status}${C.reset}`;
}

function colorDuration(ms: number): string {
  if (ms > 500) return `${C.red}${ms}ms${C.reset}`;
  if (ms > 200) return `${C.yellow}${ms}ms${C.reset}`;
  return `${C.green}${ms}ms${C.reset}`;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const contentLength = res.get('content-length') ?? '-';

      // Get user info from JWT (set by AuthMiddleware)
      const user = (req as RequestWithUser).user;
      const userInfo = user
        ? `${C.magenta}[${user.email ?? user.username ?? `id:${user.id}`}]${C.reset} `
        : '';

      // Rút gọn User-Agent
      const ua = req.get('user-agent') || '';
      const uaShort = ua.includes('Mozilla')
        ? (ua.match(/(Chrome|Firefox|Safari|Edge|curl)\/[\d.]+/)?.[0] ??
          'Browser')
        : ua.substring(0, 20);

      const path = `${C.cyan}${originalUrl}${C.reset}`;
      const ipStr = `${C.gray}${ip}${C.reset}`;
      const uaStr = `${C.gray}${uaShort}${C.reset}`;
      const sizeStr =
        contentLength !== '-' ? `${C.dim}${contentLength}B${C.reset}` : '';

      const message =
        `${userInfo}${colorMethod(method)} ${path} ` +
        `${colorStatus(statusCode)} ${colorDuration(duration)} ` +
        `${sizeStr} ${ipStr} ${uaStr}`.trim();

      if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
