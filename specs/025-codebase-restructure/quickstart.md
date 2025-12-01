# Quickstart Guide: Codebase Structure Refactoring

**Feature**: 025-codebase-restructure  
**Date**: 2025-12-01  
**For**: Developers working on or after this refactor

## Overview

This guide helps developers understand the new codebase structure and migrate their code accordingly.

---

## Quick Reference: Import Path Changes

### Server (Go)

| Old Import | New Import |
|------------|------------|
| `internal/middleware` | `internal/framework/middleware` |
| `internal/websocket` | `internal/framework/websocket` |
| `internal/config` | `internal/framework/config` |

**Full module path**: `github.com/keshablive/quester/internal/...`

### Client (TypeScript)

| Old Import | New Import |
|------------|------------|
| `@/core/api/services/*` | `@/core/services/*` |
| `@/core/hooks/use*Query` | `@/core/hooks/queries/use*Query` |
| `@/core/hooks/use*Mutation` | `@/core/hooks/mutations/use*Mutation` |
| `@/core/hooks/useDebounce` | `@/core/hooks/utils/useDebounce` |
| `@/components/pages/*` | `@/components/features/*` |

**Preferred**: Use barrel imports for cleaner code:

```typescript
// Instead of:
import { authService } from '@/core/services/auth.service';
import { useDebounce } from '@/core/hooks/utils/useDebounce';

// Use:
import { authService } from '@/core/services';
import { useDebounce } from '@/core/hooks/utils';

// Or from main barrel:
import { authService, useDebounce } from '@/core';
```

---

## New Directory Structure

### Server

```
server/internal/
├── framework/              # ✅ FRAMEWORK LAYER (no app imports allowed)
│   ├── interfaces/
│   │   ├── repositories/   # Repository contracts
│   │   └── services/       # Service contracts (~15 interfaces)
│   ├── middleware/         # 🔄 Consolidated from internal/middleware/
│   ├── websocket/          # 🔄 Consolidated from internal/websocket/
│   ├── config/             # 🔄 Consolidated from internal/config/
│   └── [other framework packages]
├── controllers/            # HTTP handlers
├── services/               # Business logic (implements framework interfaces)
├── repositories/           # Data access
└── models/                 # GORM models
```

### Client

```
client/
├── core/
│   ├── api/                # API client only
│   ├── services/           # 🔄 Moved from api/services/
│   ├── hooks/
│   │   ├── queries/        # 🆕 TanStack Query hooks
│   │   ├── mutations/      # 🆕 TanStack Mutation hooks
│   │   └── utils/          # 🆕 Utility hooks
│   └── [unchanged dirs]
├── components/
│   ├── features/           # 🔄 Renamed from pages/
│   ├── shared/             # Reusable components (≥2 feature usage)
│   ├── ui/                 # shadcn primitives (unchanged)
│   └── layout/             # Layout components (unchanged)
└── app/                    # Expo Router (unchanged)
```

---

## When to Use Each Location

### Client: Where Does My Component Go?

| Scenario | Location | Example |
|----------|----------|---------|
| shadcn/UI primitive | `components/ui/` | Button, Card, Input |
| Used by ≥2 features | `components/shared/` | LoadingSpinner, EmptyState |
| Used by 1 feature only | `components/features/{feature}/` | QuestCard, BadgeDisplay |
| Layout wrapper | `components/layout/` | Sidebar, Header |
| Auth-specific | `components/auth/` | LoginForm, SignupForm |

### Client: Where Does My Hook Go?

| Hook Type | Location | Example |
|-----------|----------|---------|
| TanStack useQuery | `core/hooks/queries/` | `useCoursesQuery` |
| TanStack useMutation | `core/hooks/mutations/` | `useEnrollMutation` |
| Utility hook | `core/hooks/utils/` | `useDebounce`, `useLocalStorage` |

### Server: Framework vs App Layer

| Code Type | Location | Example |
|-----------|----------|---------|
| Reusable infrastructure | `internal/framework/` | JWT utils, Redis client |
| Service interfaces | `internal/framework/interfaces/services/` | `AuthServiceInterface` |
| Business logic | `internal/services/` | `AuthService` implementation |
| HTTP handlers | `internal/controllers/` | `AuthController` |
| Data access | `internal/repositories/` | `UserRepository` |

---

## IDE Setup

### VS Code

After pulling changes, clear caches:

1. **TypeScript**: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
2. **ESLint**: `Cmd/Ctrl + Shift + P` → "ESLint: Restart ESLint Server"
3. **Go**: `Cmd/Ctrl + Shift + P` → "Go: Restart Language Server"

### GoLand / WebStorm

1. **Invalidate Caches**: `File → Invalidate Caches → Invalidate and Restart`

---

## Verification Commands

### Server

```bash
cd server

# Verify framework independence
go build ./internal/framework/...

# Verify full build
go build ./...

# Run all tests
go test ./...
```

### Client

```bash
cd client

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests (if available)
npm test
```

---

## Common Migration Tasks

### Moving a Service (Client)

**Before** (`core/api/services/courses.service.ts`):

```typescript
// Old location
export const coursesService = {
  getCourses: () => apiClient.get('/courses'),
};
```

**After** (`core/services/courses.service.ts`):

```typescript
// New location - same code, different path
export const coursesService = {
  getCourses: () => apiClient.get('/courses'),
};
```

**Update imports** in all files:

```typescript
// Old
import { coursesService } from '@/core/api/services/courses.service';

// New
import { coursesService } from '@/core/services';
```

### Moving a Query Hook (Client)

**Before** (`core/hooks/useCoursesQuery.ts`):

```typescript
export function useCoursesQuery() {
  return useQuery({ queryKey: ['courses'], queryFn: coursesService.getCourses });
}
```

**After** (`core/hooks/queries/useCoursesQuery.ts`):

```typescript
// Same code, new location
export function useCoursesQuery() {
  return useQuery({ queryKey: ['courses'], queryFn: coursesService.getCourses });
}
```

### Creating a Service Interface (Server)

```go
// internal/framework/interfaces/services/course_service.go
package services

import (
    "context"
    "github.com/google/uuid"
)

type CourseServiceInterface interface {
    GetCourse(ctx context.Context, tenantID, courseID uuid.UUID) (*Course, error)
    GetCourses(ctx context.Context, tenantID uuid.UUID, filters *CourseFilters) ([]*Course, error)
    EnrollUser(ctx context.Context, tenantID, userID, courseID uuid.UUID) error
}
```

---

## Rollback Procedure

If issues arise:

1. **Identify the problematic commit** using `git log`
2. **Revert specific commit**: `git revert <commit-hash>`
3. **Or reset to checkpoint**: `git reset --hard <checkpoint-commit>`

Each directory consolidation is a separate atomic commit for easy rollback.

---

## FAQ

**Q: Why were pages/ renamed to features/?**  
A: "Pages" implies routing, but these are feature-specific components. "Features" better describes domain-grouped components.

**Q: Can I import from the old paths?**  
A: No, old paths are deleted. All imports must use new paths.

**Q: How do I know if a component should be shared?**  
A: If it's used by ≥2 features, it belongs in `shared/`. Otherwise, keep it in the feature folder.

**Q: Why separate hooks by type instead of domain?**  
A: Aligns with TanStack Query patterns. Makes it easy to find all queries or mutations.

---

## Support

If you encounter issues after the refactor:

1. Clear IDE caches (see IDE Setup above)
2. Run verification commands
3. Check import paths against this guide
4. Consult `data-model.md` for complete file mappings
