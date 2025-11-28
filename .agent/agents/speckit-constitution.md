---
description: Validate constitutional compliance across specifications and plans
type: speckit-agent
category: compliance
---

# Spec Kit: Constitution Agent

## Purpose

Validate that specifications, plans, and tasks comply with the Quester Platform Constitution. Ensures all features adhere to core principles before implementation.

## When to Use

- Before starting implementation
- During specification review
- When adding new features
- During architecture decisions

## Prerequisites

- Quester Platform Constitution (`.agent/rules/constitution.md`)
- Feature artifacts to validate (spec.md, plan.md, tasks.md)

## Outputs

- Constitutional compliance report
- Violation details and severity
- Remediation recommendations
- Compliance checklist

## Core Principles (Constitution)

### I. Multi-Tenancy (NON-NEGOTIABLE)

**Validation checks**:
- [ ] All models include `TenantID uuid.UUID`
- [ ] All queries filter by `TenantID`
- [ ] All indexes include `tenant_id`
- [ ] Controllers extract `tenantID` from JWT
- [ ] No cross-tenant data access

**In spec.md**: Requirements must specify tenant isolation
**In plan.md**: Data model must include TenantID on ALL entities
**In tasks.md**: Repository tasks must mention TenantID filtering

### II. Security First (NON-NEGOTIABLE)

**Validation checks**:
- [ ] No sensitive data logging mentioned
- [ ] Input validation strategy defined
- [ ] Parameterized queries used (GORM default)
- [ ] Password hashing specified (bcrypt ≥12)
- [ ] HTTPS enforced in production
- [ ] JWT validation on protected endpoints
- [ ] Rate limiting configured

**In spec.md**: Security requirements explicit
**In plan.md**: Authentication/authorization strategy defined
**In tasks.md**: Security tasks present (validation, auth, rate limiting)

### III. Type Safety (MANDATORY)

**Validation checks**:
- [ ] No `any` type in TypeScript
- [ ] Explicit return types defined
- [ ] Interfaces used for data structures
- [ ] Go functions have explicit types

**In spec.md**: N/A (implementation detail)
**In plan.md**: Type safety approach documented
**In tasks.md**: Type definition tasks present

### IV. Error Handling (MANDATORY)

**Validation checks**:
- [ ] Error handling strategy defined
- [ ] Go: Errors returned from fallible functions
- [ ] TypeScript: Try-catch for async operations
- [ ] User-friendly error messages planned

**In spec.md**: Error scenarios in acceptance criteria
**In plan.md**: Error handling patterns documented
**In tasks.md**: Error handling implementation tasks

### V. Context Propagation (Go) / State Management (TS)

**Validation checks**:
- [ ] Go: `context.Context` passed to public functions
- [ ] Tenant/user info in context
- [ ] TypeScript: React Context for global state

**In plan.md**: Context propagation strategy
**In tasks.md**: Context setup tasks

### VI. Consistency & Pattern Adherence

**Validation checks**:
- [ ] Follows existing Quester patterns
- [ ] Repository → Service → Controller layers
- [ ] File naming conventions followed
- [ ] Import organization standard

**In plan.md**: Architecture follows Quester patterns
**In tasks.md**: Tasks reference existing code for patterns

### VII. Observability & Debugging

**Validation checks**:
- [ ] Structured logging planned
- [ ] Correlation IDs for request tracing
- [ ] Health check endpoints
- [ ] Error tracking (Sentry)

**In plan.md**: Observability strategy defined
**In tasks.md**: Logging and monitoring tasks

## Validation Process

### 1. Load Constitution

Read `.agent/rules/constitution.md` and extract:
- Core principles (I-VII)
- MUST vs SHOULD requirements
- Security checklist
- Performance requirements

### 2. Load Feature Artifacts

Read available artifacts:
- `spec.md` - Requirements and user stories
- `plan.md` - Technical design
- `tasks.md` - Implementation tasks

### 3. Run Compliance Checks

For each principle:

