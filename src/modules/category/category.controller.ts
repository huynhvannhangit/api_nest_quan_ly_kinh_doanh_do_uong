import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ActionLog({
    action: 'CREATE_CATEGORY',
    module: 'CATEGORY',
    description: 'Tạo danh mục sản phẩm mới',
  })
  create(@Body() data: CreateCategoryDto, @GetCurrentUserId() userId: number) {
    return this.categoryService.create(data, userId);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string) {
    return this.categoryService.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Patch(':id')
  @ActionLog({
    action: 'UPDATE_CATEGORY',
    module: 'CATEGORY',
    description: 'Cập nhật danh mục sản phẩm',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateCategoryDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.categoryService.update(+id, data, userId);
  }

  @Delete(':id')
  @ActionLog({
    action: 'DELETE_CATEGORY',
    module: 'CATEGORY',
    description: 'Xóa danh mục sản phẩm',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.categoryService.remove(+id, userId);
  }
}
