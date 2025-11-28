<!--
SYNC IMPACT REPORT - Constitution v1.0.0
========================================
Version Change: INITIAL → 1.0.0
Type: MAJOR - Initial constitution establishment

Modified Principles: None (initial creation)
Added Sections:
  - Core Principles (7 principles established)
  - Security & Compliance Requirements
  - Development Standards & Workflow
  - Governance

Templates Status:
  ✅ plan-template.md - Review recommended for principle alignment
  ✅ spec-template.md - Review recommended for requirement alignment
  ✅ tasks-template.md - Review recommended for task categorization alignment
  ✅ agent-file-template.md - Exists and should align with memory guidelines
  ✅ checklist-template.md - Exists for quality validation

Follow-up Actions:
  - Validate all templates align with constitutional principles
  - Ensure AGENT.md is populated with project memory
  - Review Quester-AI-Rules.md and Quester-AI-Workflows.md for compliance
  - Establish regular constitution compliance audits

Rationale for v1.0.0:
  - First formal constitution for Quester Platform
  - Establishes foundational governance for multi-tenant enterprise platform
  - Codifies existing best practices from Quester-AI-Rules.md
  - Sets framework for AI agent development workflows
-->

# Quester Platform Constitution

## Core Principles

### I. Multi-Tenancy (NON-NEGOTIABLE)

**MUST enforce data isolation across all system layers.**

- Every database query MUST filter by `TenantID` with no exceptions
- All GORM models MUST include `TenantID uuid.UUID` field with proper indexing
- All repository methods MUST accept `tenantID` as a required parameter
- All controllers MUST extract `tenantID` from authenticated JWT claims
- Database indexes MUST include `tenant_id` for query performance
- Cross-tenant data access is strictly forbidden; violations are security incidents

**Rationale**: Quester is an enterprise multi-tenant platform. Data isolation is not optional—it's a contractual and legal requirement for protecting customer data. A single breach of tenant isolation compromises trust and violates data protection regulations (GDPR, CCPA).

### II. Security First (NON-NEGOTIABLE)

**MUST prioritize security in every implementation decision.**

- NEVER log sensitive data (passwords, tokens, API keys, credit cards, PII)
- ALWAYS validate and sanitize all user inputs using `go-playground/validator`
- ALWAYS use parameterized queries (GORM enforces this by default)
- NEVER trust client-provided data; validate at API boundary
- ALWAYS hash passwords using bcrypt with cost factor ≥12
- ALWAYS use HTTPS in production environments
- ALWAYS set `secure`, `httpOnly`, and `SameSite` flags on authentication cookies
- JWT tokens MUST be validated on every protected endpoint
- Implement token blacklisting via Redis for logout/revocation
- Rate limiting MUST be enabled on all public-facing endpoints

**Rationale**: Security breaches destroy platforms. Quester handles user education data, financial transactions, and personal information. Security must be embedded in every layer, not added as an afterthought.

### III. Type Safety (MANDATORY)

**MUST use explicit typing throughout the codebase.**

- **TypeScript**: NO `any` type (use `unknown` with type guards if absolutely necessary)
- **TypeScript**: ALWAYS define explicit return types for functions
- **TypeScript**: ALWAYS define interfaces for data structures
- **Go**: NO untyped function parameters (`interface{}` only when justified)
- **Go**: ALWAYS use concrete types or interfaces for parameters
- **Go**: ALWAYS define explicit return types
- ALWAYS validate types at runtime for external data sources (API requests, database)
- Type mismatches MUST result in compilation errors, not runtime failures

**Rationale**: Type safety eliminates entire classes of bugs before runtime. In a complex platform like Quester with 15+ feature domains, type errors compound exponentially. Explicit typing serves as living documentation and enables confident refactoring.

### IV. Error Handling (MANDATORY)

**MUST handle errors explicitly and comprehensively.**

**Go Requirements**:

- ALWAYS return errors from functions that can fail
- NEVER use `panic()` for expected errors (only for programmer errors)
- ALWAYS check returned errors immediately
- Use custom error types for domain-specific errors
- Wrap errors with context: `fmt.Errorf("operation failed: %w", err)`
- Log errors at appropriate levels (debug, info, warn, error, fatal)

**TypeScript Requirements**:

