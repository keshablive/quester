---
description: Quester Platform AI Agent Workflows
---

# Quester Platform - AI Agent Workflows

> **Step-by-Step Automation Workflows for AI Agents**

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
1. ✅ Create a todo list using `manage_todo_list`
2. ✅ Read relevant documentation
3. ✅ Search for similar implementations
4. ✅ Verify file paths
5. ✅ Understand requirements

### 1.2 Workflow Selection Guide

| Task Type | Workflow | Complexity | Steps |
|-----------|----------|------------|-------|
| **New Feature** | #2 | High | 10-15 |
| **Modify Feature** | #3 | Medium | 5-8 |
| **Add Endpoint** | #4 | Low | 3-5 |
| **Fix Bug** | #5 | Low-Medium | 4-6 |
| **Refactor** | #6 | Medium | 5-7 |
| **UI Component** | #7 | Low | 3-4 |
| **DB Change** | #8 | Medium | 4-5 |
| **API Integration** | #9 | Medium | 6-8 |

### 1.3 Rules

- Mark task as `in-progress` when starting
- Complete ONE task fully before moving to next
- Mark task as `completed` IMMEDIATELY after finishing
- Run `get_errors` after code generation
- Verify patterns match existing code

---

## 2. New Feature Workflow (End-to-End)

**Use Case**: New feature from scratch.

### Prerequisites
- Requirements defined, DB schema designed, API planned, UI mockups ready.

### Steps

#### Step 1: Database Model
**Todo**: Create GORM model in `internal/models/[feature].go`.
**Actions**:
1. Read `internal/models/user.go` for patterns.
2. Create model with `ID`, `TenantID` (MANDATORY), fields, timestamps, `TableName()`, and `BeforeCreate()`.
3. Update `internal/migrations/migrations.go` to include model.

#### Step 2: Repository
**Todo**: Create repo in `internal/repositories/[feature]_repository.go`.
**Actions**:
1. Read `internal/repositories/user_repository.go`.
2. Define `Repository` interface (Create, FindByID, FindByTenant, Update, Delete).
3. Implement struct with `*gorm.DB`.
4. Ensure all queries filter by `TenantID`.

#### Step 3: Service
**Todo**: Create service in `internal/services/[feature]_service.go`.
**Actions**:
1. Read `internal/services/quest_service.go`.
2. Create `Service` struct with repo dependency.
3. Implement business logic, validation, and error handling.

#### Step 4: Controller
**Todo**: Create controller in `internal/controllers/[feature]_controller.go`.
**Actions**:
1. Read `internal/controllers/quest_controller.go`.
2. Create controller with service dependency.
3. Implement handlers: Extract `tenant_id`/`user_id` from JWT, parse body, call service, return standardized response.

#### Step 5: Route Registration
**Todo**: Register routes in `internal/routes/routes.go`.
**Actions**:
1. Initialize repo, service, and controller in `Setup()`.
2. Register routes under `/api/v1/[feature]`.
3. Apply `FiberAuthMiddleware` and rate limiting.

#### Step 6: Client Types
**Todo**: Create TS types in `client/core/types/[feature].ts`.
**Actions**:
1. Define interfaces matching server model.
2. Define Input/Output types.

#### Step 7: Client API Service
**Todo**: Create service in `client/core/api/services/[feature].service.ts`.
**Actions**:
1. Import `apiClient`.
2. Implement methods: `create`, `getById`, `list`, `update`, `delete`.
3. Handle errors.

#### Step 8: Client Page Component
**Todo**: Create page in `client/app/[feature].tsx`.
**Actions**:
1. Create React Native component.
2. Use `useEffect` to load data.
3. Handle loading, error, and empty states.
4. Use UI components (`Button`, `Card`).

#### Step 9: Testing
**Todo**: Verify end-to-end.
**Actions**:
1. `get_errors`.
2. Test API with curl/Postman.
3. Test UI.
4. Verify multi-tenant isolation.

#### Step 10: Documentation
**Todo**: Update docs.
**Actions**: README, API docs, Quester.md.

---

## 3. Modify Existing Feature Workflow

**Use Case**: Updating existing feature.

### Steps
1. **Identify Impact**: Use `grep_search` and `list_code_usages` to find affected files (Model, Repo, Service, Controller, Types, UI).
2. **Update Model**: Add fields to struct with tags.
3. **Update Repository**: Add query methods if needed.
4. **Update Service**: Add validation logic.
5. **Update Controller**: Update DTOs.
6. **Update Client Types**: Update interfaces.
7. **Update UI**: Add input fields/display.

---

## 4. Add New Endpoint Workflow

**Use Case**: Adding single endpoint.

### Steps
1. **Add Service Method**: Add method to Service interface and implementation.
2. **Add Controller Handler**: Extract params, call service, return response.
3. **Register Route**: Add to `routes.go` with middleware.
4. **Add Client Function**: Add method to client service.

---

## 5. Bug Fix Workflow

### Steps
1. **Reproduce Bug**: Get stack trace, identify file, read context.
2. **Locate Root Cause**: Add logging, check data flow.
3. **Implement Fix**: Minimal changes, add validation/error handling.
4. **Verify Fix**: Test scenario, check side effects.

---

## 6. Refactoring Workflow

### Steps
1. **Understand Code**: Read file, document dependencies.
2. **Plan Improvements**: Define goals, ensure compatibility.
3. **Refactor Incrementally**: Extract functions, improve naming, simplify logic.
4. **Update Usages**: Use `list_code_usages`, update references, fix imports.

---

## 7. Add UI Component Workflow

### Steps
1. **Define API**: Define Props interface.
2. **Implement**: Create functional component with styles.
3. **Export**: Add to `index.ts`.
4. **Use**: Import and use in pages.

---

## 8. Add Database Migration Workflow

### Steps
1. **Create Migration**: `.up.sql` (ALTER TABLE, CREATE INDEX).
2. **Create Rollback**: `.down.sql` (DROP INDEX, ALTER TABLE).
3. **Update Model**: Update GORM struct.

---

## 9. Add API Integration Workflow

### Steps
1. **Define Interface**: Create Service interface.
2. **Implement**: Create struct with client.
3. **Inject**: Add to dependent service.
4. **Use**: Call from business logic.

---

## 10. Deploy Feature Workflow

### Steps
1. **Checklist**: Tests, docs, env vars, migrations.
2. **Deploy Backend**: Build, migrate, start.
3. **Deploy Frontend**: Build, publish/deploy.
4. **Verify**: Health check, API, UI, DB, Redis.

---

## Workflow Cheat Sheet

| Task | Primary Tool | Secondary Tools |
|------|--------------|-----------------|
| **Read code** | `read_file` | `grep_search` |
| **Find usages** | `list_code_usages` | `grep_search` |
| **Create file** | `create_file` | - |
| **Modify file** | `replace_string_in_file` | `multi_replace_string_in_file` |
| **Check errors** | `get_errors` | - |
| **Track** | `manage_todo_list` | - |
