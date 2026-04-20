import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Format timestamp to relative time
 */
export const formatRelativeTime = (timestamp: number): string => {
  return dayjs(timestamp).fromNow();
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp: number, format: string = 'DD MMM YYYY'): string => {
  return dayjs(timestamp).format(format);
};

/**
 * Format fare amount
 */
export const formatFare = (amount: number): string => {
  return `৳${amount}`;
};

/**
 * Format split fare
 */
export const formatSplitFare = (total: number, riders: number): string => {
  const split = Math.ceil(total / riders);
  return `৳${total} ÷ ${riders} = ৳${split}`;
};

/**
 * Format rating
 */
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

/**
 * Format completion rate
 */
export const formatCompletionRate = (rate: number): string => {
  return `${Math.round(rate)}%`;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Format: 01XXX-XXXXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Mask student ID for privacy
 */
export const maskStudentId = (studentId: string): string => {
  // Format: XX-XXXXX-X -> XX-***XX-X
  if (studentId.length >= 11) {
    return `${studentId.slice(0, 3)}***${studentId.slice(-3)}`;
  }
  return studentId;
};

/**
 * Format duration in minutes
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} মিনিট`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ঘণ্টা ${mins} মিনিট` : `${hours} ঘণ্টা`;
};
