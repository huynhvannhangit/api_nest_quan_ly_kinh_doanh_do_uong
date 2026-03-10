import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as admin from 'firebase-admin';
import { NotificationGateway } from './notification.gateway';
import { NotificationPayload, NotificationType } from './dto/notification.dto';
import { Notification } from './entities/notification.entity';

/**
 * @service NotificationService
 * @description
 * Service trung gian để gửi thông báo:
 * 1. Emit sự kiện WebSocket realtime đến tất cả client đang kết nối (qua Gateway)
 * 2. Lưu lịch sử thông báo vào SQL (TypeORM) để client đọc lại
 * 3. Lưu lịch sử thông báo vào Firebase Firestore (tùy chọn)
 */
@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private db: admin.firestore.Firestore | null = null;
  private isFirebaseEnabled = false;

  constructor(
    private readonly gateway: NotificationGateway,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not set. Firestore persistence skipped.',
      );
      return;
    }

    try {
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
      this.db.settings({ ignoreUndefinedProperties: true });
      this.isFirebaseEnabled = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  sendNotification(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    userId?: number,
  ): void {
    const payload: NotificationPayload = {
      type,
      title,
      message,
      data,
      userId,
      createdAt: new Date().toISOString(),
    };

    // 1. Emit WebSocket (High Priority - Realtime)
    this.gateway.emitNotification(payload);

    // 2. Save to SQL Database (Background)
    void this.notificationRepository
      .save({
        type,
        title,
        message,
        data,
        userId,
      })
      .then(() => {
        this.logger.log(`Notification saved to SQL: [${type}] ${title}`);
      })
      .catch((error) => {
        this.logger.error('Failed to save notification to SQL', error);
      });

    // 3. Save to Firestore (Background)
    if (this.isFirebaseEnabled && this.db) {
      void this.db
        .collection('notifications')
        .add(payload)
        .then(() => {
          this.logger.log(
            `Notification saved to Firestore: [${type}] ${title}`,
          );
        })
        .catch((error) => {
          this.logger.error('Failed to save notification to Firestore', error);
        });
    }
  }

  async findAll(userId: number, page = 1, limit = 20) {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: [{ userId }, { userId: IsNull() }], // User specific + Broadcast
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    await this.notificationRepository.update({ id, userId }, { isRead: true });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update({ userId }, { isRead: true });
  }

  async findOne(id: number, userId: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id, userId } });
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.notificationRepository.delete({ id, userId });
  }
}
