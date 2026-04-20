export type NotificationType =
  | 'ride_request'
  | 'ride_confirmed'
  | 'ride_started'
  | 'ride_complete'
  | 'partner_no_response'
  | 'post_interest'
  | 'account_warning';

export interface PushPayload {
  type: NotificationType;
  senderId: string;
  senderName: string;
  rideId?: string;
  chatId?: string;
  destination?: string;
  splitAmount?: number;
  distance?: number;
}
