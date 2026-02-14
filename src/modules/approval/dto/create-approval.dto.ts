import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApprovalType } from '../entities/approval-request.entity';

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  @IsNotEmpty()
  type: ApprovalType;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
