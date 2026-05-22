/**
 * RideShare AIUB — Error Handler
 * Converts raw errors (Firebase codes, network errors, generic) into
 * user-friendly messages in Bangla / English.
 */

/** Maps Firebase Auth error codes to user-readable messages */
const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'ইমেইল ঠিকানাটি সঠিক নয়।',
  'auth/user-disabled': 'এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।',
  'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
  'auth/wrong-password': 'পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।',
  'auth/email-already-in-use': 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট তৈরি হয়েছে।',
  'auth/weak-password': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
  'auth/too-many-requests':
    'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
  'auth/network-request-failed':
    'নেটওয়ার্ক সংযোগ নেই। ইন্টারনেট চেক করুন।',
  'auth/invalid-credential': 'Login তথ্য সঠিক নয়।',
  'auth/operation-not-allowed': 'এই login পদ্ধতি সক্রিয় নেই।',
  'auth/account-exists-with-different-credential':
    'এই ইমেইলে অন্য পদ্ধতিতে অ্যাকাউন্ট আছে।',
  'auth/popup-closed-by-user': 'Login বাতিল করা হয়েছে।',
  'auth/cancelled-popup-request': 'Login বাতিল করা হয়েছে।',
  'auth/requires-recent-login': 'নিরাপত্তার জন্য আবার login করুন।',
};

/** Maps Firestore / general Firebase error codes */
const FIREBASE_FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied': 'এই তথ্য দেখার অনুমতি নেই।',
  unavailable: 'সার্ভার সাময়িকভাবে অনুপলব্ধ। পরে চেষ্টা করুন।',
  'not-found': 'অনুরোধ করা তথ্য পাওয়া যায়নি।',
  'already-exists': 'এই তথ্য আগে থেকেই আছে।',
  'resource-exhausted': 'অনেক বেশি অনুরোধ। পরে চেষ্টা করুন।',
  cancelled: 'অনুরোধ বাতিল হয়েছে।',
  'deadline-exceeded': 'সার্ভার থেকে সময়মতো সাড়া পাওয়া যায়নি।',
  internal: 'সার্ভারে সমস্যা হয়েছে। পরে চেষ্টা করুন।',
};

/**
 * Convert a Firebase error code to a user-friendly Bangla/English message.
 */
export function parseFirebaseError(code: string): string {
  return (
    FIREBASE_AUTH_MESSAGES[code] ??
    FIREBASE_FIRESTORE_MESSAGES[code] ??
    `কিছু একটা সমস্যা হয়েছে। (${code})`
  );
}

/**
 * Universal error handler — accepts any thrown value.
 * Returns a displayable string.
 */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    // Firebase SDK errors carry a `code` property
    const firebaseCode = (error as Error & { code?: string }).code;
    if (firebaseCode) {
      return parseFirebaseError(firebaseCode);
    }
    return error.message || 'অজানা সমস্যা হয়েছে।';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'অজানা সমস্যা হয়েছে।';
}

/**
 * Safely extract `.code` from an unknown error (Firebase, fetch, etc).
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Safely extract `.message` from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
}

/**
 * Returns true if the error looks like a network/connectivity failure.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (
      code === 'auth/network-request-failed' ||
      code === 'unavailable' ||
      code === 'deadline-exceeded'
    ) {
      return true;
    }
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('internet') ||
      msg.includes('timeout') ||
      msg.includes('failed to fetch')
    );
  }
  return false;
}
