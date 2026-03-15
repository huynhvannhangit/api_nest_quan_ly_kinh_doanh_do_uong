import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notification.controller';

/**
 * @module NotificationModule
 * @description
 * Module quản lý thông báo realtime qua WebSocket và Firebase Firestore.
 * Export NotificationService để các module khác (Order, Approval, ...) có thể sử dụng.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
