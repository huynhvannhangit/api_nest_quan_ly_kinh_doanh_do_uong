import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @Permissions(Permission.APPROVAL_CREATE)
  @ActionLog({
    action: 'CREATE_APPROVAL',
    module: 'APPROVAL',
    description: 'Tạo yêu cầu phê duyệt mới',
  })
  create(@Body() data: CreateApprovalDto, @GetCurrentUserId() userId: number) {
    return this.approvalsService.create(data, userId);
  }

  @Get()
  @Permissions(Permission.APPROVAL_VIEW)
  findAll() {
    return this.approvalsService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.APPROVAL_VIEW)
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(+id);
  }

  @Patch(':id/review')
  @Permissions(Permission.APPROVAL_MANAGE)
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

  @Delete(':id')
  @Permissions(Permission.APPROVAL_DELETE)
  @ActionLog({
    action: 'DELETE_APPROVAL',
    module: 'APPROVAL',
    description: 'Xóa yêu cầu phê duyệt',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.approvalsService.remove(+id, userId);
  }
}
