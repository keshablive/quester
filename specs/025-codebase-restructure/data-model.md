# Data Model: Codebase Structure Refactoring

**Feature**: 025-codebase-restructure  
**Date**: 2025-12-01  
**Status**: Phase 1 Design

## Overview

This document defines the file mappings and transformations for the codebase restructuring. No database schema changes are involved - this is purely a source code organization refactor.

---

## Server File Mappings

### Directory Consolidation

#### Middleware Consolidation

| Source | Target | Action |
|--------|--------|--------|
| `internal/middleware/*` | `internal/framework/middleware/` | Merge (prefer framework version) |

**Merge Strategy**:

1. Keep all files from `internal/framework/middleware/`
2. For each file in `internal/middleware/`:
   - If no conflict: move to target
   - If conflict: merge unique code into framework version
3. Delete `internal/middleware/` directory

#### WebSocket Consolidation

| Source | Target | Action |
|--------|--------|--------|
| `internal/websocket/*` | `internal/framework/websocket/` | Merge (prefer framework version) |

**Merge Strategy**: Same as middleware

#### Config Consolidation

| Source | Target | Action |
|--------|--------|--------|
| `internal/config/*` | `internal/framework/config/` | Merge (prefer framework version) |

**Merge Strategy**: Same as middleware

---

### Framework Interface Directory Structure

```text
internal/framework/interfaces/
├── repositories/
│   └── (existing repository interfaces)
└── services/
    ├── auth_service.go
    ├── user_service.go
    ├── payment_service.go
    ├── course_service.go
    ├── quest_service.go
    ├── badge_service.go
    ├── achievement_service.go
    ├── notification_service.go
    ├── marketplace_service.go
    ├── streaming_service.go
    ├── tenant_service.go
    ├── token_service.go
    ├── two_factor_service.go
    ├── partner_service.go
    └── report_service.go
```

---

## Client File Mappings

### Core Directory Reorganization

| Current Path | Target Path | Notes |
|--------------|-------------|-------|
| `core/api/client.ts` | `core/api/client.ts` | Unchanged |
| `core/api/types.ts` | `core/api/types.ts` | Unchanged |
| `core/api/services/*.ts` | `core/services/*.ts` | Move all service files |
| `core/auth/*` | `core/auth/*` | Unchanged |
| `core/query/*` | `core/query/*` | Unchanged |
| `core/hooks/use*Query.ts` | `core/hooks/queries/use*Query.ts` | Reorganize by type |
| `core/hooks/use*Mutation.ts` | `core/hooks/mutations/use*Mutation.ts` | Reorganize by type |
| `core/hooks/useDebounce.ts` | `core/hooks/utils/useDebounce.ts` | Utility hooks |
| `core/hooks/useLocalStorage.ts` | `core/hooks/utils/useLocalStorage.ts` | Utility hooks |
| `core/config/*` | `core/config/*` | Unchanged |
| `core/constants/*` | `core/constants/*` | Unchanged |
| `core/routes/*` | `core/routes/*` | Unchanged |
| `core/types/*` | `core/types/*` | Unchanged |
| `core/utils/*` | `core/utils/*` | Unchanged |

### Component Directory Reorganization

| Current Path | Target Path | Notes |
|--------------|-------------|-------|
| `components/pages/achievements/*` | `components/features/achievements/*` | Rename pages → features |
| `components/pages/badges/*` | `components/features/badges/*` | Rename pages → features |
| `components/pages/dashboard/*` | `components/features/dashboard/*` | Rename pages → features |
| `components/pages/learning/*` | `components/features/learning/*` | Rename pages → features |
| `components/pages/marketplace/*` | `components/features/marketplace/*` | Rename pages → features |
| `components/pages/notifications/*` | `components/features/notifications/*` | Rename pages → features |
| `components/pages/profile/*` | `components/features/profile/*` | Rename pages → features |
| `components/pages/quests/*` | `components/features/quests/*` | Rename pages → features |
| `components/pages/settings/*` | `components/features/settings/*` | Rename pages → features |
| `components/pages/transactions/*` | `components/features/transactions/*` | Rename pages → features |
| `components/ui/*` | `components/ui/*` | Unchanged (shadcn) |
| `components/shared/*` | `components/shared/*` | Keep + add shared components |
| `components/layout/*` | `components/layout/*` | Unchanged |
| `components/auth/*` | `components/auth/*` | Unchanged |

