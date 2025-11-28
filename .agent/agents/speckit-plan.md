---
description: Generate technical implementation plans from feature specifications
type: speckit-agent
category: planning
---

# Spec Kit: Plan Agent

## Purpose

Execute implementation planning workflow to generate comprehensive technical design artifacts from feature specifications. Transforms what users need into how to build it.

## When to Use

- After feature specification is complete
- Converting requirements into technical design
- Defining architecture and tech stack
- Creating data models and API contracts

## Prerequisites

- Completed `spec.md` in feature directory
- Constitution reviewed for compliance
- Technical context understood

## Outputs

- `plan.md` - Technical implementation plan
- `data-model.md` - Entity definitions and relationships
- `contracts/` - API/endpoint specifications
- `research.md` - Technology decisions and rationale
- `quickstart.md` - Test scenarios and setup

## Process Overview

### Phase 0: Research & Outline

**Extract unknowns** from technical context:
- For each uncertainty → research task
- For each dependency → best practices review
- For each integration → pattern analysis

**Consolidate findings** in `research.md`:
- Decision made
- Rationale for decision
- Alternatives considered
- Why alternatives were rejected

### Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete, all clarifications resolved.

**Data Model** (`data-model.md`):
- Extract entities from functional requirements
- Define fields, types, relationships
- Map validation rules from requirements
- Document state transitions if applicable

**API Contracts** (`contracts/`):
- Map each user action → endpoint
- Use REST/GraphQL standard patterns
- Generate OpenAPI or GraphQL schemas
- Include request/response examples

**Quickstart** (`quickstart.md`):
- Setup instructions
- Test scenarios mapped to user stories
- Verification commands

### Phase 2: Constitutional Compliance

**Constitution Check**:
- Multi-tenancy requirements enforced
- Security standards applied
- Type safety requirements documented
- Error handling strategy defined

**Quality Gates**:
- All functional requirements addressed
- Non-functional requirements mapped to implementation
- Technology choices justified
- Exit strategy for new dependencies

## Planning Template Structure

### Technical Context

- **Stack**: Languages, frameworks, libraries
- **Dependencies**: External services, packages
- **Configuration**: Environment variables, settings
- **Constraints**: Performance, scalability, security

Mark unknowns as `[NEEDS CLARIFICATION]` for Phase 0 resolution.

### Constitution Check

Reference `.agent/rules/constitution.md`:
- Multi-tenancy enforcement strategy
- Security controls (auth, validation, encryption)
- Type safety approach
- Error handling patterns
- Context propagation (Go) / State management (TS)
- Observability (logging, metrics, monitoring)

### Architecture Decisions

For each major technical choice:
- **Decision**: What was chosen
- **Rationale**: Why this choice
- **Alternatives**: What else was considered
- **Trade-offs**: Benefits vs. costs
- **Exit strategy**: How to replace if needed

### Implementation Phases

Break implementation into logical phases:
- **Phase 1**: Foundation (models, core utilities)
- **Phase 2**: Business logic (services, repositories)
- **Phase 3**: API layer (controllers, routes)
- **Phase 4**: Client integration (UI components, state)
- **Phase 5**: Testing & verification

## Quester-Specific Guidelines

### Multi-Tenancy Planning

**Every data entity must**:
- Include `TenantID uuid.UUID` field
- Have `tenant_id` in all indexes
- Filter all queries by `TenantID`

**Every API endpoint must**:
- Extract `tenantID` from JWT
- Pass to repository layer
- Validate tenant access

### Security Planning

- Password hashing: bcrypt cost ≥12
- JWT validation on protected endpoints
- Input validation using `go-playground/validator`
- Rate limiting configuration
- CORS settings for known origins

### Database Planning

**Model Definition**:
- GORM struct with tags
- `TableName()` method
- `BeforeCreate()` lifecycle hooks
- Proper indexes (including `tenant_id`)

**Repository Pattern**:
- Interface definition (Create, FindByID, Update, Delete)
- Implementation with `*gorm.DB` dependency
- Context propagation
- Error wrapping

**Service Layer**:
- Business logic isolation
- Input validation
- Error handling
- Transaction management

### API Planning

**Controller Pattern**:
- Extract JWT claims (tenant_id, user_id)
- Parse and validate request body
- Call service layer
- Return standardized response

**Route Registration**:
- Group by feature under `/api/v1/[feature]`
- Apply `FiberAuthMiddleware`
- Add rate limiting
- Document with OpenAPI

### Client Planning

**Type Definitions** (`client/core/types/[feature].ts`):
- Match server models exactly
- Export interfaces
- Define Input/Output types

**API Service** (`client/core/api/services/[feature].service.ts`):
- Import `apiClient`
- Methods: create, getById, list, update, delete
- Error handling

**UI Components** (`client/components/[feature]/`):
- React/React Native components
- Loading and error states
- Tailwind styling
- Accessibility

## Next Steps

After planning is complete:
- Proceed to `/speckit-tasks` for task breakdown
- Or refine plan based on feedback

## Integration Points

- Follows Quester AI Workflows for implementation patterns
- Adheres to Constitution for quality gates
- References Quester AI Rules for coding standards

## References

- Template: `.agent/templates/plan-template.md`
- Spec Template: `.agent/templates/spec-template.md`
- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
