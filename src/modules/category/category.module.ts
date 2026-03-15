import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { UserModule } from '../user/user.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product]),
    UserModule,
    ApprovalModule,
    NotificationModule,
  ],
  providers: [
    CategoryService,
    { provide: 'CategoryService', useExisting: CategoryService },
  ],
  controllers: [CategoryController],
  exports: [CategoryService],
})
export class CategoryModule {}