- ALWAYS use try-catch for async operations
- ALWAYS provide user-friendly error messages to clients
- NEVER expose internal error details to end users
- Log full error context for debugging (excluding sensitive data)
- Use typed error responses for API communication

**Rationale**: Silent failures and ignored errors create debugging nightmares. Explicit error handling makes failure modes visible, debuggable, and recoverable. In a system with payments, education data, and real-time streaming, error transparency is critical.

### V. Context Propagation (Go) & State Management (TypeScript)

**MUST propagate execution context throughout the application.**

**Go Requirements**:

- ALWAYS pass `context.Context` as the first parameter of public functions
- Use context for cancellation, timeouts, and request-scoped values
- Extract tenant information, user identity, and request metadata from context
- Propagate context through repository → service → controller layers
- Respect context cancellation in long-running operations

**TypeScript Requirements**:

- Use React Context for global state (auth, theme, tenant)
- Avoid prop drilling; use context providers strategically
- Keep context minimal; don't abuse global state
- Use local state for component-specific data

**Rationale**: Context enables graceful cancellation, timeout enforcement, and request tracing. In a multi-tenant system, context carries critical identity and authorization information. Proper context management prevents orphaned operations and enables observability.

### VI. Consistency & Pattern Adherence

**MUST follow established patterns; innovation requires justification.**

- **Before Writing Code**: Search for similar implementations in the codebase
- **Read First**: Examine existing files in the same package/directory
- **Match Conventions**: Follow naming, file structure, and code style of existing code
- **Reuse Utilities**: Use existing utility functions instead of creating duplicates
- **Repository Pattern**: All database access through repository layer
- **Service Layer**: Business logic isolated in service layer
- **Controller Layer**: HTTP handling and response formatting in controllers
- **File Naming**: snake_case for Go files, PascalCase for TypeScript components
- **Import Organization**: Standard library → Third-party → Internal packages

**Rationale**: Consistency reduces cognitive load and maintenance burden. With multiple AI agents and human developers working on Quester, consistent patterns ensure predictability. Quester-AI-Rules.md and Quester-AI-Workflows.md codify these patterns.

### VII. Observability & Debugging

**MUST instrument code for production debugging and monitoring.**

- Structured logging using appropriate levels (debug, info, warn, error)
- Include correlation IDs in logs for request tracing
- Expose Prometheus metrics for key operations (latency, error rates, throughput)
- Use Sentry for error tracking and alerting
- Include sufficient context in logs for root cause analysis (excluding sensitive data)
- Monitor critical paths: authentication, payments, quest completion, streaming
- Set up Grafana dashboards for real-time system health monitoring
- Implement health check endpoints for all services

**Rationale**: Production systems fail. When they do, observability determines mean-time-to-recovery. Quester's complexity (15+ features, multi-tenant, real-time streaming) requires comprehensive observability to diagnose issues before they impact users.

## Security & Compliance Requirements

### Data Protection

- All personal identifiable information (PII) MUST be encrypted at rest
- PII MUST be encrypted in transit (TLS 1.2+)
- Implement data retention policies per feature domain
- Support GDPR/CCPA data export and deletion requests
- 2FA secrets MUST be encrypted at rest using secure key management
- Payment information MUST comply with PCI-DSS standards
- Never store plaintext passwords or payment card data

### Authentication & Authorization

- JWT-based authentication with RS256 signing
- Refresh token rotation with secure storage
- Token expiry: Access tokens (15min), Refresh tokens (7 days)
- Implement token blacklisting for logout and forced expiration
- Role-based access control (Admin, Moderator, Instructor, Player, Partner)
- OAuth integration with Google, Facebook, Apple
- 2FA (TOTP) support for sensitive operations

### API Security

- Rate limiting on all public endpoints (100 req/min per IP by default)
- CORS configuration restricted to known origins
- Input validation using `go-playground/validator/v10`
- SQL injection protection via GORM parameterized queries
- XSS prevention using `microcosm-cc/bluemonday` for user content
- CSRF protection for state-changing operations

## Development Standards & Workflow

### Code Quality Standards

**All code MUST**:

