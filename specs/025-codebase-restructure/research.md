# Research: Codebase Structure Refactoring

**Feature**: 025-codebase-restructure  
**Date**: 2025-12-01  
**Status**: Phase 0 Complete

## R1: Framework Import Violation Analysis

### Task

Identify all files in `internal/framework/` that import from application layers (`controllers`, `services`, `repositories`, `models`).

### Findings

**Method to verify** (run in `server/` directory):

```bash
grep -rn "internal/controllers\|internal/services\|internal/repositories\|internal/models" internal/framework/ --include="*.go"
```

### Resolution Strategy

Per clarifications: **Extract interfaces in framework, move implementations to app layer**

For each violation found:

1. Identify the app-layer type being imported
2. Create an interface in `internal/framework/interfaces/`
3. Update framework code to depend on interface
4. Ensure app-layer code implements the interface

---

## R2: Duplicate Directory Inventory

### Task

Compare files in duplicate directories to identify conflicts.

### internal/middleware/ vs internal/framework/middleware/

| File | Location | Action |
|------|----------|--------|
| *(TBD during implementation)* | | |

**Resolution**: Per clarifications - Prefer framework version, merge unique app-specific code

### internal/websocket/ vs internal/framework/websocket/

| File | Location | Action |
|------|----------|--------|
| *(TBD during implementation)* | | |

**Resolution**: Per clarifications - Prefer framework version, merge unique app-specific code

### internal/config/ vs internal/framework/config/

| File | Location | Action |
|------|----------|--------|
| *(TBD during implementation)* | | |

**Resolution**: Per clarifications - Prefer framework version, merge unique app-specific code

### Verification Commands

```bash
# List files in each duplicate pair
ls -la server/internal/middleware/
ls -la server/internal/framework/middleware/

ls -la server/internal/websocket/
ls -la server/internal/framework/websocket/

ls -la server/internal/config/
ls -la server/internal/framework/config/
```

---

## R3: Client Current Structure Mapping

### Task

Map current `core/` structure to target structure.

### Current core/ Structure

```
core/
├── api/           → Keep as core/api/ (client only)
│   └── services/  → Move to core/services/
├── auth/          → Keep as core/auth/
├── components/    → Review - may move to components/shared/
├── config/        → Keep as core/config/
├── constants/     → Keep as core/constants/
├── hooks/         → Reorganize into hooks/queries/, hooks/mutations/, hooks/utils/
├── query/         → Keep as core/query/
├── routes/        → Keep as core/routes/
├── types/         → Keep as core/types/
└── utils/         → Keep as core/utils/
```

### Current components/pages/ Structure

```
components/pages/
├── achievements/  → components/features/achievements/
├── badges/        → components/features/badges/
├── dashboard/     → components/features/dashboard/
├── learning/      → components/features/learning/
├── marketplace/   → components/features/marketplace/
├── notifications/ → components/features/notifications/
├── profile/       → components/features/profile/
├── quests/        → components/features/quests/
├── settings/      → components/features/settings/
└── transactions/  → components/features/transactions/
```

### Hooks Reorganization

Per clarifications: **Organize by type (queries/, mutations/, utils/)**

```
core/hooks/
├── queries/       # All useXxxQuery hooks
├── mutations/     # All useXxxMutation hooks
└── utils/         # useDebounce, useLocalStorage, etc.
```

---

## R4: Service Interface Extraction List

### Task

Identify ~15 critical path services for interface extraction.

### Critical Path Services (per clarifications)

| Service | File | Priority | Methods to Extract |
|---------|------|----------|-------------------|
| AuthService | `internal/services/auth_service.go` | P1 | Login, Register, RefreshToken, Logout |
| UserService | `internal/services/user_service.go` | P1 | GetUser, UpdateUser, DeleteUser |
| PaymentService | `internal/services/payment_service.go` | P1 | ProcessPayment, GetTransactions |
| CourseService | `internal/services/course_service.go` | P1 | GetCourse, EnrollUser, GetProgress |
| QuestService | `internal/services/quest_service.go` | P1 | GetQuests, CompleteQuest, GetRewards |
| BadgeService | `internal/services/badge_service.go` | P2 | GetBadges, AwardBadge |
| AchievementService | `internal/services/achievement_service.go` | P2 | GetAchievements, UnlockAchievement |
| NotificationService | `internal/services/notification_service.go` | P2 | SendNotification, GetNotifications |
| MarketplaceService | `internal/services/marketplace_service.go` | P2 | GetItems, PurchaseItem |
| StreamingService | `internal/services/streaming_service.go` | P2 | StartStream, EndStream |
| TenantService | `internal/services/tenant_service.go` | P1 | GetTenant, ValidateTenant |
| TokenService | `internal/services/token_service.go` | P1 | GenerateToken, ValidateToken |
| TwoFactorService | `internal/services/2fa_service.go` | P1 | Enable2FA, Verify2FA |
| PartnerService | `internal/services/partner_service.go` | P2 | GetPartners, RegisterPartner |
| ReportService | `internal/services/report_service.go` | P2 | GenerateReport, GetReports |

### Interface Definition Pattern

```go
// internal/framework/interfaces/services/auth_service.go
package services

import (
    "context"
)

// AuthServiceInterface defines the contract for authentication operations
type AuthServiceInterface interface {
    Login(ctx context.Context, email, password string) (*LoginResponse, error)
    Register(ctx context.Context, input *RegisterInput) (*User, error)
    RefreshToken(ctx context.Context, refreshToken string) (*TokenPair, error)
    Logout(ctx context.Context, userID uuid.UUID) error
}
```

---

## Research Decisions Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Server first, then client | Establishes patterns; server changes more isolated | Parallel (riskier), Client first (loses pattern guidance) |
| Extract interfaces for violations | Keeps framework pure, enables mocking | Move code out (loses reusability), Inline (duplication) |
| Hooks by type | Aligns with TanStack Query patterns | By domain (harder to find), Hybrid (complex) |
| Hierarchical barrel files | Enables tree-shaking + granular imports | Single barrel (no tree-shaking), No barrels (verbose) |
| Usage count rule for shared | Objective, prevents premature abstraction | Domain knowledge (subjective), Size-based (arbitrary) |
| IDE refactoring + scripts | Practical balance of automation and safety | Manual only (slow), AST tools (overkill) |
| Validate after each directory | Catches issues early, aligns with atomic commits | Per file (too slow), End only (hard to debug) |

---

## Next Steps

1. ✅ Research complete
2. → Proceed to Phase 1: Generate data-model.md with file mappings
3. → Generate contracts/ with interface definitions
4. → Generate quickstart.md with developer guide
