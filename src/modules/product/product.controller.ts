import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('upload')
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE)
  @ActionLog({
    action: 'UPLOAD_IMAGE',
    module: 'PRODUCT',
    description: 'Tải lên hình ảnh sản phẩm',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',

        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const ext = extname(file.originalname);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const filename = file?.filename as string;
    return {
      url: `/public/uploads/${filename}`,
    };
  }

  @Post()
  @HttpCode(201)
  @Permissions(Permission.PRODUCT_CREATE)
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
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_VIEW)
  findAll(@Query('keyword') keyword?: string) {
    return this.productService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_VIEW)
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ActionLog({
    action: 'UPDATE_PRODUCT',
    module: 'PRODUCT',
    description: 'Cập nhật thông tin sản phẩm',
  })
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateProductDto & { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    const { reason, ...data } = updateData;
    return this.productService.update(+id, data, userId, reason);
  }

  @Delete('bulk')
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_DELETE)
  @ActionLog({
    action: 'DELETE_PRODUCT_BULK',
    module: 'PRODUCT',
    description: 'Xóa hàng loạt sản phẩm',
  })
  removeMany(
    @Body() body: { ids: number[]; reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.productService.removeMany(body.ids, userId, body?.reason);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.PRODUCT_DELETE)
  @ActionLog({
    action: 'DELETE_PRODUCT',
    module: 'PRODUCT',
    description: 'Xóa sản phẩm',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.productService.remove(+id, userId, body?.reason);
  }
}
