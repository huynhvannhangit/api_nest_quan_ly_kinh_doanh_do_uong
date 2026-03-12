export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  APPROVAL_UPDATED = 'APPROVAL_UPDATED',
  TABLE_STATUS_UPDATED = 'TABLE_STATUS_UPDATED',
  SYSTEM = 'SYSTEM',
}

export interface NotificationPayload {
  id?: number; // Database ID
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId?: number; // Optional user ID for targeted notifications
  createdAt: string; // ISO string
}