- Compile without errors before submission
- Pass all linting checks (Go: `golangci-lint`, TypeScript: `eslint`)
- Include error handling for all fallible operations
- Include input validation for all public functions
- Have descriptive variable and function names
- Follow DRY principle; extract duplicated logic
- Be self-documenting; comments for complex logic only

### Documentation Requirements

**Go Functions**:

```go
// CreateUser creates a new user account with the given details.
// It validates the input, hashes the password, and stores the user in the database.
// Returns the created user and an error if validation or creation fails.
func (s *UserService) CreateUser(ctx context.Context, input *CreateUserInput) (*models.User, error)
```

**TypeScript Functions**:

```typescript
/**
 * Creates a new user account
 * @param input - User registration details
 * @returns Promise resolving to created user
 * @throws ValidationError if input is invalid
 */
async function createUser(input: CreateUserInput): Promise<User>
```

### Testing Requirements

- Unit tests for business logic in service layer
- Integration tests for API endpoints
- Test coverage target: >70% for critical paths
- Mock external dependencies (S3, Stripe, Firebase)
- Test multi-tenant isolation in all repository tests
- Test error handling paths, not just happy paths

### AI Agent Development Workflow

AI agents working on Quester MUST follow this workflow:

1. **Analyze**: Understand the user's request fully
2. **Research**: Read Quester.md, Quester-AI-Rules.md, and related code files
3. **Plan**: Create todo list using `manage_todo_list` for multi-step tasks
4. **Implement**: Follow patterns from Quester-AI-Workflows.md
5. **Verify**: Check compliance with this constitution and Quester-AI-Rules.md
6. **Test**: Run `get_errors` tool to verify compilation
7. **Document**: Update AGENT.md with learnings and patterns

**Reference Documents**:

- **Quester.md**: Project overview, architecture, tech stack
- **Quester-AI-Rules.md**: Comprehensive coding standards and anti-patterns
- **Quester-AI-Workflows.md**: Step-by-step workflows for common tasks
- **AGENT.md**: AI agent memory and learned patterns

### Version Control Standards

- Commit messages: `<type>(<scope>): <description>`
  - Types: feat, fix, docs, refactor, test, chore
  - Example: `feat(quests): add daily quest recurrence support`
- Branch naming: `<type>/<short-description>`
  - Example: `feat/daily-quests`, `fix/tenant-isolation-bug`
- Pull requests MUST include description and testing notes
- All PRs MUST pass CI checks before merge

## Governance

### Constitutional Authority

This constitution supersedes all other development practices and guidelines. When conflicts arise between this constitution and other documents (README, inline comments, external documentation), the constitution takes precedence.

### Amendment Process

**Constitutional amendments require**:

1. Written proposal documenting the change rationale
2. Review by project maintainers or lead developers
3. Assessment of impact on existing codebase
4. Migration plan for non-compliant code (if applicable)
5. Update to AGENT.md and related documentation
6. Version bump according to semantic versioning:
   - **MAJOR**: Backward-incompatible principle removals or redefinitions
   - **MINOR**: New principles added or material expansions
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance & Enforcement

**All code contributions MUST**:

- Verify compliance with constitutional principles during code review
- Justify any deviations with documented rationale
- Update patterns in Quester-AI-Rules.md if new patterns emerge
- Update workflows in Quester-AI-Workflows.md if new procedures established

**AI Agents MUST**:

- Consult AGENT.md for project memory and learned patterns
- Reference Quester-AI-Rules.md for implementation standards
- Follow Quester-AI-Workflows.md for structured development
- Update AGENT.md after completing significant features

### Complexity Justification

Any introduction of new dependencies, architectural patterns, or abstraction layers MUST be justified with:

- Problem statement: What existing solution is inadequate?
- Alternatives considered: Why were simpler approaches rejected?
- Maintenance cost: What ongoing burden does this add?
- Exit strategy: How can this be removed or replaced if needed?

### Runtime Development Guidance

For day-to-day development guidance, AI agents should reference:

- **AGENT.md**: Cumulative project memory and learned patterns
- **Quester-AI-Rules.md**: Detailed coding rules and examples
- **Quester-AI-Workflows.md**: Procedural workflows for common tasks

These documents provide operational detail beyond constitutional principles.

---

**Version**: 1.0.0 | **Ratified**: 2025-11-23 | **Last Amended**: 2025-11-23
