---
trigger: always_on
---

---
description: Quester Platform AI Agent Rules & Standards
---

# Quester Platform - AI Agent Rules & Standards

> **Comprehensive Rule Book for AI Code Generation**

## 1. CRITICAL RULES - NEVER VIOLATE

### 1.1 Multi-Tenancy (MANDATORY)
**Rule**: Every DB query MUST filter by `TenantID`.
**Enforcement**:
- GORM models MUST include `TenantID uuid.UUID`.
- Queries MUST include `Where("tenant_id = ?", tenantID)`.
- Indexes MUST include `tenant_id`.
- Extract `tenantID` from JWT in controllers.

### 1.2 Security First
- NEVER log sensitive data (passwords, tokens).
- ALWAYS validate/sanitize inputs.
- ALWAYS use parameterized queries.
- ALWAYS hash passwords (bcrypt cost 12+).
- ALWAYS use HTTPS and secure cookies.

### 1.3 Type Safety
- NO `any` type in TS (use `unknown` + type-guard).
- NO untyped params in Go.
- ALWAYS define explicit return types.
- ALWAYS use interfaces for polymorphism.

### 1.4 Error Handling
**Go**:
- ALWAYS return errors.
- NEVER use `panic()` for expected errors.
- Wrap errors: `fmt.Errorf("context: %w", err)`.

**TypeScript**:
- ALWAYS use try-catch for async.
- ALWAYS provide user-friendly error messages.
- Log full error details; don't expose internal errors.

### 1.5 Context Propagation (Go)
**Rule**: ALWAYS pass `context.Context` as first param of public functions. Enables cancellation/timeouts.

### 1.6 Consistency
**Rule**: Follow existing patterns.
1. Search for similar implementations.
2. Read existing files.
3. Match naming/structure/style.
4. Use existing utilities.

---

## 2. Code Generation Rules

### 2.1 Pre-Generation Checklist
**BEFORE generating code**:
1. ✅ Read related files.
2. ✅ Check similar implementations.
3. ✅ Verify paths/structure.
4. ✅ Understand requirements.
5. ✅ Plan approach.
6. ✅ Identify modified files.

### 2.2 Code Quality Standards
- ✅ Compile without errors.
- ✅ Follow style/formatting.
- ✅ Proper error handling/validation.
- ✅ Comments for complex logic.
- ✅ Use existing utilities.
- ✅ No TODOs unless requested.

### 2.3 Documentation Standards
**Go**: Doc comments for functions (purpose, params, returns).
**TS**: JSDoc for functions (description, @param, @returns, @throws).

---

## 3. Server (Go) Coding Standards

### 3.1 Naming Conventions
- **Exported**: PascalCase (`UserService`).
- **Unexported**: camelCase (`userRepository`).
- **Constants**: PascalCase (`StatusActive`).
- **Interfaces**: Noun/Noun+er (`UserRepository`).
- **Files**: snake_case (`user_service.go`).

### 3.2 Package Organization
Group imports: Std lib, External, Internal.

### 3.3 Function Design
- Single responsibility.
- Short (< 50 lines).
- Early returns for errors.
- Inject dependencies (no globals).

### 3.4 Database Operations
- ALWAYS use transactions for multi-table ops.
- ALWAYS filter by `TenantID`.
- Use `WithContext(ctx)`.
- Handle `gorm.ErrRecordNotFound`.

### 3.5 Configuration
- Load from env via `godotenv`.
- Validate on startup.
- Use typed config structs.

---

## 4. Client (TypeScript) Coding Standards

### 4.1 Naming Conventions
- **Components**: PascalCase (`UserCard`).
- **Functions/Vars**: camelCase (`fetchUsers`).
- **Types**: PascalCase (`User`).
- **Constants**: UPPER_SNAKE_CASE.
- **Files**: PascalCase (components), camelCase (utils).

### 4.2 Component Structure
- Imports (React, UI, Services, Types).
- Interface for Props.
- Component function.
- Hooks (State, Effect).
- Render (Loading, Error, Content).

### 4.3 Type Definitions
- Interface for props/objects.
- Match server response exactly.
- Export public types.

### 4.4 API Service Pattern
- Import `apiClient`.
- Methods: `getById`, `create`, `update`, `delete`, `list`.
- Return `response.data`.

### 4.5 State Management
- Local state for component data.
- Context for global state (Auth, Theme).
- Avoid prop drilling (use Context).

### 4.6 Styling
- Use Tailwind (`className`).
- Avoid inline styles.
- Use design system tokens.

---

## 5. Testing Standards

### 5.1 Unit Test Rules (Go)
- Arrange, Act, Assert.
- Mock dependencies.
- Test success and error cases.

### 5.2 Component Test Rules (TS)
- Render component.
- Mock API calls.
- Assert UI elements/text.

---

## 6. Security Checklist
- [ ] No sensitive logs.
- [ ] Inputs validated.
- [ ] No SQLi (GORM).
- [ ] No XSS (Sanitize).
- [ ] CSRF tokens.
- [ ] Auth required.
- [ ] Rate limiting.
- [ ] Passwords hashed.
- [ ] Secrets in env.
- [ ] HTTPS.

---

## 7. Performance Rules

### 7.1 Database
- [ ] Indexes (inc. `tenant_id`).
- [ ] Select specific columns.
- [ ] Pagination.
- [ ] Connection pooling.
- [ ] No N+1 queries.

### 7.2 API
- [ ] Rate limiting.
- [ ] Caching.
- [ ] Gzip.
- [ ] Minimal response size.

---

## 8. Common Anti-Patterns

### 8.1 Server
❌ Global state variables.
❌ Ignoring errors (`_`).
❌ Missing `context.Context`.
❌ Hardcoded values.

### 8.2 Client
❌ `any` type.
❌ Missing loading/error states.
❌ Prop drilling.
❌ Inline styles.

---

> **Note**: These rules are mandatory. Violations lead to incorrect/insecure code.
