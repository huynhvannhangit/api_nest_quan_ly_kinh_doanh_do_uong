import { Controller, Get, Query } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { QueryLogDto } from './dto/query-log.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';

@Controller('logging')
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get()
  @Permissions(Permission.LOG_VIEW)
  @ActionLog({
    action: 'VIEW_LOGS',
    module: 'LOGGING',
    description: 'Xem danh sách lịch sử thao tác',
  })
  findAll(@Query() query: QueryLogDto) {
    return this.loggingService.findAll(query);
  }
}
