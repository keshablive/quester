/**
 * Validation Utilities Module
 * 
 * Centralized validation functions for forms, inputs, and data validation.
 * Provides consistent validation across the application with comprehensive patterns.
 * 
 * @module lib/utils/validation
 * 
 * Key Features:
 * - Email, phone, URL, username validation
 * - Password strength validation
 * - File size and type validation
 * - Credit card validation (Luhn algorithm)
 * - UUID validation
 * - Multi-rule validation with detailed error messages
 * 
 * @example
 * ```typescript
 * import { validateEmail, validateStrongPassword, validate } from '@/lib/utils/validation';
 * 
 * // Simple validation
 * if (!validateEmail(userInput)) {
 *   alert('Invalid email');
 * }
 * 
 * // Multi-rule validation
 * const result = validate(password, [
 *   { rule: validateRequired, message: 'Password required' },
 *   { rule: validateStrongPassword, message: 'Password too weak' },
 * ]);
 * 
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 * ```
 */

/**
 * Email validation regex
 * RFC 5322 compliant pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number regex (international format)
 * Accepts: +1234567890, (123) 456-7890, 123-456-7890, etc.
 */
const PHONE_REGEX = /^\+?[\d\s\-()]+$/;

/**
 * URL validation regex
 * Matches http://, https://, and www. URLs
 */
const URL_REGEX = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Username regex
 * 3-30 characters, alphanumeric, underscore, hyphen
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

/**
 * Strong password regex
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validate email address
 * 
 * @param email - Email to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid-email'); // false
 * ```
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number
 * Accepts various formats including international
 * 
 * @param phone - Phone number to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validatePhone('+1234567890'); // true
 * validatePhone('(123) 456-7890'); // true
 * validatePhone('abc'); // false
 * ```
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const cleaned = phone.trim();
  return cleaned.length >= 10 && PHONE_REGEX.test(cleaned);
}

/**
 * Validate URL
 * 
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateURL('https://example.com'); // true
 * validateURL('www.example.com'); // true
 * validateURL('not-a-url'); // false
 * ```
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return URL_REGEX.test(url.trim());
}

/**
 * Validate username
 * 3-30 characters, alphanumeric, underscore, hyphen
 * 
 * @param username - Username to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateUsername('john_doe'); // true
 * validateUsername('ab'); // false (too short)
 * validateUsername('invalid@user'); // false (invalid characters)
 * ```
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return USERNAME_REGEX.test(username.trim());
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
 * 
 * @param password - Password to validate
 * @returns True if strong, false otherwise
 * 
 * @example
 * ```typescript
 * validateStrongPassword('P@ssw0rd'); // true
 * validateStrongPassword('weak'); // false
 * ```
 */
export function validateStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return STRONG_PASSWORD_REGEX.test(password);
}

/**
 * Validate required field (not empty, not just whitespace)
 * 
 * @param value - Value to validate
 * @returns True if has content, false otherwise
 * 
 * @example
 * ```typescript
 * validateRequired('hello'); // true
 * validateRequired('   '); // false
 * validateRequired(''); // false
 * ```
 */
export function validateRequired(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate minimum length
 * 
 * @param value - Value to validate
 * @param minLength - Minimum length required
 * @returns True if meets minimum, false otherwise
 * 
 * @example
 * ```typescript
 * validateMinLength('hello', 3); // true
 * validateMinLength('hi', 5); // false
 * ```
 */
export function validateMinLength(value: string, minLength: number): boolean {
  return typeof value === 'string' && value.length >= minLength;
}

/**
 * Validate maximum length
 * 
 * @param value - Value to validate
 * @param maxLength - Maximum length allowed
 * @returns True if within maximum, false otherwise
 * 
 * @example
 * ```typescript
 * validateMaxLength('hello', 10); // true
 * validateMaxLength('hello world', 5); // false
 * ```
 */
export function validateMaxLength(value: string, maxLength: number): boolean {
  return typeof value === 'string' && value.length <= maxLength;
}

/**
 * Validate number range
 * 
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if within range, false otherwise
 * 
 * @example
 * ```typescript
 * validateNumberRange(5, 1, 10); // true
 * validateNumberRange(15, 1, 10); // false
 * ```
 */
export function validateNumberRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate UUID format
 * 
 * @param value - String to validate as UUID
 * @returns True if valid UUID, false otherwise
 * 
 * @example
 * ```typescript
 * validateUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * validateUUID('invalid'); // false
 * ```
 */
export function validateUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}

/**
 * Validate file size
 * 
 * @param sizeInBytes - File size in bytes
 * @param maxSizeInMB - Maximum size in megabytes
 * @returns True if within limit, false otherwise
 * 
 * @example
 * ```typescript
 * validateFileSize(1024 * 1024 * 2, 5); // true (2MB < 5MB)
 * validateFileSize(1024 * 1024 * 10, 5); // false (10MB > 5MB)
 * ```
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Validate file type by extension
 * 
 * @param filename - File name to check
 * @param allowedExtensions - Array of allowed extensions (e.g., ['jpg', 'png'])
 * @returns True if allowed, false otherwise
 * 
 * @example
 * ```typescript
 * validateFileType('photo.jpg', ['jpg', 'png']); // true
 * validateFileType('document.pdf', ['jpg', 'png']); // false
 * ```
 */
export function validateFileType(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * Validate credit card number (Luhn algorithm)
 * 
 * @param cardNumber - Card number to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateCreditCard('4532015112830366'); // true (valid Visa test card)
 * validateCreditCard('1234567890'); // false
 * ```
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validation error result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate multiple rules and return detailed result
 * 
 * @param value - Value to validate
 * @param rules - Array of validation rules
 * @returns Validation result with errors
 * 
 * @example
 * ```typescript
 * const result = validate('test', [
 *   { rule: (v) => validateMinLength(v, 5), message: 'Too short' },
 *   { rule: (v) => validateEmail(v), message: 'Invalid email' },
 * ]);
 * 
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 * }
 * ```
 */
export function validate(
  value: any,
  rules: Array<{ rule: (v: any) => boolean; message: string }>
): ValidationResult {
  const errors: string[] = [];

  for (const { rule, message } of rules) {
    if (!rule(value)) {
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Centralized validation utilities object
 */
const validators = {
  validateEmail,
  validatePhone,
  validateURL,
  validateUsername,
  validateStrongPassword,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumberRange,
  validateUUID,
  validateFileSize,
  validateFileType,
  validateCreditCard,
  validate,
};

export default validators;
