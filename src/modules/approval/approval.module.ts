import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequest } from './entities/approval-request.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApprovalRequest]), NotificationModule],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalModule {}
