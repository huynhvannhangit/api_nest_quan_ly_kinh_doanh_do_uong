import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationPayload } from './dto/notification.dto';

/**
 * @gateway NotificationGateway
 * @description
 * Gateway WebSocket xử lý kết nối realtime với các client.
 * Cho phép server chủ động push thông báo đến tất cả client đang kết nối.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  afterInit() {
    this.logger.log('NotificationGateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      const userIdStr = Array.isArray(userId) ? userId[0] : userId;
      void client.join(`user_${userIdStr}`);
      this.logger.log(`Client ${client.id} joined room user_${userIdStr}`);
    }
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Phát sự kiện thông báo đến tất cả clients hoặc một user cụ thể.
   * @param payload Dữ liệu thông báo
   */
  emitNotification(payload: NotificationPayload): void {
    if (payload.userId) {
      // Gửi riêng cho user đó
      this.server.to(`user_${payload.userId}`).emit('notification', payload);
      this.logger.log(
        `Emitted targeted notification to user ${payload.userId}: [${payload.type}] ${payload.title}`,
      );
    } else {
      // Gửi cho tất cả mọi người
      this.server.emit('notification', payload);
      this.logger.log(
        `Emitted broadcast notification: [${payload.type}] ${payload.title}`,
      );
    }
  }
}
