/**
 * Validation utilities for the app
 */

/**
 * Validate AIUB email address
 */
export const isValidAIUBEmail = (email: string): boolean => {
  const aiubEmailRegex = /^[a-zA-Z0-9._%+-]+@(?:student\.)?aiub\.edu$/i;
  return aiubEmailRegex.test(email.toLowerCase());
};

export const isAIUBEmail = isValidAIUBEmail;

/**
 * Validate student ID format
 */
export const isValidStudentId = (studentId: string): boolean => {
  // Format: XX-XXXXX-X (e.g., 12-34567-1)
  const studentIdRegex = /^\d{2}-\d{5}-\d{1}$/;
  return studentIdRegex.test(studentId);
};

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
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
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
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate name
 */
export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s.]+$/.test(name);
};
