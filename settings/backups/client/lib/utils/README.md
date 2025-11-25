# Utility Modules

Centralized utility functions for the Quester client application.

## Overview

This directory contains reusable utility modules that provide core functionality across the application. All utilities are designed to:

- Follow consistent patterns
- Include comprehensive TypeScript types
- Provide detailed JSDoc documentation
- Handle edge cases gracefully
- Be thoroughly tested

## Modules

### 📅 date.ts

Date formatting and manipulation utilities using date-fns.

**Key Functions:**
- `formatSmartTime(date)` - Context-aware time formatting (today/yesterday/older)
- `getTimeAgo(date)` - Relative time display ("5 minutes ago")
- `formatForAPI(date)` - ISO 8601 formatting for API requests
- `formatDuration(seconds)` - Human-readable duration
- `formatAccessibleDate(date)` - Screen reader friendly format

**Example:**
```typescript
import { formatSmartTime } from '@/lib/utils/date';

const displayTime = formatSmartTime(postDate);
// Today: "2 minutes ago"
// Yesterday: "Yesterday at 3:45 PM"  
// Older: "Nov 18, 3:45 PM"
```

### ✅ validation.ts

Form and data validation utilities with comprehensive patterns.

**Key Functions:**
- `validateEmail(email)` - RFC 5322 compliant email validation
- `validatePhone(phone)` - International phone number validation
- `validateURL(url)` - URL format validation
- `validateStrongPassword(password)` - Password strength check
- `validateCreditCard(cardNumber)` - Luhn algorithm validation
- `validate(value, rules)` - Multi-rule validation with error messages

**Example:**
```typescript
import { validate, validateEmail, validateRequired } from '@/lib/utils/validation';

const result = validate(email, [
  { rule: validateRequired, message: 'Email is required' },
  { rule: validateEmail, message: 'Invalid email format' },
]);

if (!result.valid) {
  setErrors(result.errors);
}
```

### 📝 logger.ts

Structured logging system with levels and metadata support.

**Key Features:**
- Five log levels: DEBUG, INFO, WARN, ERROR, SILENT
- Environment-aware (verbose in dev, minimal in prod)
- Scoped loggers for components
- Performance and API tracking

**Example:**
```typescript
import logger from '@/lib/utils/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('API failed', error, { endpoint: '/users' });

// Scoped logger
const log = logger.scope('ProfileScreen');
log.debug('Component mounted');
log.perf('fetchProfile', 245);
```

### 🚨 error-handler.ts

RFC 7807 compliant error handling with retry logic.

**Key Features:**
- Standardized API error format
- Automatic error type detection
- Retry with exponential backoff
- User-friendly error messages
- Field-level validation errors

**Example:**
```typescript
import { handleApiResponse, ApiError } from '@/lib/utils/error-handler';

try {
  const data = await handleApiResponse<User>(response);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isAuthError()) {
      redirectToLogin();
    } else if (error.isValidationError()) {
      showErrors(error.getFieldErrors());
    }
  }
}
```

### 🔍 Other Utilities

- **accessibility-helpers.ts** - WCAG compliance utilities
- **analytics.ts** - Event tracking and session management
- **file-validation.ts** - File upload validation
- **performance-helpers.ts** - Performance monitoring utilities
- **workflow-helpers.ts** - Feature workflow management

## Testing

All utilities include comprehensive test coverage:

```bash
# Run utility tests
npm test -- --testPathPatterns="utils"

# Run specific utility tests
npm test -- lib/utils/validation.test.ts
npm test -- lib/utils/date.test.ts
```

## Best Practices

### Import Patterns

```typescript
// ✅ Named imports (recommended)
import { formatSmartTime, getTimeAgo } from '@/lib/utils/date';
import { validateEmail } from '@/lib/utils/validation';

// ✅ Default import for logger
import logger from '@/lib/utils/logger';

// ❌ Avoid wildcard imports
import * as dateUtils from '@/lib/utils/date';
```

### Error Handling

Always handle potential errors from utilities:

```typescript
// ✅ Handle validation errors
const isValid = validateEmail(email);
if (!isValid) {
  setError('Invalid email format');
}

// ✅ Handle date parsing errors
const date = parseDate(userInput);
if (!isValidDate(date)) {
  setError('Invalid date');
}
```

### Type Safety

Leverage TypeScript types for better IDE support:

```typescript
import type { ValidationResult, LogMetadata } from '@/lib/utils/validation';
import type { RFC7807Error } from '@/lib/utils/error-handler';
```

## Contributing

When adding new utilities:

1. **Add comprehensive JSDoc** with examples
2. **Include TypeScript types** for all parameters and returns
3. **Write unit tests** with >80% coverage
4. **Handle edge cases** (null, undefined, invalid input)
5. **Update this README** with usage examples

## Migration Guide

### Replacing Inline Logic

Before (duplicate logic):
```typescript
// In multiple components
const isToday = date.toDateString() === now.toDateString();
if (isToday) {
  return format(date, 'h:mm a');
}
```

After (centralized utility):
```typescript
import { formatSmartTime } from '@/lib/utils/date';

return formatSmartTime(date);
```

### Using Validation

Before (inline regex):
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError('Invalid email');
}
```

After (validation utility):
```typescript
import { validateEmail } from '@/lib/utils/validation';

if (!validateEmail(email)) {
  setError('Invalid email');
}
```

## Performance Considerations

- **Date utilities**: Use `formatSmartTime` for cached formatting
- **Validation**: Regex patterns are pre-compiled for performance
- **Logger**: Automatically disabled in production (WARN+ only)
- **Error handler**: Retry logic includes exponential backoff

## Dependencies

- **date-fns** - Date manipulation and formatting
- **@react-native-async-storage/async-storage** - Persistent storage
- **React Native** - Platform-specific APIs

## License

Part of the Quester platform. See root LICENSE file.
