# Quickstart: Server Framework Consolidation

**Feature**: 026-server-framework-consolidation
**Date**: 2025-12-01

## Prerequisites

- Go 1.21+
- Git (for rollback tags)
- Access to `d:/quester/server/` directory

## Quick Verification Commands

```bash
# Navigate to server directory
cd /d/quester/server

# Verify current build status (expect errors due to duplicates)
go build ./...

# After Phase 1 (duplicate fix) - verify build
go build ./...

# After all phases - verify tests
go test ./...
```

## Phase Execution Order

### Phase 1: Fix Duplicate Declarations (P1 - Blocking)

**Goal**: Server builds without duplicate declaration errors.

```bash
# Create rollback point
git tag pre-phase-1

# 1. Create auth_types.go with extracted types
# 2. Remove duplicate declarations from:
#    - auth_service.go
#    - login_service.go
#    - signup_service.go
#    - refresh_token_service.go

# Verify
go build ./...

# Create checkpoint
git add -A && git commit -m "feat(026): extract auth types to resolve duplicates"
git tag post-phase-1
```

### Phase 2: Move Services (P2)

**Goal**: All 60 services in `internal/framework/service/`.

```bash
# Create rollback point
git tag pre-phase-2

# 1. Move services/*.go → framework/service/
# 2. Update imports in all files
# 3. Create service/index.go

# Verify build
go build ./...

# Verify BaseService embedding (FR-004)
grep -l "BaseService" internal/framework/service/*.go | wc -l
# Expected: ~60 (most services embed BaseService)

# Checkpoint
git add -A && git commit -m "feat(026): consolidate services into framework"
git tag post-phase-2
```

### Phase 3: Move Repositories (P2)

**Goal**: All 39 repositories in `internal/framework/repository/`.

```bash
# Create rollback point
git tag pre-phase-3

# 1. Move repositories/*.go → framework/repository/
# 2. Update imports in all files
# 3. Create repository/index.go

# Verify build
go build ./...

# Verify GenericRepository embedding (FR-005)
grep -l "GenericRepository" internal/framework/repository/*.go | wc -l
# Expected: ~39 (most repos embed GenericRepository)

# Checkpoint
git add -A && git commit -m "feat(026): consolidate repositories into framework"
git tag post-phase-3
```

### Phase 4: Move Controllers (P2)

**Goal**: All 39 controllers in `internal/framework/controller/`.

```bash
# Create rollback point
git tag pre-phase-4

# 1. Move controllers/*.go → framework/controller/
# 2. Update imports in all files
# 3. Create controller/index.go

# Verify
go build ./...

# Checkpoint
git add -A && git commit -m "feat(026): consolidate controllers into framework"
git tag post-phase-4
```

### Phase 5: Move Routes (P3)

**Goal**: All 21 routes in `internal/framework/routes/`.

```bash
# Create rollback point
git tag pre-phase-5

# 1. Move routes/*.go → framework/routes/
# 2. Update imports in all files
# 3. Create routes/index.go

# Verify
go build ./...

# Checkpoint
git add -A && git commit -m "feat(026): consolidate routes into framework"
git tag post-phase-5
```

### Phase 6: Merge Utils (P3)

**Goal**: Utils consolidated in `internal/framework/utils/`.

```bash
# Create rollback point
git tag pre-phase-6

# 1. Move utils/*.go → framework/utils/
# 2. Update imports in all files
# 3. Create utils/index.go
# 4. Delete empty internal/utils/

# Verify
go build ./...

# Checkpoint
git add -A && git commit -m "feat(026): merge utils into framework"
git tag post-phase-6
```

### Phase 7: Cleanup & Final Verification

**Goal**: Delete empty directories, run full test suite.

```bash
# Delete empty directories
rm -rf internal/controllers/
rm -rf internal/repositories/
rm -rf internal/routes/
rm -rf internal/services/
rm -rf internal/utils/

# Final verification
go build ./...
go test ./...

# Final commit
git add -A && git commit -m "feat(026): cleanup empty directories"
git tag 026-complete
```

## Rollback Procedure

If any phase fails:

```bash
# Rollback to last working state
git reset --hard <tag-name>

# Examples:
git reset --hard pre-phase-2   # Rollback Phase 2
git reset --hard post-phase-1  # Keep Phase 1, redo Phase 2
```

## Import Path Reference

| Old Path | New Path |
|----------|----------|
| `internal/services` | `internal/framework/service` |
| `internal/repositories` | `internal/framework/repository` |
| `internal/controllers` | `internal/framework/controller` |
| `internal/routes` | `internal/framework/routes` |
| `internal/utils` | `internal/framework/utils` |

## Success Criteria Checklist

- [ ] `go build ./...` exits with code 0
- [ ] `go test ./...` passes all tests
- [ ] Zero duplicate type declarations
- [ ] All services in `framework/service/`
- [ ] All repositories in `framework/repository/`
- [ ] All controllers in `framework/controller/`
- [ ] All routes in `framework/routes/`
- [ ] All utils in `framework/utils/`
- [ ] Empty directories deleted
- [ ] Build time within 10% of baseline
