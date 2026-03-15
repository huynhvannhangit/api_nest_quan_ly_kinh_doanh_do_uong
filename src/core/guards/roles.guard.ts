/* cspell:disable */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { UserService } from '../../modules/user/user.service';
import { User } from '../../modules/user/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request: {
      user: { id?: number; sub?: number };
      params: Record<string, string>;
      method: string;
      body?: Record<string, unknown>;
    } = context.switchToHttp().getRequest();

    const userPayload = request.user;
    const userId = userPayload?.id || userPayload?.sub;

    if (!userId) {
      return false;
    }

    const userService = this.moduleRef.get(UserService, { strict: false });
    if (!userService) {
      this.logger.error('UserService not found in current context');
      return false;
    }

    const user: User | undefined = await userService.findById(userId);
    if (!user || user.status !== ('ACTIVE' as any)) {
      return false;
    }

    // Allow user to view/update their own profile
    if (
      context.getClass().name === 'UserController' &&
      request.params.id &&
      +request.params.id === userId &&
      (request.method === 'GET' ||
        request.method === 'PATCH' ||
        request.method === 'POST')
    ) {
      // If updating own profile, do not allow changing roleId unless they have proper permissions
      const body = request.body;
      if (request.method === 'PATCH' && body && 'roleId' in body) {
        // Fall through to permission check logic below for roleId updates
        this.logger.warn(
          `User ${userId} attempted to update their own roleId. Falling back to permission check.`,
        );
      } else {
        return true;
      }
    }

    const userRole = user.role;

    // Logic kiểm tra dựa trên Permission động từ DB
    if (requiredPermissions) {
      if (
        userRole &&
        typeof userRole === 'object' &&
        'permissions' in userRole &&
        Array.isArray(userRole.permissions)
      ) {
        const userPermissions = userRole.permissions;
        // Check if user has ANY of the required permissions
        const hasPermission = requiredPermissions.some((permission) =>
          userPermissions.includes(permission),
        );
        if (hasPermission) return true;
      }
    }

    if (requiredRoles) {
      if (typeof userRole === 'string') {
        if (requiredRoles.includes(userRole)) return true;
      } else if (
        userRole &&
        typeof userRole === 'object' &&
        'name' in userRole
      ) {
        if (requiredRoles.includes(userRole.name)) return true;
      }
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
  }
}
