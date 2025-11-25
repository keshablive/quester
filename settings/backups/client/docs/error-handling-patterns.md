# Error Handling Patterns Guide

**Feature 003: UI/UX Optimization - Phase 8, T141**  
**Last Updated**: November 14, 2025

---

## Overview

This guide documents error handling patterns and best practices for the Quester mobile app. Phase 8 implements comprehensive error handling including error boundaries, offline queue management, validation, session handling, and recovery strategies.

---

## Table of Contents

1. [Error Categories](#error-categories)
2. [Component-Level Errors](#component-level-errors)
3. [Network Errors](#network-errors)
4. [Validation Errors](#validation-errors)
5. [Session Expiration](#session-expiration)
6. [Offline Mode](#offline-mode)
7. [Optimistic UI Updates](#optimistic-ui-updates)
8. [Error Recovery Strategies](#error-recovery-strategies)
9. [Testing Error Handling](#testing-error-handling)
10. [Common Pitfalls](#common-pitfalls)

---

## Error Categories

### 1. Component Errors (Rendering)
- **Cause**: React component crashes during render
- **Handler**: ErrorBoundary component
- **Recovery**: Retry, report, navigate away

### 2. Network Errors
- **Cause**: API failures, timeouts, connectivity issues
- **Handler**: useErrorHandling hook, offline queue
- **Recovery**: Retry with exponential backoff, queue for later

### 3. Validation Errors
- **Cause**: Invalid user input
- **Handler**: ValidationError component, form validation
- **Recovery**: User corrects input

### 4. Session Errors
- **Cause**: Expired auth token (401 responses)
- **Handler**: API client interceptor, session modal
- **Recovery**: Re-authentication with draft preservation

### 5. System Errors
- **Cause**: Unexpected runtime errors
- **Handler**: ErrorBoundary, error logger
- **Recovery**: Graceful degradation, restart

---

## Component-Level Errors

### ErrorBoundary Component

**Purpose**: Catch React rendering errors and prevent full app crashes.

**Features**:
- Automatic error catching with `componentDidCatch`
- Retry button (up to 3 attempts in 5 seconds)
- Report button (logs to monitoring)
- Go Home button (navigation reset)
- Fail-safe mode (after 3 errors)
- Accessibility support

**Usage**:

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

// Wrap entire screens
export default function MyScreen() {
  return (
    <ErrorBoundary 
      componentName="MyScreen" 
      screenName="/my-screen"
      onError={(error, info) => {
        // Custom error handling
        console.error('Screen error:', error);
      }}
    >
      <ScreenContent />
    </ErrorBoundary>
  );
}

// Or use ScreenWrapper (includes ErrorBoundary)
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function MyScreen() {
  return (
    <ScreenWrapper screenName="MyScreen">
      <ScreenContent />
    </ScreenWrapper>
  );
}
```

**Custom Fallback UI**:

```tsx
<ErrorBoundary
  componentName="ProfileCard"
  fallback={(error, reset) => (
    <View className="p-4 border border-destructive rounded-lg">
      <Text>Failed to load profile</Text>
      <Button onPress={reset}>
        <Text>Retry</Text>
      </Button>
    </View>
  )}
>
  <ProfileCard />
</ErrorBoundary>
```

**Recursion Protection**:

ErrorBoundary automatically enters fail-safe mode after 3 errors in 5 seconds:
- Stops retry functionality
- Shows critical error UI
- Suggests app restart
- Prevents infinite error loops

---

## Network Errors

### useErrorHandling Hook

**Purpose**: Manage network errors with retry logic and user feedback.

**Features**:
- Automatic retry with exponential backoff
- Error categorization
- User-friendly messages
- Recovery strategy suggestions
- Error history tracking

**Basic Usage**:

```tsx
import { useErrorHandling } from '@/lib/hooks/use-error-handling';

function MyComponent() {
  const { handleError, retryOperation, clearError } = useErrorHandling({
    maxRetries: 3,
    retryDelay: 1000,
  });

  const fetchData = async () => {
    try {
      const data = await api.getData();
      return data;
    } catch (error) {
      handleError(error, {
        context: 'Fetching data',
        severity: 'error',
      });
    }
  };

  const handleRetry = () => {
    retryOperation(fetchData);
  };

  return (
    <View>
      <Button onPress={fetchData}>Load Data</Button>
      <Button onPress={handleRetry}>Retry</Button>
    </View>
  );
}
```

**With Error Display**:

```tsx
import { ErrorModal } from '@/components/error-modal';

function MyComponent() {
  const { error, clearError, retryOperation } = useErrorHandling();

  return (
    <>
      {/* Your content */}
      
      <ErrorModal
        visible={!!error}
        title="Network Error"
        message={error?.message || 'Something went wrong'}
        onClose={clearError}
        primaryAction={{
          label: 'Retry',
          onPress: () => retryOperation(fetchData),
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: clearError,
        }}
      />
    </>
  );
}
```

**User-Friendly Error Messages**:

The hook automatically transforms common errors:

| Original Error | User-Friendly Message |
|---------------|----------------------|
| `Network request failed` | "Connection error. Please check your internet." |
| `timeout of 5000ms exceeded` | "Request timed out. Please try again." |
| `401 Unauthorized` | "Session expired. Please log in again." |
| `404 Not Found` | "Resource not found." |
| `500 Internal Server Error` | "Server error. Please try again later." |

---

## Validation Errors

### ValidationError Component

**Purpose**: Display inline validation errors for form fields.

**Features**:
- Associates with input via `nativeID`
- Accessibility (aria-describedby)
- Error icon + message
- Only renders when error exists
- Polite live region for screen readers

**Usage**:

```tsx
import { ValidationError } from '@/components/validation-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Invalid email format');
    } else {
      setEmailError(null);
    }
  };

  return (
    <View className="gap-2">
      <Label nativeID="email-label">Email</Label>
      <Input
        nativeID="email-input"
        aria-labelledby="email-label"
        aria-describedby={emailError ? 'email-input-error' : undefined}
        aria-invalid={!!emailError}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) validateEmail(text); // Clear error on change
        }}
        onBlur={() => validateEmail(email)} // Validate on blur
      />
      <ValidationError error={emailError} fieldId="email-input" />
    </View>
  );
}
```

**Field-Level Validation Pattern**:

```tsx
interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function SignUpForm() {
  const [form, setForm] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = (field: keyof FormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Invalid email format';
        } else {
          delete newErrors.email;
        }
        break;

      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
        }
        break;

      case 'confirmPassword':
        if (value !== form.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    // Validate all fields
    const isValid = Object.keys(form).every((field) =>
      validateField(field as keyof FormData, form[field as keyof FormData])
    );

    if (isValid) {
      // Submit form
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Label nativeID="email-label">Email</Label>
        <Input
          nativeID="email-input"
          aria-labelledby="email-label"
          aria-describedby={errors.email ? 'email-input-error' : undefined}
          aria-invalid={!!errors.email}
          value={form.email}
          onChangeText={(text) => {
            setForm({ ...form, email: text });
            if (errors.email) validateField('email', text);
          }}
          onBlur={() => validateField('email', form.email)}
        />
        <ValidationError error={errors.email} fieldId="email-input" />
      </View>

      {/* Repeat for other fields */}

      <Button onPress={handleSubmit}>
        <Text>Sign Up</Text>
      </Button>
    </View>
  );
}
```

---

## Session Expiration

### Automatic Detection & Handling

**Flow**:
1. API client intercepts 401 responses
2. Calls `logoutGracefully()` with reason
3. Shows "Session Expired" modal
4. Preserves draft state (if applicable)
5. Redirects to sign-in
6. Restores draft after re-auth

**Implementation** (already in `lib/api/client.ts`):

```typescript
// API interceptor catches 401
if (error.response?.status === 401) {
  await logoutGracefully('Session expired. Please log in again.');
  
  router.push({
    pathname: '/sign-in',
    params: {
      error: 'session_expired',
      title: 'Session Expired',
      detail: 'Your session has expired. Please log in again.',
    },
  });
}
```

**Draft Preservation Pattern**:

```tsx
import { useErrorHandling } from '@/lib/hooks/use-error-handling';

function PostEditor() {
  const { saveDraft, getDraft } = useErrorHandling();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (title || content) {
        saveDraft('new-post', { title, content });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [title, content]);

  // Restore draft on mount
  useEffect(() => {
    const draft = getDraft('new-post');
    if (draft) {
      setTitle(draft.title || '');
      setContent(draft.content || '');
    }
  }, []);

  const handleSubmit = async () => {
    try {
      await api.createPost({ title, content });
      // Clear draft on success
      saveDraft('new-post', null);
    } catch (error) {
      if (error.response?.status === 401) {
        // Draft already saved, will be restored after re-auth
        Alert.alert(
          'Session Expired',
          'Your draft has been saved. Please log in to continue.',
        );
      }
    }
  };

  return (
    <View>
      <Input value={title} onChangeText={setTitle} placeholder="Title" />
      <Input value={content} onChangeText={setContent} placeholder="Content" />
      <Button onPress={handleSubmit}>
        <Text>Publish</Text>
      </Button>
    </View>
  );
}
```

---

## Offline Mode

### Offline Queue Pattern

**Purpose**: Queue actions when offline, sync when online.

**Components**:
- `useOfflineQueue` hook
- `OfflineBanner` component
- `offlineSyncService`

**Usage**:

```tsx
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import { OfflineBanner } from '@/components/offline-banner';
import { useNetwork } from '@/lib/hooks/useNetwork';

function SocialActions() {
  const { isOffline } = useNetwork();
  const { enqueue, queueLength, syncStatus, syncQueue } = useOfflineQueue();

  const handleLike = async (postId: string) => {
    if (isOffline) {
      // Queue for later
      await enqueue({
        type: 'LIKE_POST',
        data: { postId },
      });
      
      showToast('Action saved. Will sync when online.');
    } else {
      // Execute immediately
      await api.likePost(postId);
    }
  };

  return (
    <View>
      <OfflineBanner
        isOffline={isOffline}
        pendingActionsCount={queueLength}
        onSync={syncQueue}
        isSyncing={syncStatus === 'syncing'}
      />
      
      {/* Your content */}
    </View>
  );
}
```

**Queue Structure**:

```typescript
interface QueuedAction {
  type: 'LIKE_POST' | 'COMMENT' | 'FOLLOW' | 'UNFOLLOW' | /* ... */;
  data: Record<string, any>;
  timestamp: number;
  retryCount?: number;
}
```

**Sync Behavior**:
- Automatic sync on network reconnect
- Manual sync via OfflineBanner button
- Maintains action order (FIFO)
- Retries failed actions (max 3 attempts)
- Shows sync status indicator

---

## Optimistic UI Updates

### useOptimisticUpdate Hook

**Purpose**: Instant UI feedback while API call completes in background.

**Features**:
- Immediate value update
- Automatic rollback on error
- Pending state tracking
- Success/error callbacks

**Basic Pattern**:

```tsx
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-update';

function LikeButton({ postId, initialLiked }: { postId: string; initialLiked: boolean }) {
  const {
    value: isLiked,
    update: toggleLike,
    isPending,
  } = useOptimisticUpdate({
    initialValue: initialLiked,
    onError: (error) => {
      showToast('Failed to like post', 'error');
    },
  });

  const handleLike = async () => {
    await toggleLike(
      !isLiked, // Optimistic value (shows immediately)
      async () => {
        // Actual API call
        const result = await api.likePost(postId);
        return result.isLiked; // Server's actual value
      }
    );
  };

  return (
    <Button 
      onPress={handleLike} 
      disabled={isPending}
      variant={isLiked ? 'default' : 'outline'}
    >
      <Icon name={isLiked ? 'heart' : 'heart-outline'} />
      <Text>{isPending ? 'Updating...' : isLiked ? 'Liked' : 'Like'}</Text>
    </Button>
  );
}
```

**Complex Example with Counter**:

```tsx
function LikeButtonWithCount({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const {
    value: likesCount,
    update: updateLikes,
    isPending,
    isOptimistic,
  } = useOptimisticUpdate({
    initialValue: initialLikes,
    onSuccess: (actual, optimistic) => {
      if (actual !== optimistic) {
        // Server returned different count (concurrent likes)
        showToast(`Post has ${actual} likes`, 'info');
      }
    },
  });

  const handleLike = async () => {
    await updateLikes(
      (prev) => prev + 1, // Increment optimistically
      async () => {
        const result = await api.likePost(postId);
        return result.totalLikes; // Server's actual count
      }
    );
  };

  return (
    <Button onPress={handleLike} disabled={isPending}>
      <Icon name="heart" />
      <Text>
        {likesCount} {isOptimistic && '(pending)'}
      </Text>
    </Button>
  );
}
```

**With Offline Queue Integration**:

```tsx
function SocialButton({ postId, initialLiked }: { postId: string; initialLiked: boolean }) {
  const { isOffline } = useNetwork();
  const { enqueue } = useOfflineQueue();
  const {
    value: isLiked,
    update: toggleLike,
  } = useOptimisticUpdate({
    initialValue: initialLiked,
  });

  const handleLike = async () => {
    if (isOffline) {
      // Queue action, update UI optimistically
      await enqueue({ type: 'LIKE_POST', data: { postId } });
      toggleLike(!isLiked, async () => !isLiked); // Keep optimistic value
    } else {
      // Normal optimistic update with API call
      await toggleLike(!isLiked, async () => {
        const result = await api.likePost(postId);
        return result.isLiked;
      });
    }
  };

  return (
    <Button onPress={handleLike}>
      <Icon name={isLiked ? 'heart' : 'heart-outline'} />
    </Button>
  );
}
```

---

## Error Recovery Strategies

### Strategy Selection

Choose recovery strategy based on error type:

| Error Type | Primary Strategy | Fallback |
|-----------|------------------|----------|
| **Network timeout** | Retry with backoff | Queue for later |
| **401 Unauthorized** | Re-authenticate | Navigate to login |
| **404 Not Found** | Show not found UI | Navigate back |
| **500 Server Error** | Retry (limited) | Show error, contact support |
| **Validation Error** | Show inline error | Let user correct |
| **Component Error** | Retry render | Show fallback UI |
| **Offline** | Queue action | Show offline indicator |

### Retry with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Usage
try {
  const data = await retryWithBackoff(() => api.getData(), 3, 1000);
} catch (error) {
  handleError(error);
}
```

### Graceful Degradation

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, error } = useQuery(['user', userId], () => api.getUser(userId));

  // Show skeleton while loading
  if (!user && !error) {
    return <UserProfileSkeleton />;
  }

  // Graceful degradation on error
  if (error) {
    return (
      <View className="p-4 border border-muted rounded-lg">
        <Text variant="muted">Failed to load user profile</Text>
        <Button variant="ghost" onPress={() => queryClient.invalidateQueries(['user', userId])}>
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  return <UserProfileContent user={user} />;
}
```

---

## Testing Error Handling

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react-native';
import { useErrorHandling } from '@/lib/hooks/use-error-handling';

describe('useErrorHandling', () => {
  it('should handle network errors with retry', async () => {
    const { result } = renderHook(() => useErrorHandling());

    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: 'success' });

    // First call fails
    try {
      await mockFn();
    } catch (error) {
      result.current.handleError(error);
    }

    expect(result.current.error).toBeTruthy();

    // Retry succeeds
    const retryResult = await result.current.retryOperation(mockFn);
    expect(retryResult).toEqual({ data: 'success' });
    expect(result.current.error).toBeNull();
  });
});
```

### Component Tests

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { ScreenWrapper } from '@/components/screen-wrapper';

describe('ErrorBoundary', () => {
  it('should catch errors and show retry button', () => {
    const ErrorComponent = () => {
      throw new Error('Test error');
    };

    const { getByText } = render(
      <ScreenWrapper screenName="Test">
        <ErrorComponent />
      </ScreenWrapper>
    );

    expect(getByText(/something went wrong/i)).toBeTruthy();
    expect(getByText(/try again/i)).toBeTruthy();
  });
});
```

### Integration Tests

```typescript
describe('Offline Queue Integration', () => {
  it('should queue actions when offline and sync when online', async () => {
    mockNetworkOffline();

    const { result } = renderHook(() => useOfflineQueue());

    // Queue action while offline
    await result.current.enqueue({ type: 'LIKE_POST', data: { postId: '123' } });
    expect(result.current.queueLength).toBe(1);

    // Go online
    mockNetworkOnline();
    await result.current.syncQueue();

    expect(result.current.queueLength).toBe(0);
    expect(result.current.syncStatus).toBe('synced');
  });
});
```

---

## Common Pitfalls

### 1. Not Handling Circular References

**❌ Wrong**:
```typescript
// This will crash with circular refs in props
JSON.stringify(error);
```

**✅ Correct**:
```typescript
import { errorLogger } from '@/lib/services/error-logger';

// Uses sanitizeProps with circular ref protection
errorLogger.logError(error, errorInfo, componentName, props);
```

### 2. Missing Error Boundaries

**❌ Wrong**:
```tsx
// No error boundary - one error crashes entire app
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**✅ Correct**:
```tsx
// Wrap each screen with error boundary
function HomeScreen() {
  return (
    <ScreenWrapper screenName="Home">
      <HomeContent />
    </ScreenWrapper>
  );
}
```

### 3. Forgetting to Clear Errors

**❌ Wrong**:
```tsx
// Error persists even after successful retry
const { error, retryOperation } = useErrorHandling();

const handleRetry = () => {
  retryOperation(fetchData); // Error still showing!
};
```

**✅ Correct**:
```tsx
const { error, clearError, retryOperation } = useErrorHandling();

const handleRetry = async () => {
  clearError(); // Clear before retry
  await retryOperation(fetchData);
};
```

### 4. Not Preserving Drafts

**❌ Wrong**:
```tsx
// User loses all content on session expiration
const handleSubmit = async () => {
  await api.createPost({ title, content });
};
```

**✅ Correct**:
```tsx
const { saveDraft } = useErrorHandling();

// Auto-save draft
useEffect(() => {
  if (title || content) {
    saveDraft('new-post', { title, content });
  }
}, [title, content]);
```

### 5. Ignoring Offline State

**❌ Wrong**:
```tsx
// Fails silently when offline
const handleLike = async () => {
  await api.likePost(postId);
};
```

**✅ Correct**:
```tsx
const { isOffline } = useNetwork();
const { enqueue } = useOfflineQueue();

const handleLike = async () => {
  if (isOffline) {
    await enqueue({ type: 'LIKE_POST', data: { postId } });
    showToast('Action queued for sync');
  } else {
    await api.likePost(postId);
  }
};
```

### 6. Not Testing Error Paths

**❌ Wrong**:
```typescript
// Only tests happy path
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

**✅ Correct**:
```typescript
// Tests both success and error paths
it('should fetch data or handle errors', async () => {
  // Success case
  const data = await fetchData();
  expect(data).toBeDefined();
});

it('should handle network errors', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

---

## Best Practices Summary

1. **Always use ErrorBoundary** for screen-level components
2. **Handle offline state** - queue actions, show indicators
3. **Use optimistic updates** for instant feedback on social actions
4. **Preserve drafts** before logout/expiration
5. **Show user-friendly error messages** - avoid technical jargon
6. **Implement retry logic** with exponential backoff
7. **Test error paths** as thoroughly as happy paths
8. **Log errors** with sanitized props (no sensitive data)
9. **Provide recovery options** - retry, navigate, report
10. **Use accessibility** - announce errors to screen readers

---

## Related Documentation

- [Accessibility Guide](./accessibility-quick-reference.md)
- [Performance Guide](./PERFORMANCE-GUIDE.md)
- [Testing Guide](../client/__tests__/README.md)
- [API Client](../client/lib/api/client.ts)
- [Error Logger](../client/lib/services/error-logger.ts)

---

## Questions or Issues?

If you encounter issues with error handling:

1. Check [error-handling.e2e.ts](../client/__tests__/e2e/error-handling.e2e.ts) for integration test examples
2. Review [useErrorHandling tests](../client/__tests__/hooks/use-error-handling.test.ts) for hook usage
3. See [ErrorBoundary tests](../client/__tests__/components/common/error-boundary.test.tsx) for component examples
4. Consult this guide for patterns and best practices

**Phase 8 Status**: 10/14 tasks complete (71%)  
**Last Updated**: November 14, 2025
