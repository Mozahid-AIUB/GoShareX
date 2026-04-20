/**
 * services/notifications/index.ts
 * Unified export for FCM senders and notification lifecycle handlers.
 */

export {
  sendRideRequest,
  sendRideConfirmed,
  sendRideCancelled,
  sendDestinationReached,
} from '@/services/notifications/fcmService';

export {
  setupNotificationHandlers,
  handleForegroundNotification,
  handleBackgroundNotification,
} from '@/services/notifications/notificationHandler';
