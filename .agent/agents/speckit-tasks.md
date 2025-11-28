---
description: Generate actionable, dependency-ordered task breakdowns from implementation plans
type: speckit-agent
category: task-management
---

# Spec Kit: Tasks Agent

## Purpose

Generate actionable, dependency-ordered `tasks.md` files from implementation plans. Breaks down technical plans into executable tasks organized by user story priority.

## When to Use

- After implementation plan is complete
- Converting design into concrete action items
- Creating execution roadmap
- Planning incremental delivery

## Prerequisites

- Completed `plan.md` in feature directory
- Completed `spec.md` with prioritized user stories
- Optional: `data-model.md`, `contracts/`, `research.md`

## Outputs

- `tasks.md` - Complete task breakdown with:
  - Tasks organized by user story (P1, P2, P3)
  - Dependency information
  - Parallel execution opportunities
  - Independent test criteria per story
  - File paths for each task

## Process Overview

### 1. Load Design Artifacts

**Required**:
- `plan.md` - Tech stack, libraries, structure
- `spec.md` - User stories with priorities

**Optional**:
- `data-model.md` - Entity definitions
- `contracts/` - API endpoints
- `research.md` - Technology decisions
- `quickstart.md` - Test scenarios

### 2. Task Generation Strategy

**Organize by User Story** (PRIMARY):
- Each user story (P1, P2, P3) gets its own phase
- Map components to stories:
  - Models needed for that story
  - Services needed for that story
  - Endpoints/UI needed for that story
  - Tests specific to that story (if testing requested)

**Independent Implementation**:
- Each story phase should be complete and testable
- Minimal dependencies between stories
- Clear completion criteria per story

### 3. Phase Structure

**Phase 1: Setup**
- Project initialization
- Configuration setup
- Shared infrastructure

**Phase 2: Foundational**
- Blocking prerequisites for all stories
- Core utilities
- Base models/services

**Phase 3+: User Stories** (in priority order)
- One phase per user story
- Complete feature slice
- Independently testable

**Final Phase: Polish**
- Cross-cutting concerns
- Performance optimization
- Documentation

### 4. Task Format (REQUIRED)

Every task MUST follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Components**:
1. **Checkbox**: `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential (T001, T002, T003...)
3. **[P] marker**: If task is parallelizable
4. **[Story] label**: [US1], [US2], etc. (for story phases only)
5. **Description**: Clear action with exact file path

**Examples**:

✅ CORRECT:
```
- [ ] T001 Create project structure per implementation plan
- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py
- [ ] T012 [P] [US1] Create User model in src/models/user.py
- [ ] T014 [US1] Implement UserService in src/services/user_service.py
```

❌ WRONG:
```
- [ ] Create User model (missing ID and story label)
T001 [US1] Create model (missing checkbox)
- [ ] [US1] Create User model (missing Task ID)
```

## Task Mapping Guidelines

### From User Stories

**For each story** (P1, P2, P3):
- Create dedicated phase
- Include story goal
- Define independent test criteria
- List all related tasks (models, services, endpoints, UI)

### From Data Model

- Map each entity to user story that needs it
- If entity serves multiple stories: Put in earliest story or Setup
- Relationships → service layer tasks

### From Contracts

- Map each endpoint to user story it serves
- Include contract file path in task description
- If testing requested: Contract test before implementation

### From Plan Technical Stack

- Infrastructure → Setup phase
- Shared utilities → Foundational phase
- Feature-specific → Story phase

## Quester-Specific Task Patterns

### Database Model Task

```
- [ ] T012 [P] [US1] Create [Entity] model in internal/models/[entity].go
  - Include ID, TenantID (mandatory), fields, timestamps
  - Add TableName() method
  - Add BeforeCreate() lifecycle hook
  - Update internal/migrations/migrations.go
```

### Repository Task

```
- [ ] T013 [P] [US1] Create [Entity]Repository in internal/repositories/[entity]_repository.go
  - Define Repository interface (Create, FindByID, FindByTenantID, Update, Delete)
  - Implement with *gorm.DB dependency
  - All queries MUST filter by TenantID
```

### Service Task

```
- [ ] T014 [US1] Create [Entity]Service in internal/services/[entity]_service.go
  - Create Service struct with repository dependency
  - Implement business logic and validation
  - Handle errors with context wrapping
```

### Controller Task

```
- [ ] T015 [US1] Create [Entity]Controller in internal/controllers/[entity]_controller.go
  - Extract tenant_id and user_id from JWT
  - Parse and validate request body
  - Call service layer
  - Return standardized response
```

### Route Registration Task

```
- [ ] T016 [US1] Register [entity] routes in internal/routes/routes.go
  - Initialize repository, service, controller
  - Register under /api/v1/[entity]
  - Apply FiberAuthMiddleware and rate limiting
```

### Client Types Task

```
- [ ] T017 [P] [US1] Create types in client/core/types/[entity].ts
  - Define interfaces matching server model
  - Export Input/Output types
```

### Client Service Task

```
- [ ] T018 [P] [US1] Create API service in client/core/api/services/[entity].service.ts
  - Import apiClient
  - Implement create, getById, list, update, delete
  - Handle errors
```

### Client Component Task

```
- [ ] T019 [US1] Create page component in client/components/pages/[EntityName].tsx
  - Implement loading/error/empty states
  - Use service to fetch data
  - Apply Tailwind styling
```

## Testing Tasks (Optional)

Only include if explicitly requested in spec or TDD approach specified:

```
- [ ] T020 [P] [US1] Write unit tests for [Entity]Service in internal/services/[entity]_service_test.go
  - Test success and error cases
  - Mock repository dependencies
  - Verify multi-tenant isolation
```

## Dependency & Parallelization

**Dependencies**:
- Document story completion order
- Note blocking relationships
- Foundational tasks before story tasks

**Parallelization**:
- Mark tasks with [P] if independently executable
- Different files = parallelizable
- No dependencies on incomplete tasks = parallelizable

**Example Parallel Groups**:
```
Phase 3: User Story 1 - User Authentication (P1)
- [ ] T012 [P] [US1] Create User model in internal/models/user.go
- [ ] T013 [P] [US1] Create types in client/core/types/user.ts

(Can execute in parallel - different files, no dependencies)
```

## MVP Strategy

**Minimum Viable Product**:
- Typically just P1 user story
- Complete feature slice
- Independently deployable
- Demonstrates core value

**Incremental Delivery**:
- P1 → Deploy & validate
- P2 → Add next priority
- P3+ → Additional features

## Output Summary

Report includes:
- Total task count
- Task count per user story  
- Parallel opportunities identified
- Independent test criteria per story
- Suggested MVP scope (usually P1)
- Format validation confirmation

## Next Steps

After tasks are generated:
- Proceed to `/speckit-analyze` for quality check
- Or directly to `/speckit-implement` for execution

## References

- Template: `.agent/templates/tasks-template.md`
- Plan Template: `.agent/templates/plan-template.md`
- Spec Template: `.agent/templates/spec-template.md`
- Quester Workflows: `.agent/workflows/quester-ai-workflows.md`
