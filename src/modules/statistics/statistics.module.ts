import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/invoice-item.entity';
import { Area } from '../area/entities/area.entity';
import { Table } from '../table/entities/table.entity';
import { Category } from '../category/entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { ApprovalRequest } from '../approval/entities/approval-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Area,
      Table,
      Category,
      Product,
      Employee,
      Order,
      User,
      ApprovalRequest,
    ]),
  ],
  providers: [StatisticsService],
  controllers: [StatisticsController],
  exports: [StatisticsService],
})
export class StatisticsModule {}
