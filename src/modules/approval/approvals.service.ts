import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import {
  ApprovalRequest,
  ApprovalStatus,
} from './entities/approval-request.entity';

interface ApprovalMetadata {
  serviceName: string;
  methodName: string;
  args: any[];
}

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
    private readonly moduleRef: ModuleRef,
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

  async findAll(): Promise<ApprovalRequest[]> {
    return this.approvalRepository.find({
      relations: ['requestedBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ApprovalRequest> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['requestedBy', 'reviewedBy'],
    });
    if (!approval) {
      throw new NotFoundException(`Approval request with ID ${id} not found`);
    }
    return approval;
  }

  async review(
    id: number,
    userId: number,
    data: { status: ApprovalStatus; reviewNote?: string },
  ): Promise<ApprovalRequest> {
    const approval = await this.findOne(id);
    const prevStatus = approval.status;

    approval.status = data.status;
    approval.reviewNote = data.reviewNote || '';
    approval.reviewedBy = { id: userId } as User;
    approval.reviewedAt = new Date();
    approval.updatedBy = userId;

    const saved = await this.approvalRepository.save(approval);

    // If approved, execute the corresponding action
    if (
      prevStatus === ApprovalStatus.PENDING &&
      data.status === ApprovalStatus.APPROVED
    ) {
      await this.executeAction(saved).catch((err: any) => {
        this.logger.error(
          `Failed to execute approved action: ${err?.message || 'Unknown error'}`,
        );
        // Optionally revert status or handle error
      });
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
      const service = this.moduleRef.get(metadata.serviceName, {
        strict: false,
      });
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
    } catch (error: any) {
      this.logger.error(
        `Execution error: ${error?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  async remove(id: number, userId: number): Promise<void> {
    const approval = await this.findOne(id);
    approval.deletedBy = userId;
    await this.approvalRepository.save(approval);
    await this.approvalRepository.softRemove(approval);
  }
}
