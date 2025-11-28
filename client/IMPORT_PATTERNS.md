# Import Pattern Guidelines

## Problem

The Metro bundler (used by Expo) sometimes has difficulty resolving imports through barrel files (`index.ts`) when there are complex dependency chains. This can result in components being `undefined` at runtime, causing the error:

```
Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.
```

## Solution

Use **direct imports** instead of barrel file imports for components in certain contexts.

## Import Patterns

### ✅ Recommended Patterns

#### 1. Core Framework Imports (Always use alias)
```typescript
// ✅ GOOD - Core is stable and well-structured
import { appConfig, useResponsive, cn, ROUTES } from '@/core';
import { AuthProvider, useAuth } from '@/core/auth/AuthContext';
import { isProtectedRoute } from '@/core/routes';
```

#### 2. UI Component Imports (Use direct paths)
```typescript
// ✅ GOOD - Direct imports avoid bundler issues
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
```

#### 3. Layout Component Imports (Use relative paths from app/)
```typescript
// ✅ GOOD - In app/_layout.tsx
import { MainLayout } from '../components/layout/MainLayout';
import { SplashScreen } from '../components/ui/SplashScreen';
```

#### 4. Auth Component Imports (Use relative paths)
```typescript
// ✅ GOOD - In components/pages/home/WelcomeScreen.tsx
import { AuthModal } from '../../auth/AuthModal';
```

#### 5. Page Component Imports (Use direct paths)
```typescript
// ✅ GOOD
import { DashboardHeader } from '@/components/pages/dashboard/DashboardHeader';
import { StatsCards } from '@/components/pages/dashboard/StatsCards';
```

### ❌ Avoid These Patterns

```typescript
// ❌ BAD - Barrel file imports can cause bundler issues
import { Button, Card, Text } from '@/components';
import { MainLayout } from '@/components';
import { AuthModal } from '@/components';

// ❌ BAD - Too many relative path levels
import { Button } from '../../../components/ui/button';
```

## Why This Happens

1. **Circular Dependencies**: Barrel files can create circular dependency chains
2. **Bundler Resolution**: Metro bundler processes files in a specific order
3. **Hot Reload**: Changes to barrel files don't always trigger proper reloads
4. **Tree Shaking**: Complex barrel files can confuse tree-shaking algorithms

## Quick Fix Checklist

If you encounter the "Element type is invalid" error:

1. ✅ Check the component is properly exported (named export, not default)
2. ✅ Replace barrel file imports with direct imports
3. ✅ Use relative paths for cross-component imports
4. ✅ Restart dev server with `--clear` flag
5. ✅ Check for typos in import paths

## Examples

### Before (Problematic)
```typescript
// app/_layout.tsx
import { MainLayout } from '@/components';
import { SplashScreen } from '@/components';

// components/pages/home/WelcomeScreen.tsx
import { Button, Icon, Text, AuthModal } from '@/components';
```

### After (Fixed)
```typescript
// app/_layout.tsx
import { MainLayout } from '../components/layout/MainLayout';
import { SplashScreen } from '../components/ui/SplashScreen';

// components/pages/home/WelcomeScreen.tsx
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AuthModal } from '../../auth/AuthModal';
```

## Barrel File Strategy

### Keep Barrel Files For:
- ✅ `core/` - Framework utilities and hooks
- ✅ `core/config/` - Configuration exports
- ✅ `core/routes/` - Route definitions
- ✅ `core/utils/` - Utility functions

### Avoid Barrel Files For:
- ❌ `components/` - Main components barrel (too complex)
- ❌ `components/auth/` - Auth components (use direct imports)
- ❌ Cross-directory component imports

### Use Direct Imports For:
- ✅ `components/ui/*` - UI primitives
- ✅ `components/layout/*` - Layout components
- ✅ `components/pages/*` - Page-specific components
- ✅ `components/auth/*` - Auth components

## Troubleshooting

### Error: "Element type is invalid"
1. Find which component is undefined (check error stack trace)
2. Locate the import statement for that component
3. Change to direct import path
4. Restart dev server: `npx expo start --clear`

### Error: "Cannot find module"
1. Check the relative path is correct
2. Verify the file exists at that location
3. Check for typos in filename
4. Ensure file extension is correct (.tsx vs .ts)

## Best Practices

1. **Be Consistent**: Use the same import pattern throughout a file
2. **Document Exceptions**: Add comments explaining why direct imports are used
3. **Test After Changes**: Always test after modifying imports
4. **Clear Cache**: Use `--clear` flag when imports change significantly
5. **Avoid Deep Nesting**: Keep component hierarchy shallow when possible
