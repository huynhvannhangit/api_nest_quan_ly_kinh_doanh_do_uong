export type NotificationType =
  | 'NEW_ORDER'
  | 'ORDER_STATUS_UPDATED'
  | 'APPROVAL_UPDATED'
  | 'TABLE_STATUS_UPDATED'
  | 'SYSTEM';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId?: number; // Optional user ID for targeted notifications
  createdAt: string; // ISO string
}
