# Quester Platform - AI Agent Workflows

> **Step-by-Step Automation Workflows for AI Agents**
> This document contains detailed workflows for common development tasks. Follow these sequentially for consistent, high-quality code generation.

---

## Table of Contents

1. [Workflow Execution Strategy](#1-workflow-execution-strategy)
2. [New Feature Workflow](#2-new-feature-workflow-end-to-end)
3. [Modify Existing Feature](#3-modify-existing-feature-workflow)
4. [Add New Endpoint](#4-add-new-endpoint-workflow)
5. [Bug Fix Workflow](#5-bug-fix-workflow)
6. [Refactoring Workflow](#6-refactoring-workflow)
7. [Add UI Component](#7-add-ui-component-workflow)
8. [Add Database Migration](#8-add-database-migration-workflow)
9. [Add API Integration](#9-add-api-integration-workflow)
10. [Deploy Feature](#10-deploy-feature-workflow)

---

## 1. Workflow Execution Strategy

### 1.1 Before Starting ANY Workflow

**AI Agent MUST**:

1. ✅ Create a todo list using `manage_todo_list` tool with all steps
2. ✅ Read and understand the relevant documentation
3. ✅ Search for similar implementations in the codebase
4. ✅ Verify all file paths and directory structure
5. ✅ Understand the full context and requirements

### 1.2 Workflow Selection Guide

| Task Type | Use Workflow | Complexity | Estimated Steps |
|-----------|--------------|------------|-----------------|
| **New Feature (Full Stack)** | #2 | High | 10-15 steps |
| **Modify Existing Feature** | #3 | Medium | 5-8 steps |
| **Add Single Endpoint** | #4 | Low | 3-5 steps |
| **Fix Bug** | #5 | Low-Medium | 4-6 steps |
| **Refactor Code** | #6 | Medium | 5-7 steps |
| **Add UI Component** | #7 | Low | 3-4 steps |
| **Database Change** | #8 | Medium | 4-5 steps |
| **API Integration** | #9 | Medium | 6-8 steps |

### 1.3 Workflow Execution Rules

**During Execution**:
- Mark task as `in-progress` when starting
- Complete ONE task fully before moving to next
- Mark task as `completed` IMMEDIATELY after finishing
- Run `get_errors` tool after each code generation
- Verify patterns match existing code

**After Execution**:
- Verify all files compile without errors
- Check that all TODOs are completed
- Ensure all tests pass (if applicable)
- Update documentation if needed

---

## 2. New Feature Workflow (End-to-End)

**Use Case**: Implementing a completely new feature from scratch (e.g., adding a "Teams" feature)

### Prerequisites Check

- [ ] Feature requirements clearly defined
- [ ] Database schema designed
- [ ] API endpoints planned
- [ ] UI mockups available (if applicable)

### Step-by-Step Process

#### Step 1: Database Model Creation

**Todo**: Create GORM model in `internal/models/[feature].go`

**Actions**:
1. Read existing models for pattern matching:
   ```
   read_file: internal/models/user.go
   read_file: internal/models/quest.go
   ```

2. Create new model file following pattern:
   ```go
   // File: internal/models/team.go
   package models

   import (
       "time"
       "github.com/google/uuid"
       "gorm.io/gorm"
   )

   type Team struct {
       // Primary Key
       ID uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
       
       // Multi-Tenant (MANDATORY)
       TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_teams_tenant" json:"tenant_id"`
       
       // Fields
       Name        string    `gorm:"type:varchar(255);not null" json:"name" validate:"required,min=3,max=255"`
       Description string    `gorm:"type:text" json:"description"`
       OwnerID     uuid.UUID `gorm:"type:uuid;not null;index:idx_teams_owner" json:"owner_id"`
       
       // Timestamps
       CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
       UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
       DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
   }

   func (Team) TableName() string {
       return "teams"
   }

   func (t *Team) BeforeCreate(tx *gorm.DB) error {
       if t.ID == uuid.Nil {
           t.ID = uuid.New()
       }
       return nil
   }
   ```

3. Update migrations file:
   ```
   read_file: internal/migrations/migrations.go
   replace_string_in_file: Add &models.Team{} to AutoMigrate list
   ```

**Verification**:
- [ ] Model includes TenantID
- [ ] All fields have proper tags (gorm, json, validate)
- [ ] TableName() method defined
- [ ] BeforeCreate() hook implemented
- [ ] Model added to AutoMigrate

#### Step 2: Repository Creation

**Todo**: Create repository in `internal/repositories/team_repository.go`

**Actions**:
1. Read existing repository for pattern:
   ```
   read_file: internal/repositories/user_repository.go
   ```

2. Create repository interface and implementation:
   ```go
   // File: internal/repositories/team_repository.go
   package repositories

   import (
       "context"
       "github.com/google/uuid"
       "github.com/keshablive/quester/internal/models"
       "gorm.io/gorm"
   )

   type TeamRepository interface {
       Create(ctx context.Context, tenantID uuid.UUID, team *models.Team) error
       FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Team, error)
       FindByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*models.Team, error)
       Update(ctx context.Context, tenantID uuid.UUID, team *models.Team) error
       Delete(ctx context.Context, tenantID, id uuid.UUID) error
   }

   type teamRepository struct {
       db *gorm.DB
   }

   func NewTeamRepository(db *gorm.DB) TeamRepository {
       return &teamRepository{db: db}
   }

   func (r *teamRepository) Create(ctx context.Context, tenantID uuid.UUID, team *models.Team) error {
       team.TenantID = tenantID
       return r.db.WithContext(ctx).Create(team).Error
   }

   func (r *teamRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Team, error) {
       var team models.Team
       err := r.db.WithContext(ctx).
           Where("tenant_id = ? AND id = ?", tenantID, id).
           First(&team).Error
       if err != nil {
           return nil, err
       }
       return &team, nil
   }

   func (r *teamRepository) FindByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*models.Team, error) {
       var teams []*models.Team
       err := r.db.WithContext(ctx).
           Where("tenant_id = ?", tenantID).
           Limit(limit).
           Offset(offset).
           Order("created_at DESC").
           Find(&teams).Error
       return teams, err
   }

   func (r *teamRepository) Update(ctx context.Context, tenantID uuid.UUID, team *models.Team) error {
       return r.db.WithContext(ctx).
           Where("tenant_id = ? AND id = ?", tenantID, team.ID).
           Updates(team).Error
   }

   func (r *teamRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
       return r.db.WithContext(ctx).
           Where("tenant_id = ? AND id = ?", tenantID, id).
           Delete(&models.Team{}).Error
   }
   ```

**Verification**:
- [ ] Interface defined with all CRUD methods
- [ ] All methods have context.Context as first parameter
- [ ] All queries filter by TenantID
- [ ] Error handling is consistent

#### Step 3: Service Creation

**Todo**: Create service in `internal/services/team_service.go`

**Actions**:
1. Read existing service for pattern:
   ```
   read_file: internal/services/quest_service.go
   ```

2. Create service with business logic:
   ```go
   // File: internal/services/team_service.go
   package services

   import (
       "context"
       "fmt"
       "github.com/google/uuid"
       "github.com/keshablive/quester/internal/models"
       "github.com/keshablive/quester/internal/repositories"
   )

   type TeamService struct {
       repo repositories.TeamRepository
       // Add other dependencies (e.g., notification service)
   }

   func NewTeamService(repo repositories.TeamRepository) *TeamService {
       return &TeamService{repo: repo}
   }

   type CreateTeamInput struct {
       Name        string `json:"name" validate:"required,min=3,max=255"`
       Description string `json:"description"`
   }

   func (s *TeamService) Create(ctx context.Context, tenantID, ownerID uuid.UUID, input *CreateTeamInput) (*models.Team, error) {
       // Validation
       if input.Name == "" {
           return nil, fmt.Errorf("team name is required")
       }

       // Create team
       team := &models.Team{
           TenantID:    tenantID,
           OwnerID:     ownerID,
           Name:        input.Name,
           Description: input.Description,
       }

       if err := s.repo.Create(ctx, tenantID, team); err != nil {
           return nil, fmt.Errorf("failed to create team: %w", err)
       }

       return team, nil
   }

   func (s *TeamService) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Team, error) {
       team, err := s.repo.FindByID(ctx, tenantID, id)
       if err != nil {
           return nil, fmt.Errorf("failed to get team: %w", err)
       }
       return team, nil
   }

   func (s *TeamService) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*models.Team, error) {
       offset := (page - 1) * limit
       teams, err := s.repo.FindByTenant(ctx, tenantID, limit, offset)
       if err != nil {
           return nil, fmt.Errorf("failed to list teams: %w", err)
       }
       return teams, nil
   }
   ```

**Verification**:
- [ ] Service has constructor
- [ ] All methods return errors
- [ ] Input validation implemented
- [ ] Business logic is clear and documented

#### Step 4: Controller Creation

**Todo**: Create controller in `internal/controllers/team_controller.go`

**Actions**:
1. Read existing controller:
   ```
   read_file: internal/controllers/quest_controller.go
   ```

2. Create controller with HTTP handlers:
   ```go
   // File: internal/controllers/team_controller.go
   package controllers

   import (
       "github.com/gofiber/fiber/v2"
       "github.com/google/uuid"
       "github.com/keshablive/quester/internal/services"
       "github.com/keshablive/quester/internal/framework/responses"
   )

   type TeamController struct {
       service *services.TeamService
   }

   func NewTeamController(service *services.TeamService) *TeamController {
       return &TeamController{service: service}
   }

   func (c *TeamController) Create(ctx *fiber.Ctx) error {
       // Extract tenant ID from JWT
       tenantID, err := uuid.Parse(ctx.Locals("tenant_id").(string))
       if err != nil {
           return responses.BadRequest(ctx, "Invalid tenant ID")
       }

       // Extract user ID from JWT
       userID, err := uuid.Parse(ctx.Locals("user_id").(string))
       if err != nil {
           return responses.Unauthorized(ctx, "Invalid user ID")
       }

       // Parse request body
       var input services.CreateTeamInput
       if err := ctx.BodyParser(&input); err != nil {
           return responses.BadRequest(ctx, "Invalid request body")
       }

       // Call service
       team, err := c.service.Create(ctx.Context(), tenantID, userID, &input)
       if err != nil {
           return responses.InternalError(ctx, err.Error())
       }

       return responses.Created(ctx, team)
   }

   func (c *TeamController) Get(ctx *fiber.Ctx) error {
       tenantID, _ := uuid.Parse(ctx.Locals("tenant_id").(string))
       teamID, err := uuid.Parse(ctx.Params("id"))
       if err != nil {
           return responses.BadRequest(ctx, "Invalid team ID")
       }

       team, err := c.service.GetByID(ctx.Context(), tenantID, teamID)
       if err != nil {
           return responses.NotFound(ctx, "Team not found")
       }

       return responses.Success(ctx, team)
   }

   func (c *TeamController) List(ctx *fiber.Ctx) error {
       tenantID, _ := uuid.Parse(ctx.Locals("tenant_id").(string))
       
       page := ctx.QueryInt("page", 1)
       limit := ctx.QueryInt("limit", 20)

       teams, err := c.service.List(ctx.Context(), tenantID, page, limit)
       if err != nil {
           return responses.InternalError(ctx, err.Error())
       }

       return responses.Success(ctx, teams)
   }
   ```

**Verification**:
- [ ] Extracts tenantID from JWT claims
- [ ] Validates request parameters
- [ ] Uses standardized responses
- [ ] Error handling is consistent

#### Step 5: Route Registration

**Todo**: Register routes in `internal/routes/routes.go`

**Actions**:
1. Read routes file:
   ```
   read_file: internal/routes/routes.go (lines 1-100)
   ```

2. Initialize service and controller:
   ```go
   // In routes.go Setup() function, add:
   
   // Initialize Team feature
   teamRepo := repositories.NewTeamRepository(db)
   teamService := services.NewTeamService(teamRepo)
   teamController := controllers.NewTeamController(teamService)
   ```

3. Register routes:
   ```go
   // Team routes
   teams := v1.Group("/teams")
   teams.Use(middleware.FiberAuthMiddleware())

   teams.Post("", 
       middleware.FiberRateLimitByIP(20, 1*time.Hour),
       teamController.Create,
   )
   teams.Get("/:id",
       middleware.FiberRateLimitByIP(100, 1*time.Minute),
       teamController.Get,
   )
   teams.Get("",
       middleware.FiberRateLimitByIP(100, 1*time.Minute),
       teamController.List,
   )
   ```

**Verification**:
- [ ] Service initialized with dependencies
- [ ] Controller initialized with service
- [ ] Routes grouped logically
- [ ] Authentication middleware applied
- [ ] Rate limiting configured

#### Step 6: Client Types Creation

**Todo**: Create TypeScript types in `client/core/types/team.ts`

**Actions**:
```typescript
// File: client/core/types/team.ts
export interface Team {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
}

export interface TeamListResponse {
  data: Team[];
  total: number;
  page: number;
  limit: number;
}
```

**Verification**:
- [ ] Types match server model exactly
- [ ] All fields properly typed
- [ ] Input/Output types defined

#### Step 7: Client API Service

**Todo**: Create API service in `client/core/api/services/team.service.ts`

**Actions**:
```typescript
// File: client/core/api/services/team.service.ts
import { apiClient } from '../client';
import type { Team, CreateTeamInput, UpdateTeamInput } from '@/core/types/team';

export const teamService = {
  async create(input: CreateTeamInput): Promise<Team> {
    try {
      const response = await apiClient.post<Team>('/api/v1/teams', input);
      return response.data;
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Team> {
    try {
      const response = await apiClient.get<Team>(`/api/v1/teams/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get team:', error);
      throw error;
    }
  },

  async list(page: number = 1, limit: number = 20): Promise<Team[]> {
    try {
      const response = await apiClient.get<Team[]>('/api/v1/teams', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to list teams:', error);
      throw error;
    }
  },

  async update(id: string, input: UpdateTeamInput): Promise<Team> {
    try {
      const response = await apiClient.put<Team>(`/api/v1/teams/${id}`, input);
      return response.data;
    } catch (error) {
      console.error('Failed to update team:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/teams/${id}`);
    } catch (error) {
      console.error('Failed to delete team:', error);
      throw error;
    }
  },
};
```

**Verification**:
- [ ] All CRUD operations defined
- [ ] Error handling implemented
- [ ] Types properly imported
- [ ] Matches server endpoints

#### Step 8: Client Page Component

**Todo**: Create page in `client/app/teams.tsx`

**Actions**:
```typescript
// File: client/app/teams.tsx
import { View, Text, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { teamService } from '@/core/api/services/team.service';
import { Button, Card } from '@/components/ui';
import type { Team } from '@/core/types/team';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamService.list();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    router.push('/teams/create');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading teams...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-600 mb-4">{error}</Text>
        <Button onPress={loadTeams}>Retry</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Teams</Text>
        <Button onPress={handleCreateTeam}>Create Team</Button>
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card className="mb-4 p-4">
            <Text className="text-lg font-semibold">{item.name}</Text>
            <Text className="text-gray-600 mt-2">{item.description}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-gray-500">No teams yet</Text>
          </View>
        }
      />
    </View>
  );
}
```

**Verification**:
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Proper styling with Tailwind
- [ ] Navigation implemented

#### Step 9: Testing

**Todo**: Verify feature works end-to-end

**Actions**:
1. Run `get_errors` to check for compilation errors
2. Test API endpoints with curl/Postman
3. Test UI in development mode
4. Verify multi-tenant isolation
5. Check database records

**Verification**:
- [ ] Server compiles without errors
- [ ] Client compiles without errors
- [ ] API endpoints accessible
- [ ] UI renders correctly
- [ ] Data persists correctly
- [ ] Multi-tenant isolation works

#### Step 10: Documentation

**Todo**: Update documentation

**Actions**:
1. Add feature to README
2. Update API documentation
3. Add to feature list in Quester.md
4. Document any configuration needed

---

## 3. Modify Existing Feature Workflow

**Use Case**: Updating an existing feature (e.g., adding a field to Users)

### Step-by-Step Process

#### Step 1: Identify Impact

**Todo**: Determine what files need modification

**Actions**:
1. Use `grep_search` to find all usages:
   ```
   grep_search: "User" in "server/internal/**"
   ```

2. Use `list_code_usages` for specific symbols:
   ```
   list_code_usages: symbolName="User", filePaths=["internal/models/user.go"]
   ```

3. Document affected files:
   - Model: `internal/models/user.go`
   - Repository: `internal/repositories/user_repository.go`
   - Service: `internal/services/user_service.go`
   - Controller: `internal/controllers/user_controller.go`
   - Types: `client/core/types/user.ts`
   - Service: `client/core/api/services/user.service.ts`

#### Step 2: Update Model

**Actions**:
```go
// Add new field to User struct
type User struct {
    // ... existing fields ...
    
    // New field
    PhoneNumber *string `gorm:"type:varchar(20)" json:"phone_number,omitempty" validate:"omitempty,e164"`
}
```

#### Step 3: Update Repository (if needed)

**Actions**:
Add query method if new field requires special handling

#### Step 4: Update Service

**Actions**:
Add validation logic for new field

#### Step 5: Update Controller

**Actions**:
Update request/response DTOs

#### Step 6: Update Client Types

**Actions**:
```typescript
export interface User {
  // ... existing fields ...
  phone_number?: string;
}
```

#### Step 7: Update UI

**Actions**:
Add input field in forms where needed

---

## 4. Add New Endpoint Workflow

**Use Case**: Adding a single endpoint to existing feature

### Step-by-Step Process

#### Step 1: Add Service Method

```go
func (s *UserService) GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error) {
    return s.repo.FindByEmail(ctx, tenantID, email)
}
```

#### Step 2: Add Controller Handler

```go
func (c *UserController) GetByEmail(ctx *fiber.Ctx) error {
    tenantID, _ := uuid.Parse(ctx.Locals("tenant_id").(string))
    email := ctx.Query("email")
    
    user, err := c.service.GetByEmail(ctx.Context(), tenantID, email)
    if err != nil {
        return responses.NotFound(ctx, "User not found")
    }
    
    return responses.Success(ctx, user)
}
```

#### Step 3: Register Route

```go
users.Get("/by-email", 
    middleware.FiberRateLimitByIP(100, 1*time.Minute),
    userController.GetByEmail,
)
```

#### Step 4: Add Client Function

```typescript
async getByEmail(email: string): Promise<User> {
  const response = await apiClient.get<User>(`/api/v1/users/by-email`, {
    params: { email },
  });
  return response.data;
}
```

---

## 5. Bug Fix Workflow

### Step-by-Step Process

#### Step 1: Reproduce Bug

**Actions**:
1. Get error message/stack trace
2. Identify affected file and function
3. Read surrounding code for context

#### Step 2: Locate Root Cause

**Actions**:
1. Add logging if needed
2. Check similar implementations
3. Verify data flow

#### Step 3: Implement Fix

**Actions**:
1. Make minimal changes
2. Add validation if missing
3. Improve error handling if needed

#### Step 4: Verify Fix

**Actions**:
1. Test the specific scenario
2. Check for side effects
3. Search for similar bugs

---

## 6. Refactoring Workflow

### Step-by-Step Process

#### Step 1: Understand Current Code

**Actions**:
1. Read entire file/module
2. Document dependencies
3. Identify pain points

#### Step 2: Plan Improvements

**Actions**:
1. Define goals
2. Ensure backward compatibility
3. Plan migration if needed

#### Step 3: Refactor Incrementally

**Actions**:
1. Extract functions
2. Improve naming
3. Add comments
4. Simplify logic

#### Step 4: Update All Usages

**Actions**:
1. Use `list_code_usages` tool
2. Update all references
3. Fix imports

---

## 7. Add UI Component Workflow

### Step-by-Step Process

#### Step 1: Define Component API

```typescript
interface TeamCardProps {
  team: Team;
  onPress?: () => void;
}
```

#### Step 2: Implement Component

```typescript
export function TeamCard({ team, onPress }: TeamCardProps) {
  return (
    <Card className="p-4" onPress={onPress}>
      <Text className="text-lg font-bold">{team.name}</Text>
      <Text className="text-gray-600">{team.description}</Text>
    </Card>
  );
}
```

#### Step 3: Export Component

```typescript
// components/pages/teams/index.ts
export * from './TeamCard';
```

#### Step 4: Use Component

```typescript
import { TeamCard } from '@/components/pages/teams';

<TeamCard team={team} onPress={() => router.push(`/teams/${team.id}`)} />
```

---

## 8. Add Database Migration Workflow

### Step-by-Step Process

#### Step 1: Create Migration File

```sql
-- migrations/018_add_phone_to_users.up.sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
```

#### Step 2: Create Rollback

```sql
-- migrations/018_add_phone_to_users.down.sql
DROP INDEX IF EXISTS idx_users_phone;
ALTER TABLE users DROP COLUMN phone_number;
```

#### Step 3: Update Model

Update GORM model to match schema

---

## 9. Add API Integration Workflow

### Step-by-Step Process

#### Step 1: Define Service Interface

```go
type EmailService interface {
    SendWelcomeEmail(ctx context.Context, to, name string) error
}
```

#### Step 2: Implement Service

```go
type sendgridEmailService struct {
    apiKey string
    client *sendgrid.Client
}
```

#### Step 3: Inject into Dependent Service

```go
type UserService struct {
    repo  UserRepository
    email EmailService
}
```

#### Step 4: Use in Business Logic

```go
func (s *UserService) CreateUser(...) error {
    // ... create user ...
    
    if err := s.email.SendWelcomeEmail(ctx, user.Email, user.Name); err != nil {
        log.Printf("Failed to send welcome email: %v", err)
    }
}
```

---

## 10. Deploy Feature Workflow

### Step-by-Step Process

#### Step 1: Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No compilation errors
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations ready

#### Step 2: Deploy Backend

```bash
# Build
cd server && go build -o bin/server cmd/server/main.go

# Run migrations
./bin/migrate up

# Start server
./bin/server
```

#### Step 3: Deploy Frontend

```bash
# Build
cd client && npm run build

# Deploy
expo publish # or platform-specific build
```

#### Step 4: Verify Deployment

- [ ] Health check endpoint responds
- [ ] API endpoints accessible
- [ ] UI loads correctly
- [ ] Database connection works
- [ ] Redis connection works

---

## Workflow Cheat Sheet

| Task | Primary Tool | Secondary Tools |
|------|--------------|-----------------|
| **Read existing code** | `read_file` | `grep_search`, `semantic_search` |
| **Find usages** | `list_code_usages` | `grep_search` |
| **Create file** | `create_file` | - |
| **Modify file** | `replace_string_in_file` | `multi_replace_string_in_file` |
| **Check errors** | `get_errors` | - |
| **Track progress** | `manage_todo_list` | - |
| **Run commands** | `run_in_terminal` | `get_terminal_output` |
| **Search workspace** | `semantic_search` | `file_search`, `grep_search` |

---

> **Remember**: Always follow workflows sequentially. Mark tasks as complete immediately after finishing. Verify your work at each step.
