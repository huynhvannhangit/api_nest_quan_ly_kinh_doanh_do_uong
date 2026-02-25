import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('table')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Post()
  @Permissions(Permission.TABLE_CREATE)
  @ActionLog({
    action: 'CREATE_TABLE',
    module: 'TABLE',
    description: 'Thêm mới bàn',
  })
  create(@Body() data: CreateTableDto, @GetCurrentUserId() userId: number) {
    return this.tableService.create(data, userId);
  }

  @Get()
  @Permissions(Permission.TABLE_VIEW)
  findAll() {
    return this.tableService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.TABLE_VIEW)
  findOne(@Param('id') id: string) {
    return this.tableService.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.TABLE_UPDATE)
  @ActionLog({
    action: 'UPDATE_TABLE',
    module: 'TABLE',
    description: 'Cập nhật thông tin bàn',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateTableDto & { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    const { reason, ...tableData } = data;
    return this.tableService.update(+id, tableData, userId, reason);
  }

  @Delete(':id')
  @Permissions(Permission.TABLE_DELETE)
  @ActionLog({
    action: 'DELETE_TABLE',
    module: 'TABLE',
    description: 'Xóa bàn',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.tableService.remove(+id, userId, body?.reason);
  }
}
