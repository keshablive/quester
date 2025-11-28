/**
 * Form Validation Utilities
 * 
 * Provides common validation functions for forms and user input
 * with consistent error messages and patterns.
 * 
 * @example
 * ```tsx
 * import { validateEmail, validatePassword } from '@/core';
 * 
 * if (!validateEmail(email)) {
 *   setError('Invalid email address');
 * }
 * 
 * const { valid, errors } = validatePassword(password);
 * if (!valid) {
 *   setErrors(errors);
 * }
 * ```
 */

/**
 * Password validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns True if email is valid
 * 
 * @example
 * ```tsx
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid.email'); // false
 * validateEmail('user@domain'); // false
 * ```
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Validate password strength with detailed feedback
 * 
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Optionally one special character
 * 
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Validation result with errors
 * 
 * @example
 * ```tsx
 * const result = validatePassword('Test123!');
 * if (!result.valid) {
 *   console.log(result.errors); // Array of error messages
 * }
 * ```
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < minLength) {
    errors.push(`Must be at least ${minLength} characters`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }

  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate phone number format
 * 
 * Accepts various formats:
 * - (123) 456-7890
 * - 123-456-7890
 * - 1234567890
 * - +1 123 456 7890
 * 
 * @param phone - Phone number to validate
 * @returns True if phone number is valid
 * 
 * @example
 * ```tsx
 * validatePhone('(123) 456-7890'); // true
 * validatePhone('1234567890'); // true
 * validatePhone('123'); // false
 * ```
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const regex = /^\+?[\d\s\-()]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  
  return regex.test(phone) && digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validate URL format
 * 
 * @param url - URL to validate
 * @returns True if URL is valid
 * 
 * @example
 * ```tsx
 * validateURL('https://example.com'); // true
 * validateURL('http://localhost:3000'); // true
 * validateURL('not a url'); // false
 * ```
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate username (alphanumeric with underscores/hyphens)
 * 
 * @param username - Username to validate
 * @param options - Validation options
 * @returns True if username is valid
 * 
 * @example
 * ```tsx
 * validateUsername('user_123'); // true
 * validateUsername('user-name'); // true
 * validateUsername('us'); // false (too short)
 * validateUsername('user@name'); // false (invalid characters)
 * ```
 */
export function validateUsername(
  username: string,
  options: { minLength?: number; maxLength?: number } = {}
): boolean {
  const { minLength = 3, maxLength = 20 } = options;
  
  if (!username || typeof username !== 'string') return false;
  
  const regex = /^[a-zA-Z0-9_-]+$/;
  return (
    regex.test(username) &&
    username.length >= minLength &&
    username.length <= maxLength
  );
}

/**
 * Validate that a string is not empty or only whitespace
 * 
 * @param value - String to validate
 * @param fieldName - Field name for error message
 * @returns Validation result
 * 
 * @example
 * ```tsx
 * validateRequired('Hello'); // { valid: true, errors: [] }
 * validateRequired('   '); // { valid: false, errors: ['Field is required'] }
 * validateRequired('', 'Name'); // { valid: false, errors: ['Name is required'] }
 * ```
 */
export function validateRequired(value: string, fieldName: string = 'Field'): ValidationResult {
  const valid = Boolean(value && value.trim().length > 0);
  return {
    valid,
    errors: valid ? [] : [`${fieldName} is required`],
  };
}

/**
 * Validate string length
 * 
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @param fieldName - Field name for error message
 * @returns Validation result
 * 
 * @example
 * ```tsx
 * validateLength('Hello', 3, 10); // { valid: true, errors: [] }
 * validateLength('Hi', 3, 10); // { valid: false, errors: [...] }
 * ```
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Field'
): ValidationResult {
  const errors: string[] = [];
  
  if (!value || typeof value !== 'string') {
    errors.push(`${fieldName} is required`);
  } else {
    if (value.length < min) {
      errors.push(`${fieldName} must be at least ${min} characters`);
    }
    if (value.length > max) {
      errors.push(`${fieldName} must be no more than ${max} characters`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate number is within range
 * 
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Field name for error message
 * @returns Validation result
 * 
 * @example
 * ```tsx
 * validateNumberRange(5, 1, 10); // { valid: true, errors: [] }
 * validateNumberRange(15, 1, 10); // { valid: false, errors: [...] }
 * ```
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): ValidationResult {
  const errors: string[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a number`);
  } else {
    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }
    if (value > max) {
      errors.push(`${fieldName} must be no more than ${max}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate that two fields match (e.g., password confirmation)
 * 
 * @param value1 - First value
 * @param value2 - Second value
 * @param fieldName - Field name for error message
 * @returns Validation result
 * 
 * @example
 * ```tsx
 * validateMatch('password123', 'password123'); // { valid: true, errors: [] }
 * validateMatch('password123', 'different'); // { valid: false, errors: [...] }
 * ```
 */
export function validateMatch(
  value1: string,
  value2: string,
  fieldName: string = 'Fields'
): ValidationResult {
  const valid = value1 === value2;
  return {
    valid,
    errors: valid ? [] : [`${fieldName} do not match`],
  };
}
