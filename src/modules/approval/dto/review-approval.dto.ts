import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../entities/approval-request.entity';

export class ReviewApprovalDto {
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  status: ApprovalStatus;

  @IsString()
  @IsOptional()
  reviewNote?: string;
}
