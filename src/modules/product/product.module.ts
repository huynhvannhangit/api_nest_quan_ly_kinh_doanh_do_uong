import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entities/product.entity';
import { ProductHistory } from './entities/product-history.entity';
import { ProductHistoryService } from './product-history.service';
import { ApprovalModule } from '../approval/approval.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductHistory]),
    ApprovalModule,
    UserModule,
  ],
  providers: [ProductService, ProductHistoryService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
