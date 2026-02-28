import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

/**
 * @module NotificationModule
 * @description
 * Module quản lý thông báo realtime qua WebSocket và Firebase Firestore.
 * Export NotificationService để các module khác (Order, Approval, ...) có thể sử dụng.
 */
@Module({
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
