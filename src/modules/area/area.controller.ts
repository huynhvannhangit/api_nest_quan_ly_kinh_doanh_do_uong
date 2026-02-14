import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AreaService } from './area.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('area')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @Permissions(Permission.AREA_CREATE)
  @ActionLog({
    action: 'CREATE_AREA',
    module: 'AREA',
    description: 'Thêm mới khu vực',
  })
  create(@Body() data: CreateAreaDto, @GetCurrentUserId() userId: number) {
    return this.areaService.create(data, userId);
  }

  @Get()
  @Permissions(Permission.AREA_VIEW)
  findAll() {
    return this.areaService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.AREA_VIEW)
  findOne(@Param('id') id: string) {
    return this.areaService.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.AREA_UPDATE)
  @ActionLog({
    action: 'UPDATE_AREA',
    module: 'AREA',
    description: 'Cập nhật thông tin khu vực',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateAreaDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.areaService.update(+id, data, userId);
  }

  @Delete(':id')
  @Permissions(Permission.AREA_DELETE)
  @ActionLog({
    action: 'DELETE_AREA',
    module: 'AREA',
    description: 'Xóa khu vực',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.areaService.remove(+id, userId);
  }
}
