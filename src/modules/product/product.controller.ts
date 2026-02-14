import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ActionLog({
    action: 'CREATE_PRODUCT',
    module: 'PRODUCT',
    description: 'Tạo sản phẩm mới',
  })
  create(
    @Body() productData: CreateProductDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.productService.create(productData, userId);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  @ActionLog({
    action: 'UPDATE_PRODUCT',
    module: 'PRODUCT',
    description: 'Cập nhật thông tin sản phẩm',
  })
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateProductDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.productService.update(+id, updateData, userId);
  }

  @Delete(':id')
  @ActionLog({
    action: 'DELETE_PRODUCT',
    module: 'PRODUCT',
    description: 'Xóa sản phẩm',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.productService.remove(+id, userId);
  }
}
