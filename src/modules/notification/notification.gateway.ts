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
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Phát sự kiện thông báo đến tất cả clients đang kết nối.
   * @param payload Dữ liệu thông báo
   */
  emitNotification(payload: NotificationPayload): void {
    this.server.emit('notification', payload);
    this.logger.log(`Emitted notification: [${payload.type}] ${payload.title}`);
  }
}
