/**
 * Validation utilities for the app
 */

/** General email validation — accepts any valid email */
export const isValidEmail = (email: string): boolean => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim().toLowerCase());
};

/** Gmail validation — strict check for @gmail.com domain */
export const isValidGmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(normalizedEmail);
};

/** @deprecated Use isValidEmail instead */
export const isValidAIUBEmail = isValidEmail;
export const isAIUBEmail = isValidEmail;

/** @deprecated Student ID no longer required */
export const isValidStudentId = (_studentId: string): boolean => true;

/**
 * Validate phone number (Bangladesh format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  // Bangladesh mobile: 01XXXXXXXXX (11 digits)
  const phoneRegex = /^01[3-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

/**
 * Premium input sanitization
 * Removes control characters, zero-width characters, and potential injection vectors
 */
export const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input
    .trim()
    // Remove control characters (0x00-0x1F, 0x7F)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    // Remove HTML/XML characters (safe against XSS)
    .replace(/[<>]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Max length enforcement
    .substring(0, maxLength);
};

/**
 * Sanitize destination/location names
 * Stricter rules for address-like data
 */
export const sanitizeDestination = (dest: string): string => {
  return dest
    .trim()
    // Allow letters, numbers, spaces, hyphens, commas, parentheses
    .replace(/[^a-zA-Z0-9\s\-,()]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Max 100 chars
    .substring(0, 100);
};

/**
 * Validate message text (chat messages)
 * Ensure it's not empty, not too long, and safe
 */
export const isValidMessage = (text: string): { valid: boolean; message?: string } => {
  const sanitized = sanitizeInput(text, 1000);

  if (!sanitized || sanitized.length === 0) {
    return { valid: false, message: 'Message cannot be empty' };
  }
  if (sanitized.length < 1) {
    return { valid: false, message: 'Message is too short' };
  }
  if (sanitized.length > 1000) {
    return { valid: false, message: 'Message is too long (max 1000 characters)' };
  }

  return { valid: true };
};

/**
 * Validate name
 */
export const isValidName = (name: string): boolean => {
  const sanitized = sanitizeInput(name, 100).trim();
  return sanitized.length >= 2 && /^[a-zA-Z\s.'-]+$/.test(sanitized);
};

/**
 * Validate destination name
 */
export const isValidDestinationName = (dest: string): { valid: boolean; message?: string } => {
  const sanitized = sanitizeDestination(dest);

  if (!sanitized || sanitized.length < 2) {
    return { valid: false, message: 'Destination name is too short' };
  }
  if (sanitized.length > 100) {
    return { valid: false, message: 'Destination name is too long' };
  }

  return { valid: true };
};

/**
 * Validate comment/review text
 */
export const isValidComment = (comment: string, minLength: number = 0, maxLength: number = 500): { valid: boolean; message?: string } => {
  const sanitized = sanitizeInput(comment, maxLength);

  if (sanitized.length < minLength) {
    return { valid: false, message: `Comment must be at least ${minLength} characters` };
  }
  if (sanitized.length > maxLength) {
    return { valid: false, message: `Comment must not exceed ${maxLength} characters` };
  }

  return { valid: true };
};
