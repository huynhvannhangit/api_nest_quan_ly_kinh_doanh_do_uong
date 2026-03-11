import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../modules/user/user.service';
import { User } from '../../modules/user/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
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
    } = context.switchToHttp().getRequest();

    const userPayload = request.user;
    const userId = userPayload?.id || userPayload?.sub;

    if (!userId) {
      return false;
    }

    const user: User | undefined = await this.userService.findById(userId);
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
      return true;
    }

    const userRole = user.role;

    // Admin always has access
    if (
      userRole &&
      typeof userRole === 'object' &&
      'name' in userRole &&
      (userRole.name === 'ADMIN' || userRole.name === 'CHỦ CỬA HÀNG')
    ) {
      return true;
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

    if (requiredPermissions) {
      if (
        userRole &&
        typeof userRole === 'object' &&
        'permissions' in userRole &&
        Array.isArray(userRole.permissions)
      ) {
        const userPermissions = userRole.permissions;
        const hasPermission = requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        );
        if (hasPermission) return true;
      }
    }

    return false;
  }
}
