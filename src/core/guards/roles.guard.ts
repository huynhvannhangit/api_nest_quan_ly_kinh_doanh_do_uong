import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole } from '../../modules/user/entities/user.entity';
import { UserPayload } from '../auth/types';
import { Permission } from '../../common/enums/permission.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
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

    const { user } = context.switchToHttp().getRequest<{ user: UserPayload }>();
    if (!user) return false;

    // ADMIN has full access
    if (user.role === (UserRole.ADMIN as string)) {
      return true;
    }

    // Check Roles
    const hasRole = requiredRoles
      ? requiredRoles.some((role) => user.role === (role as string))
      : false;

    // Check Permissions
    const hasPermission = requiredPermissions
      ? requiredPermissions.some((perm) =>
          (user.permissions as string[])?.includes(perm as string),
        )
      : false;

    // If endpoint requires either role or permission, grant access if one is met
    // If only roles are specified, check roles. If only permissions, check permissions.
    if (requiredRoles && requiredPermissions) {
      return hasRole || hasPermission;
    }

    return hasRole || hasPermission;
  }
}
