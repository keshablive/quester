# Project Context

**Last Updated**: 2025-11-24

## Current State

The Quester Platform is a multi-tenant enterprise platform for gamified learning and quest management. It is currently in active development with the following components:

### Server (Go)
- Fiber-based REST API
- PostgreSQL with GORM
- JWT authentication
- Multi-tenant architecture
- Redis for caching

### Client (TypeScript)
- React Native (mobile and web)
- Tailwind CSS for styling
- Context API for state management
- API client with axios

## Active Features

- User authentication and authorization
- Quest creation and management
- Multi-tenant data isolation
- Role-based access control

## Recent Decisions

### 2025-11-24: GitHub Spec Kit Integration

**Decision**: Integrated spec kit from `.github` and `.specify` into `.agent` directory

**Rationale**: 
- Enables structured specification-driven development
- Provides quality gates and constitutional compliance
- Supports MVP-first incremental delivery
- Aligns with Quester's multi-tenant architecture requirements

**Components Added**:
- 8 agent files for specifications, planning, tasks, analysis
- Workflow files for complete feature lifecycle
- Templates for specs, plans, tasks, checklists
- Constitution for compliance validation
- Scripts reference for bash script adaptation

## Architecture Patterns

### Multi-Tenancy
- Every model includes `TenantID uuid.UUID`
- Every query filters by `TenantID`
- Every controller extracts `tenantID` from JWT
- Every index includes `tenant_id`

### Layered Architecture
```
Controllers → Services → Repositories → Database
     ↓           ↓            ↓
  HTTP       Business      Data
 Handling     Logic       Access
```

### Error Handling
- Go: Return errors, wrap with context
- TypeScript: Try-catch for async, user-friendly messages

### Type Safety
- No `any` in TypeScript
- Explicit types in Go
- Interfaces for polymorphism

## Technology Stack

### Server
- Language: Go 1.21+
- Framework: Fiber v2
- Database: PostgreSQL 15+
- ORM: GORM v2
- Cache: Redis 7+
- Auth: JWT (RS256)

### Client
- Language: TypeScript 5+
- Framework: React Native
- Styling: Tailwind CSS
- State: Context API
- HTTP: Axios

### DevOps
- Containerization: Docker
- Orchestration: Docker Compose
- CI/CD: GitHub Actions (planned)

## Key Constraints

1. **Multi-tenancy is non-negotiable** - All data must be tenant-isolated
2. **Security first** - No shortcuts on authentication, validation, or encryption
3. **Type safety** - No `any`, all types explicit
4. **Error handling** - All errors handled explicitly
5. **Pattern consistency** - Follow existing Quester patterns

## Current Challenges

1. Maintaining multi-tenant isolation across all features
2. Consistent error handling patterns
3. Balancing feature velocity with quality
4. Documentation keeping pace with development

## Next Priorities

1. Implement remaining core features per roadmap
2. Expand test coverage (target >70%)
3. Performance optimization and caching strategy
4. Mobile app polish and UX improvements

## Configuration

Environment variables managed via `.env`:
- Database credentials
- JWT secrets
- Redis connection
- API keys for external services

## References

- Constitution: `.agent/rules/constitution.md`
- Coding Rules: `.agent/rules/quester-ai-rules.md`
- Workflows: `.agent/workflows/quester-ai-workflows.md`
- Spec Kit: `.agent/agents/speckit-*.md`
- Main README: `Quester.md`
