---
description: Execute phased implementation from validated specifications and plans
type: speckit-agent
category: implementation
---

# Spec Kit: Implement Agent

## Purpose

Execute phased implementation of features based on validated specifications, plans, and task breakdowns. Follows Quester workflows and constitutional principles.

## When to Use

- After specification, plan, and tasks are validated
- After quality analysis passes
- Ready to write code
- Executing MVP or full feature

## Prerequisites

- Validated `spec.md`
- Validated `plan.md`
- Validated `tasks.md`
- Constitutional compliance confirmed
- Quality analysis passed

## Execution Strategy

### MVP-First Approach

**Start with Priority 1 (P1) user story only**:
- Complete all tasks for P1
- Test and validate P1
- Deploy and get feedback
- Then proceed to P2, P3, etc.

**Benefits**:
- Fastest time to value
- Early user feedback
- Incremental risk
- Testable milestones

### Phase-by-Phase Execution

**Phase 1: Setup**
- Project structure
- Configuration
- Shared infrastructure
- Dependencies

**Phase 2: Foundational**
- Core utilities
- Base models
- Shared services
- Database setup

**Phase 3+: User Stories** (in priority order)
- One complete user story at a time
- Test after completing each story
- Verify independently

**Final Phase: Polish**
- Performance optimization
- Cross-cutting concerns
- Documentation
- Deployment prep

## Implementation Workflow

### 1. Load Tasks

Read `tasks.md` and extract:
- Task list with IDs
- Phase grouping
- User story mapping
- Parallel opportunities
- File paths

### 2. Execute Tasks Sequentially

For each task:

**Before implementation**:
- Read referenced files for patterns
- Check existing implementations
- Verify file paths exist
- Understand dependencies

**During implementation**:
- Follow Quester AI Workflows
- Apply Quester AI Rules
- Ensure constitutional compliance
- Write clean, documented code

**After implementation**:
- Mark task complete in tasks.md
- Verify code compiles
- Check for errors
- Test functionality

### 3. Parallel Execution (Optional)

Tasks marked with [P] can be executed in parallel:
- Different files
- No dependencies
- Independent components

### 4. Story-Level Validation

After completing each user story phase:

**Test acceptance criteria**:
- Verify Given-When-Then scenarios
- Test edge cases
- Check multi-tenant isolation
- Validate security controls

**Independent test criteria**:
- Can this story be tested independently?
- Does it deliver value on its own?
- Are all components complete?

### 5. Constitutional Validation

Throughout implementation, verify:
- [ ] Multi-tenancy: All queries filter by TenantID
- [ ] Security: Input validation, auth checks
- [ ] Type Safety: No `any`, explicit types
- [ ] Error Handling: All errors handled
- [ ] Context: Propagated throughout
- [ ] Observability: Logging in place

## Task Execution Patterns

### Server (Go) Tasks

**Model Creation** (`internal/models/[entity].go`):
```go
package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Quest struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
    TenantID  uuid.UUID `gorm:"type:uuid;not null;index"` // CRITICAL
    Title     string    `gorm:"not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

func (Quest) TableName() string {
    return "quests"
}

func (q *Quest) BeforeCreate(tx *gorm.DB) error {
    if q.ID == uuid.Nil {
        q.ID = uuid.New()
    }
    return nil
}
```

**Repository Creation** (`internal/repositories/[entity]_repository.go`):
```go
package repositories

import (
    "context"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type QuestRepository interface {
    Create(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) error
    FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*models.Quest, error)
    // ... other methods
}

type questRepository struct {
    db *gorm.DB
}

func NewQuestRepository(db *gorm.DB) QuestRepository {
    return &questRepository{db: db}
}

func (r *questRepository) Create(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) error {
    quest.TenantID = tenantID // CRITICAL
    return r.db.WithContext(ctx).Create(quest).Error
}

func (r *questRepository) FindByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*models.Quest, error) {
    var quest models.Quest
    err := r.db.WithContext(ctx).
        Where("id = ? AND tenant_id = ?", id, tenantID). // CRITICAL
        First(&quest).Error
    if err != nil {
        return nil, fmt.Errorf("failed to find quest: %w", err)
    }
    return &quest, nil
}
```

**Service Creation** (`internal/services/[entity]_service.go`):
```go
package services

