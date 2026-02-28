import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { TableModule } from '../table/table.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    TableModule,
    NotificationModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
