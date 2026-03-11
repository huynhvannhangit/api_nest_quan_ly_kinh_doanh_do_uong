import { Controller, Get, Query, HttpCode, UseGuards } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { QueryLogDto } from './dto/query-log.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Controller('logging')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get()
  @HttpCode(200)
  @Permissions(Permission.LOGGING_VIEW_ALL)
  @ActionLog({
    action: 'VIEW_LOGS',
    module: 'LOGGING',
    description: 'Xem danh sách lịch sử thao tác',
  })
  findAll(@Query() query: QueryLogDto) {
    return this.loggingService.findAll(query);
  }
}