import (
    "context"
    "fmt"
    "github.com/google/uuid"
)

type QuestService struct {
    repo repositories.QuestRepository
}

func NewQuestService(repo repositories.QuestRepository) *QuestService {
    return &QuestService{repo: repo}
}

func (s *QuestService) CreateQuest(ctx context.Context, tenantID uuid.UUID, input *CreateQuestInput) (*models.Quest, error) {
    // Validation
    if input.Title == "" {
        return nil, fmt.Errorf("title is required")
    }
    
    quest := &models.Quest{
        Title: input.Title,
    }
    
    if err := s.repo.Create(ctx, tenantID, quest); err != nil {
        return nil, fmt.Errorf("failed to create quest: %w", err)
    }
    
    return quest, nil
}
```

**Controller Creation** (`internal/controllers/[entity]_controller.go`):
```go
package controllers

import (
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
)

type QuestController struct {
    service *services.QuestService
}

func NewQuestController(service *services.QuestService) *QuestController {
    return &QuestController{service: service}
}

func (c *QuestController) CreateQuest(ctx *fiber.Ctx) error {
    // Extract from JWT (CRITICAL)
    claims := ctx.Locals("claims").(map[string]interface{})
    tenantID, _ := uuid.Parse(claims["tenant_id"].(string))
    
    var input services.CreateQuestInput
    if err := ctx.BodyParser(&input); err != nil {
        return ctx.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }
    
    quest, err := c.service.CreateQuest(ctx.Context(), tenantID, &input)
    if err != nil {
        return ctx.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return ctx.Status(201).JSON(quest)
}
```

### Client (TypeScript) Tasks

**Type Definitions** (`client/core/types/[entity].ts`):
```typescript
export interface Quest {
  id: string;
  tenantId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestInput {
  title: string;
}

export interface UpdateQuestInput {
  title?: string;
}
```

**API Service** (`client/core/api/services/[entity].service.ts`):
```typescript
import { apiClient } from '../apiClient';
import { Quest, CreateQuestInput, UpdateQuestInput } from '../../types/quest';

export const questService = {
  async create(input: CreateQuestInput): Promise<Quest> {
    const response = await apiClient.post('/api/v1/quests', input);
    return response.data;
  },
  
  async getById(id: string): Promise<Quest> {
    const response = await apiClient.get(`/api/v1/quests/${id}`);
    return response.data;
  },
  
  async list(): Promise<Quest[]> {
    const response = await apiClient.get('/api/v1/quests');
    return response.data;
  },
  
  async update(id: string, input: UpdateQuestInput): Promise<Quest> {
    const response = await apiClient.patch(`/api/v1/quests/${id}`, input);
    return response.data;
  },
  
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/quests/${id}`);
  },
};
```

## Progress Tracking

### Update tasks.md

Mark completed tasks:
```markdown
- [x] T001 Create project structure
- [x] T002 [P] Create Quest model in internal/models/quest.go
- [ ] T003 [P] Create QuestRepository in internal/repositories/quest_repository.go
```

### Story Completion Criteria

After each story:
```markdown
## User Story 1 - Quest Creation [COMPLETE]

**Acceptance Criteria Met**:
- ✅ Users can create quests
- ✅ Quest title is validated
- ✅ Quests are tenant-isolated
- ✅ Errors are handled gracefully

**Testing**:
- ✅ Manual testing completed
- ✅ Multi-tenant isolation verified
- ✅ Edge cases tested

**Ready for**: User Story 2
```

## Quality Gates

Before marking phase complete:

**Code Quality**:
- [ ] Compiles without errors
- [ ] No linting errors
- [ ] Pattern compliance
- [ ] Documentation complete

**Functional**:
- [ ] Acceptance criteria met
- [ ] Edge cases handled
- [ ] Error scenarios tested

**Constitutional**:
- [ ] Multi-tenancy verified
- [ ] Security controls in place
- [ ] Type safety maintained
- [ ] Error handling complete

## Next Steps

After implementation:
- Test thoroughly
- Create walkthrough documentation
- Deploy and verify
- Gather feedback

## References

- Tasks Template: `.agent/templates/tasks-template.md`
- Quester Workflows: `.agent/workflows/quester-ai-workflows.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
- Constitution: `.agent/rules/constitution.md`
