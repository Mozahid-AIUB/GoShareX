/**
 * validation.ts — Comprehensive input validation
 * 
 * Prevents injection attacks, validates formats, sanitizes inputs
 */

export interface ValidationRule {
    type: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => boolean | string; // return error message if invalid
}

/**
 * Email validation (RFC 5322 simplified)
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim()) && email.length <= 254;
}

/**
 * AIUB email validation
 */
export function isValidAIUBEmail(email: string): boolean {
    if (!isValidEmail(email)) return false;
    return email.endsWith('@aiub.edu.bd') || email.endsWith('@student.aiub.edu');
}

/**
 * Strong password validation
 */
export function isStrongPassword(password: string): {
    valid: boolean;
    score: number; // 0-100
    feedback: string[];
} {
    const feedback: string[] = [];
    let score = 0;

    if (!password || password.length < 8) {
        feedback.push('Minimum 8 characters required');
        return { valid: false, score: 0, feedback };
    }
    score += 20;

    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    if (/[A-Z]/.test(password)) score += 15;
    else feedback.push('Add uppercase letters');

    if (/[a-z]/.test(password)) score += 15;
    else feedback.push('Add lowercase letters');

    if (/\d/.test(password)) score += 15;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    else feedback.push('Add special characters');

    const valid = score >= 60;
    return { valid, score: Math.min(100, score), feedback };
}

/**
 * Phone number validation (Bangladesh)
 */
export function isValidPhoneNumber(phone: string): boolean {
    // BD format: +880123456789 or 01XXXXXXXXX
    const regex = /^(?:\+880|0)[1-9]\d{8}$/;
    return regex.test(phone.replace(/\s/g, ''));
}

/**
 * Student ID validation (AIUB format: XX-XXXXX-X)
 */
export function isValidStudentId(id: string): boolean {
    const regex = /^\d{2}-\d{5}-\d{1}$/;
    return regex.test(id);
}

/**
 * Sanitize text input (prevent injection, remove malicious chars)
 */
export function sanitizeText(text: string, maxLength = 500): string {
    if (!text || typeof text !== 'string') return '';

    return text
        .trim()
        .slice(0, maxLength)
        .replace(/[<>\"'`]/g, '') // Remove potential HTML/JS chars
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Only allow http/https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol');
        }
        return parsed.toString();
    } catch {
        return '';
    }
}

/**
 * Validate destination name
 */
export function isValidDestination(destination: string): boolean {
    if (!destination || typeof destination !== 'string') return false;
    if (destination.length < 2 || destination.length > 50) return false;
    // Only alphanumeric, spaces, hyphens, commas
    const regex = /^[a-zA-Z0-9\s\-,()]{2,50}$/;
    return regex.test(destination.trim());
}

/**
 * Validate fare amount
 */
export function isValidFare(fare: unknown): boolean {
    const num = Number(fare);
    return Number.isInteger(num) && num > 0 && num < 10000;
}

/**
 * Validate rating (1-5 stars)
 */
export function isValidRating(rating: unknown): boolean {
    const num = Number(rating);
    return Number.isInteger(num) && num >= 1 && num <= 5;
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: unknown, lng: unknown): boolean {
    const latitude = Number(lat);
    const longitude = Number(lng);
    return (
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

/**
 * Validate name
 */
export function isValidName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2 || name.length > 50) return false;
    // Only alphanumeric, spaces, hyphens
    const regex = /^[a-zA-Z\s\-]{2,50}$/;
    return regex.test(name.trim());
}

/**
 * Generic validator
 */
export function validate(value: unknown, rules: ValidationRule): { valid: boolean; error?: string } {
    // Required check
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return { valid: false, error: 'This field is required' };
    }

    if (!value && !rules.required) return { valid: true };

    const str = String(value);

    // Min length
    if (rules.minLength && str.length < rules.minLength) {
        return {
            valid: false,
            error: `Minimum ${rules.minLength} characters required`,
        };
    }

    // Max length
    if (rules.maxLength && str.length > rules.maxLength) {
        return {
            valid: false,
            error: `Maximum ${rules.maxLength} characters allowed`,
        };
    }

    // Pattern
    if (rules.pattern && !rules.pattern.test(str)) {
        return { valid: false, error: 'Invalid format' };
    }

    // Custom validation
    if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
            return { valid: false, error: typeof result === 'string' ? result : 'Invalid value' };
        }
    }

    return { valid: true };
}

/**
 * Validate batch of fields
 */
export function validateBatch(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
): {
    valid: boolean;
    errors: Record<string, string>;
} {
    const errors: Record<string, string> = {};

    for (const [field, rule] of Object.entries(rules)) {
        const result = validate(data[field], rule);
        if (!result.valid) {
            errors[field] = result.error || 'Invalid value';
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Export validation presets
 */
export const ValidationPresets = {
    email: { type: 'email', required: true, custom: isValidEmail } as ValidationRule,
    password: { type: 'password', required: true, minLength: 8 } as ValidationRule,
    name: { type: 'text', required: true, minLength: 2, maxLength: 50 } as ValidationRule,
    destination: { type: 'text', required: true, custom: isValidDestination } as ValidationRule,
    fare: { type: 'number', required: true, custom: isValidFare } as ValidationRule,
    rating: { type: 'number', required: true, custom: isValidRating } as ValidationRule,
};