**Check spec.md**:
- Are requirements aligned with principle?
- Are security/compliance needs stated?
- Are edge cases covering constitutional concerns?

**Check plan.md**:
- Is technical design compliant?
- Are patterns following constitution?
- Are quality gates addressed?

**Check tasks.md**:
- Do tasks implement constitutional requirements?
- Are multi-tenancy tasks present?
- Are security tasks included?

### 4. Assign Severity

**CRITICAL** (Blocks implementation):
- Missing multi-tenancy enforcement
- No authentication/authorization plan
- Security violations
- Type safety violations

**HIGH** (Should fix before implementation):
- Missing error handling strategy
- No observability plan
- Context propagation unclear

**MEDIUM** (Fix during implementation):
- Pattern inconsistencies
- Documentation gaps

**LOW** (Nice to have):
- Minor style issues

### 5. Generate Report

```markdown
## Constitutional Compliance Report

**Feature**: [Name]
**Reviewed**: [Date]
**Artifacts**: spec.md, plan.md, tasks.md

### Compliance Summary

| Principle | Status | Issues | Severity |
|-----------|--------|--------|----------|
| I. Multi-Tenancy | ❌ | 2 violations | CRITICAL |
| II. Security | ⚠️ | 1 gap | HIGH |
| III. Type Safety | ✅ | 0 | - |
| IV. Error Handling | ✅ | 0 | - |
| V. Context Propagation | ⚠️ | 1 gap | MEDIUM |
| VI. Consistency | ✅ | 0 | - |
| VII. Observability | ⚠️ | 1 gap | HIGH |

### Violations

**C1: Multi-Tenancy** [CRITICAL]
- **Location**: plan.md - Data Model section
- **Issue**: `Quest` model missing `TenantID` field
- **Remediation**: Add `TenantID uuid.UUID` to Quest model
- **Constitutional Reference**: Principle I - All models MUST include TenantID

**C2: Security** [HIGH]
- **Location**: tasks.md - No rate limiting task
- **Issue**: No task for implementing rate limiting
- **Remediation**: Add task for rate limiting middleware
- **Constitutional Reference**: Principle II - Rate limiting on all public endpoints

### Recommendations

1. **Before Implementation**:
   - Resolve all CRITICAL violations
   - Address HIGH severity gaps

2. **During Implementation**:
   - Monitor MEDIUM issues
   - Apply patterns from Quester-AI-Rules.md

3. **Verification**:
   - Test multi-tenant isolation
   - Verify security controls
   - Check type safety
```

## Quester-Specific Checks

### Multi-Tenancy Checklist

For every data model:
```
✅ Includes TenantID field
✅ Has tenant_id in indexes
✅ Repository filters by TenantID
✅ Controller extracts from JWT
```

### Security Checklist

```
✅ JWT validation middleware
✅ Input validation (go-playground/validator)
✅ Rate limiting configured
✅ Password hashing (bcrypt 12+)
✅ No sensitive logging
✅ CORS configured
✅ CSRF protection
```

### Type Safety Checklist

```
✅ TypeScript: No `any` types
✅ TypeScript: Explicit return types
✅ TypeScript: Interface definitions
✅ Go: Explicit types
✅ Go: Interface for polymorphism
```

## Remediation Guidance

### For CRITICAL Violations

**Must resolve before proceeding**:
1. Update affected artifact (spec/plan/tasks)
2. Add missing requirements/tasks
3. Re-run constitutional validation
4. Document resolution

### For HIGH/MEDIUM Issues

**Should address before implementation**:
1. Create issue/task to track
2. Prioritize in implementation order
3. Document in plan if deferring

### For LOW Issues

**Nice to have**:
1. Note in TODO or backlog
2. Address during polish phase

## Next Steps

After constitutional validation:
- **If CRITICAL violations**: Must resolve before implementation
- **If only HIGH/MEDIUM**: Can proceed with plan to address
- **If all clear**: Proceed to implementation

## References

- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
- Security Checklist: Constitution Section "Security & Compliance"
