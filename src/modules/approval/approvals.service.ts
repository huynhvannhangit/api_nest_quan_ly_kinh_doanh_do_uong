import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import {
  ApprovalRequest,
  ApprovalStatus,
} from './entities/approval-request.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';
import { MESSAGES } from '../../common/constants/messages.constant';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../role/entities/role.entity';
import { UserService } from '../user/user.service';

interface ApprovalMetadata {
  serviceName: string;
  methodName: string;
  args: unknown[];
}

const MODULE_APPROVE_PERMISSION_MAP: Record<string, Permission> = {
  'Sản phẩm': Permission.PRODUCT_APPROVE,
  'Nhân viên': Permission.EMPLOYEE_APPROVE,
  Bàn: Permission.TABLE_APPROVE,
  'Khu vực': Permission.AREA_APPROVE,
  'Danh mục': Permission.CATEGORY_APPROVE,
  'Tài khoản': Permission.USER_APPROVE,
  'Vai trò': Permission.ROLE_APPROVE,
  'Hóa đơn': Permission.INVOICE_APPROVE,
};

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly moduleRef: ModuleRef,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(data: any, userId: number): Promise<ApprovalRequest> {
    const requestNumber = `REQ-${Date.now()}`;
    const approval = new ApprovalRequest();
    Object.assign(approval, data);
    approval.requestNumber = requestNumber;
    approval.requestedBy = { id: userId } as User;
    approval.createdBy = userId;
    approval.updatedBy = userId;
    approval.status = ApprovalStatus.PENDING;
    const saved = await this.approvalRepository.save(approval);

    // Thông báo cho Admin/Chủ cửa hàng (Background)
    void this.userService
      .findAdmins()
      .then((admins) => {
        const requesterName = approval.requestedBy?.fullName || 'Nhân viên';
        for (const adminUser of admins) {
          // Tránh gửi cho chính mình nếu admin là người gửi (thực tế Admin bypass rồi nhưng để cho chắc)
          if (adminUser.id === userId) continue;

          void this.notificationService.sendNotification(
            NotificationType.APPROVAL_UPDATED, // Use same category or maybe SYSTEM/NEW_APPROVAL if we had it
            'Yêu cầu phê duyệt mới',
            `${requesterName} vừa gửi yêu cầu "${approval.reason || approval.targetModule}"`,
            {
              approvalId: saved.id,
              requestNumber: saved.requestNumber,
              type: approval.type,
              targetModule: approval.targetModule,
            },
            adminUser.id,
          );
        }
      })
      .catch((err) => {
        this.logger.error('Failed to notify admins about new approval', err);
      });

    return saved;
  }

  async findAll(keyword?: string): Promise<ApprovalRequest[]> {
    const kw = keyword?.trim();
    if (!kw) {
      return this.approvalRepository.find({
        relations: ['requestedBy', 'reviewedBy'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.approvalRepository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.requestedBy', 'requestedBy')
      .leftJoinAndSelect('approval.reviewedBy', 'reviewedBy')
      .where('approval.reason LIKE :kw', { kw: `%${kw}%` })
      .orWhere('approval.targetModule LIKE :kw', { kw: `%${kw}%` })
      .orWhere('requestedBy.fullName LIKE :kw', { kw: `%${kw}%` })
      .orderBy('approval.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<ApprovalRequest> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['requestedBy', 'reviewedBy'],
    });
    if (!approval) {
      throw new NotFoundException(MESSAGES.APPROVAL_NOT_FOUND);
    }
    return approval;
  }

  async review(
    id: number,
    userId: number,
    data: { status: ApprovalStatus; reviewNote?: string },
  ): Promise<ApprovalRequest> {
    const approval = await this.findOne(id);
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    // Permission check
    const reviewer = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    const role = reviewer?.role as Role;
    const permissions = role?.permissions || [];
    const isAdmin = role?.name === 'ADMIN' || role?.name === 'CHỦ CỬA HÀNG';

    if (!isAdmin) {
      const requiredPermission =
        MODULE_APPROVE_PERMISSION_MAP[approval.targetModule];
      if (
        requiredPermission &&
        !permissions.includes(requiredPermission) &&
        !permissions.includes(Permission.APPROVAL_APPROVE) &&
        !permissions.includes(Permission.APPROVAL_REJECT)
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền phê duyệt yêu cầu cho module này',
        );
      }
    }

    const prevStatus = approval.status;

    approval.status = data.status;
    approval.reviewNote = data.reviewNote || '';
    approval.reviewedBy = { id: userId } as User;
    approval.reviewedAt = new Date();
    approval.updatedBy = userId;

    const saved = await this.approvalRepository.save(approval);

    // Gửi thông báo khi approval được duyệt hoặc từ chối
    const isApproved = data.status === ApprovalStatus.APPROVED;
    const statusLabel = isApproved ? 'Đã duyệt' : 'Đã từ chối';
    // cspell:disable
    void this.notificationService.sendNotification(
      NotificationType.APPROVAL_UPDATED,
      `${statusLabel} yêu cầu phê duyệt`,
      `Yêu cầu ${saved.requestNumber} đã được ${isApproved ? 'phê duyệt' : 'tối chối'}${data.reviewNote ? `: "${data.reviewNote}"` : ''}`,
      {
        approvalId: saved.id,
        requestNumber: saved.requestNumber,
        status: data.status,
        reviewNote: data.reviewNote,
        reviewedBy: userId,
      },
      saved.requestedBy.id, // Target only the requester
    );
    // cspell:enable

    // If approved, execute the corresponding action
    if (
      prevStatus === ApprovalStatus.PENDING &&
      data.status === ApprovalStatus.APPROVED
    ) {
      try {
        await this.executeAction(saved);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Duyệt yêu cầu thất bại';
        this.logger.error(
          `Failed to execute approved action for REQ ${saved.requestNumber}: ${errorMessage}`,
        );
        // Important: Re-throw to inform the controller/user that the action failed
        // even though metadata was found.
        throw new BadRequestException(
          `Yêu cầu được duyệt nhưng thực thi hành động thất bại: ${errorMessage}`,
        );
      }
    }

    return saved;
  }

  private async executeAction(approval: ApprovalRequest): Promise<void> {
    const metadata = approval.metadata as unknown as ApprovalMetadata;
    if (!metadata || !metadata.serviceName || !metadata.methodName) {
      this.logger.warn(
        `No execution metadata for approval request ${approval.requestNumber}`,
      );
      return;
    }

    try {
      // Resolve the service dynamically
      // metadata.serviceName should be the class name or token
      const service = this.moduleRef.get<Record<string, unknown>>(
        metadata.serviceName,
        {
          strict: false,
        },
      );
      if (!service) {
        throw new Error(`Service ${metadata.serviceName} not found`);
      }

      const methodName = metadata.methodName;
      const method = service[methodName];
      if (typeof method !== 'function') {
        throw new Error(
          `Method ${methodName} not found on service ${metadata.serviceName}`,
        );
      }

      // Execute with arguments from metadata
      const args = metadata.args || [];
      // Pass reviewedBy.id and a flag to skip broadcast notifications
      await method.apply(service, [...args, approval.reviewedBy.id, true]);
      this.logger.log(
        `Successfully executed ${metadata.serviceName}.${methodName} for approval ${approval.requestNumber}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Execution error for REQ ${approval.requestNumber} (${metadata.serviceName}.${metadata.methodName}): ${errorMessage}`,
      );
      throw error;
    }
  }
}
