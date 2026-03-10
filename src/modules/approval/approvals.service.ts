import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  'Đơn hàng': Permission.ORDER_APPROVE,
  'Hoá đơn': Permission.INVOICE_APPROVE,
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
    return this.approvalRepository.save(approval);
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
        !permissions.includes(Permission.APPROVAL_MANAGE)
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
    this.notificationService.sendNotification(
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
        this.logger.error(`Failed to execute approved action: ${errorMessage}`);
        // Optionally revert status or handle error
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
      await method.apply(service, [...args, approval.reviewedBy.id]);
      this.logger.log(
        `Successfully executed ${metadata.serviceName}.${methodName} for approval ${approval.requestNumber}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Execution error: ${errorMessage}`);
      throw error;
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    const approval = await this.findOne(id);
    approval.deletedBy = userId;
    await this.approvalRepository.save(approval);
    await this.approvalRepository.softRemove(approval);
  }

  async removeMany(ids: number[], userId: number): Promise<void> {
    const approvals = await this.approvalRepository.find({
      where: { id: In(ids) },
    });
    for (const approval of approvals) {
      approval.deletedBy = userId;
    }
    await this.approvalRepository.save(approvals);
    await this.approvalRepository.softRemove(approvals);
  }
}
