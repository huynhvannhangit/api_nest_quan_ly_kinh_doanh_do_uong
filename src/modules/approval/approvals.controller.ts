import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // Removed create endpoint as approvals are created by other modules

  @Get()
  @HttpCode(200)
  @Permissions(Permission.APPROVAL_VIEW)
  findAll(@Query('keyword') keyword?: string) {
    return this.approvalsService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.APPROVAL_VIEW)
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(+id);
  }

  @Patch(':id/review')
  @HttpCode(200)
  @Permissions(
    Permission.APPROVAL_APPROVE,
    Permission.APPROVAL_REJECT,
    Permission.PRODUCT_APPROVE,
    Permission.EMPLOYEE_APPROVE,
    Permission.TABLE_APPROVE,
    Permission.AREA_APPROVE,
    Permission.CATEGORY_APPROVE,
    Permission.USER_APPROVE,
    Permission.ROLE_APPROVE,
    Permission.INVOICE_APPROVE,
  )
  @ActionLog({
    action: 'REVIEW_APPROVAL',
    module: 'APPROVAL',
    description: 'Phê duyệt hoặc từ chối yêu cầu',
  })
  review(
    @Param('id') id: string,
    @Body() data: ReviewApprovalDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.approvalsService.review(+id, userId, data);
  }
}