---

## Barrel File Structure

### Core Barrel Hierarchy

```typescript
// core/api/index.ts
export * from './client';
export * from './types';

// core/services/index.ts
export * from './auth.service';
export * from './courses.service';
// ... all services

// core/hooks/queries/index.ts
export * from './useAuthQuery';
export * from './useCoursesQuery';
// ... all query hooks

// core/hooks/mutations/index.ts
export * from './useAuthMutation';
export * from './useCoursesMutation';
// ... all mutation hooks

// core/hooks/utils/index.ts
export * from './useDebounce';
export * from './useLocalStorage';
// ... all utility hooks

// core/hooks/index.ts
export * from './queries';
export * from './mutations';
export * from './utils';

// core/index.ts (main barrel)
export * from './api';
export * from './services';
export * from './hooks';
export * from './auth';
export * from './query';
export * from './config';
export * from './constants';
export * from './routes';
export * from './types';
export * from './utils';
```

### Components Barrel Hierarchy

```typescript
// components/features/index.ts
export * from './achievements';
export * from './badges';
export * from './dashboard';
// ... all features

// components/shared/index.ts
export * from './Button';
export * from './Card';
// ... all shared components

// components/index.ts (main barrel)
export * from './ui';
export * from './shared';
export * from './features';
export * from './layout';
export * from './auth';
```

---

## Import Path Patterns

### Server (Go)

**Before**:

```go
import "github.com/keshablive/quester/internal/middleware"
import "github.com/keshablive/quester/internal/config"
```

**After**:

```go
import "github.com/keshablive/quester/internal/framework/middleware"
import "github.com/keshablive/quester/internal/framework/config"
```

### Client (TypeScript)

**Before**:

```typescript
import { authService } from '../../api/services/auth.service';
import { useDebounce } from '../../../core/hooks/useDebounce';
```

**After**:

```typescript
import { authService } from '@/core/services';
import { useDebounce } from '@/core/hooks/utils';
// Or using main barrel:
import { authService, useDebounce } from '@/core';
```

---

## Shared vs Features Decision Matrix

| Component | Used By Features | Location | Rationale |
|-----------|------------------|----------|-----------|
| `LoadingSpinner` | All | `shared/` | Used by ≥2 features |
| `EmptyState` | Dashboard, Quests, Badges | `shared/` | Used by ≥2 features |
| `QuestCard` | Quests only | `features/quests/` | Used by 1 feature |
| `BadgeDisplay` | Badges only | `features/badges/` | Used by 1 feature |
| `UserAvatar` | Profile, Dashboard, Settings | `shared/` | Used by ≥2 features |

---

## Validation Checkpoints

| Phase | Checkpoint | Command | Expected Result |
|-------|------------|---------|-----------------|
| S1 | Framework violations fixed | `go build ./internal/framework/...` | Success, 0 errors |
| S2a | Middleware consolidated | `go build ./...` | Success, 0 errors |
| S2b | WebSocket consolidated | `go build ./...` | Success, 0 errors |
| S2c | Config consolidated | `go build ./...` | Success, 0 errors |
| S3 | Interfaces created | `go build ./...` + `go test ./...` | Success, all tests pass |
| C1 | Core reorganized | `npm run typecheck` | Success, 0 errors |
| C2 | Components reorganized | `npm run typecheck` | Success, 0 errors |
| C3 | Imports consistent | `npm run lint` | Success, 0 warnings |
