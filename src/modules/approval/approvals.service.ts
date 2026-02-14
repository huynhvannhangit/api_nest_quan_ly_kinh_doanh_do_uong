import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import {
  ApprovalRequest,
  ApprovalStatus,
} from './entities/approval-request.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
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

    approval.status = data.status;
    approval.reviewNote = data.reviewNote || '';
    approval.reviewedBy = { id: userId } as User;
    approval.reviewedAt = new Date();
    approval.updatedBy = userId;

    return this.approvalRepository.save(approval);
  }

  async remove(id: number, userId: number): Promise<void> {
    const approval = await this.findOne(id);
    approval.deletedBy = userId;
    await this.approvalRepository.save(approval);
    await this.approvalRepository.softRemove(approval);
  }
}
