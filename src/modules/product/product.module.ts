import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entities/product.entity';
import { ProductHistory } from './entities/product-history.entity';
import { ProductHistoryService } from './product-history.service';
import { OrderItem } from '../order/entities/order-item.entity';
import { ApprovalModule } from '../approval/approval.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductHistory, OrderItem]),
    ApprovalModule,
    UserModule,
  ],
  providers: [ProductService, ProductHistoryService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
