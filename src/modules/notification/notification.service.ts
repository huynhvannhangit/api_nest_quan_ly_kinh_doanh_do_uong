import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NotificationGateway } from './notification.gateway';
import { NotificationPayload, NotificationType } from './dto/notification.dto';

/**
 * @service NotificationService
 * @description
 * Service trung gian để gửi thông báo:
 * 1. Emit sự kiện WebSocket realtime đến tất cả client đang kết nối (qua Gateway)
 * 2. Lưu lịch sử thông báo vào Firebase Firestore để client đọc lại
 */
@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private db: admin.firestore.Firestore | null = null;
  private isFirebaseEnabled = false;

  constructor(private readonly gateway: NotificationGateway) {}

  onModuleInit() {
    this.initFirebase();
  }

  /**
   * Khởi tạo Firebase Admin SDK.
   * Nếu không có biến môi trường Firebase, vẫn hoạt động bình thường với WebSocket.
   */
  private initFirebase(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not set. Notifications will only use WebSocket (no Firestore persistence).',
      );
      return;
    }

    try {
      // Tránh khởi tạo nhiều lần khi hot-reload
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }

      this.db = admin.firestore();
      this.isFirebaseEnabled = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Gửi thông báo: WebSocket (realtime) + Firestore (lưu lịch sử).
   * @param type Loại thông báo
   * @param title Tiêu đề thông báo
   * @param message Nội dung thông báo
   * @param data Dữ liệu bổ sung (tùy chọn)
   */
  async sendNotification(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      type,
      title,
      message,
      data,
      createdAt: new Date().toISOString(),
    };

    // 1. Emit WebSocket → tất cả client đang kết nối nhận ngay lập tức
    this.gateway.emitNotification(payload);

    // 2. Lưu vào Firestore (nếu Firebase đã cấu hình)
    if (this.isFirebaseEnabled && this.db) {
      try {
        await this.db.collection('notifications').add(payload);
        this.logger.log(`Notification saved to Firestore: [${type}] ${title}`);
      } catch (error) {
        this.logger.error('Failed to save notification to Firestore', error);
      }
    }
  }
}
