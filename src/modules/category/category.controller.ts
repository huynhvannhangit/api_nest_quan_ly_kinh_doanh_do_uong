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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('category')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.CATEGORY_CREATE)
  @ActionLog({
    action: 'CREATE_CATEGORY',
    module: 'CATEGORY',
    description: 'Tạo danh mục sản phẩm mới',
  })
  create(@Body() data: CreateCategoryDto, @GetCurrentUserId() userId: number) {
    return this.categoryService.create(data, userId);
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.CATEGORY_SEARCH)
  findAll(@Query('keyword') keyword?: string) {
    return this.categoryService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.CATEGORY_VIEW)
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.CATEGORY_UPDATE)
  @ActionLog({
    action: 'UPDATE_CATEGORY',
    module: 'CATEGORY',
    description: 'Cập nhật danh mục sản phẩm',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateCategoryDto & { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    const { reason, ...categoryData } = data;
    return this.categoryService.update(+id, categoryData, userId, reason);
  }

  @Delete('bulk')
  @HttpCode(200)
  @Permissions(Permission.CATEGORY_DELETE)
  @ActionLog({
    action: 'DELETE_CATEGORY_BULK',
    module: 'CATEGORY',
    description: 'Xóa hàng loạt danh mục sản phẩm',
  })
  removeMany(
    @Body() body: { ids: number[]; reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.categoryService.removeMany(body.ids, userId, body?.reason);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.CATEGORY_DELETE)
  @ActionLog({
    action: 'DELETE_CATEGORY',
    module: 'CATEGORY',
    description: 'Xóa danh mục sản phẩm',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.categoryService.remove(+id, userId, body?.reason);
  }
}
