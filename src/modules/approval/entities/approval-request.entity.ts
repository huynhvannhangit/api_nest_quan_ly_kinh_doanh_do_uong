import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum ApprovalType {
  INVOICE_CANCEL = 'INVOICE_CANCEL',
  INVOICE_MERGE = 'INVOICE_MERGE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  EMPLOYEE_DELETE = 'EMPLOYEE_DELETE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('approval')
export class ApprovalRequest extends BaseEntity {
  @Column({ name: 'request_number', unique: true })
  requestNumber: string;

  @Column({
    type: 'enum',
    enum: ApprovalType,
  })
  type: ApprovalType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requestedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string;
}
