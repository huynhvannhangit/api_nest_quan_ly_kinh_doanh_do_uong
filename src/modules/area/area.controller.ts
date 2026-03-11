import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
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
  @HttpCode(201)
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
  @HttpCode(200)
  @Permissions(Permission.AREA_VIEW_ALL)
  findAll(@Query('keyword') keyword?: string) {
    return this.areaService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.AREA_VIEW_ID)
  findOne(@Param('id') id: string) {
    return this.areaService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.AREA_UPDATE)
  @ActionLog({
    action: 'UPDATE_AREA',
    module: 'AREA',
    description: 'Cập nhật thông tin khu vực',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateAreaDto & { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    const { reason, ...areaData } = data;
    return this.areaService.update(+id, areaData, userId, reason);
  }

  @Delete('bulk')
  @HttpCode(200)
  @Permissions(Permission.AREA_DELETE)
  @ActionLog({
    action: 'DELETE_AREA_BULK',
    module: 'AREA',
    description: 'Xóa hàng loạt khu vực',
  })
  removeMany(
    @Body() body: { ids: number[]; reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.areaService.removeMany(body.ids, userId, body?.reason);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.AREA_DELETE)
  @ActionLog({
    action: 'DELETE_AREA',
    module: 'AREA',
    description: 'Xóa khu vực',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.areaService.remove(+id, userId, body?.reason);
  }
}
