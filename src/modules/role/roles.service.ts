import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/edit-role.dto';
import { MESSAGES } from '../../common/constants/messages.constant';
import { Permission } from '../../common/enums/permission.enum';
import { ApprovalsService } from '../approval/approvals.service';
import { UserService } from '../user/user.service';
import {
  ApprovalRequest,
  ApprovalType,
} from '../approval/entities/approval-request.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';

@Injectable()
export class RoleService implements OnModuleInit {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.cleanupInvalidPermissions();
  }

  private async cleanupInvalidPermissions() {
    try {
      const roles = await this.roleRepository.find();
      const validPermissions = Object.values(Permission) as string[];
      let updateCount = 0;

      for (const role of roles) {
        if (!role.permissions) continue;

        const originalCount = role.permissions.length;
        role.permissions = role.permissions.filter((p) =>
          validPermissions.includes(p),
        );

        if (role.permissions.length !== originalCount) {
          await this.roleRepository.save(role);
          updateCount++;
        }
      }

      if (updateCount > 0) {
        this.logger.log(
          `Successfully cleaned up invalid permissions for ${updateCount} roles.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to cleanup invalid permissions:', error);
    }
  }

  async create(
    createRoleDto: CreateRoleDto,
    userId?: number,
    reason?: string,
  ): Promise<Role | ApprovalRequest> {
    if (!userId) {
      return this.executeCreate(createRoleDto);
    }
    const user = await this.userService.findById(userId);
    const role = user?.role as Role | undefined;
    const roleName = role?.name;
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeCreate(createRoleDto);
    }

    return this.approvalsService.create(
      {
        type: ApprovalType.CREATE,
        targetModule: 'Vai trò',
        metadata: {
          serviceName: 'RoleService',
          methodName: 'executeCreate',
          args: [createRoleDto],
          newData: createRoleDto,
        },
        reason: reason || `Tạo vai trò mới: ${createRoleDto.name}`,
      },
      userId,
    );
  }

  async executeCreate(
    createRoleDto: CreateRoleDto,
    _reviewedBy?: number,
    skipNotification = false,
  ): Promise<Role> {
    const role = this.roleRepository.create(createRoleDto);
    const saved = await this.roleRepository.save(role);

    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Vai trò mới',
        `Vai trò "${saved.name}" đã được tạo.`,
        { type: 'ROLE', action: 'CREATE', id: saved.id },
      );
    }

    return saved;
  }

  findAll() {
    return this.roleRepository.find();
  }

  async findByName(name: string) {
    return this.roleRepository.findOne({ where: { name } });
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException(MESSAGES.ROLE_NOT_FOUND);
    return role;
  }

  async update(
    id: number,
    updateRoleDto: UpdateRoleDto,
    userId?: number,
    reason?: string,
  ): Promise<Role | ApprovalRequest> {
    if (!userId) {
      return this.executeUpdate(id, updateRoleDto);
    }
    const user = await this.userService.findById(userId);
    const role = user?.role as Role | undefined;
    const roleName = role?.name;
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeUpdate(id, updateRoleDto);
    }

    const oldData = await this.findOne(id);
    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        targetModule: 'Vai trò',
        metadata: {
          serviceName: 'RoleService',
          methodName: 'executeUpdate',
          args: [id, updateRoleDto],
          oldData,
          newData: updateRoleDto,
        },
        reason: reason || `Cập nhật vai trò: ${oldData.name}`,
      },
      userId,
    );
  }

  async executeUpdate(
    id: number,
    updateRoleDto: UpdateRoleDto,
    _reviewedBy?: number,
    skipNotification = false,
  ): Promise<Role> {
    const role = await this.findOne(id);
    Object.assign(role, updateRoleDto);
    const saved = await this.roleRepository.save(role);

    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật vai trò',
        `Vai trò "${saved.name}" đã được cập nhật.`,
        { type: 'ROLE', action: 'UPDATE', id: saved.id },
      );
    }

    return saved;
  }

  async remove(
    id: number,
    userId?: number,
    reason?: string,
  ): Promise<void | ApprovalRequest> {
    if (!userId) {
      return this.executeRemove(id);
    }
    const user = await this.userService.findById(userId);
    const role = user?.role as Role | undefined;
    const roleName = role?.name;
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemove(id);
    }

    const oldData = await this.findOne(id);
    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Vai trò',
        metadata: {
          serviceName: 'RoleService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xóa vai trò: ${oldData.name}`,
      },
      userId,
    );
  }

  async executeRemove(
    id: number,
    _reviewedBy?: number,
    skipNotification = false,
  ): Promise<void> {
    const role = await this.findOne(id);
    const roleName = role.name;
    await this.roleRepository.remove(role);

    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa vai trò',
        `Vai trò "${roleName}" đã bị xóa.`,
        { type: 'ROLE', action: 'DELETE', id },
      );
    }
  }
}
