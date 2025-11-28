---
description: Complete feature development lifecycle from spec to implementation
---

# Spec Kit: Full Feature Development Workflow

Complete workflow for developing features from natural language description through specification, planning, task breakdown, analysis, and phased implementation.

## When to Use

- Starting a new feature from scratch
- Need structured approach to feature development
- Want spec-driven development with quality gates
- Building complex features requiring planning

## Overview

This workflow combines all spec kit commands in optimal sequence:
1. `/speckit-specify` - Create specification
2. `/speckit-clarify` - Resolve ambiguities (if needed)
3. `/speckit-plan` - Generate technical plan
4. `/speckit-tasks` - Break down into tasks
5. `/speckit-analyze` - Quality analysis
6. `/speckit-implement` - Execute implementation

## Prerequisites

- Feature description (natural language)
- Access to Quester codebase
- Constitution and rules reviewed
- Understanding of Quester patterns

## Complete Workflow Steps

### Step 1: Create Specification

Run specification workflow (see [speckit-specify.md](./speckit-specify.md)):

**Command**: `/speckit-specify [feature description]`

**Outputs**:
- `specs/NNN-feature-name/spec.md`
- Prioritized user stories (P1, P2, P3)
- Functional requirements
- Success criteria
- Specification quality checklist

**Quality Gate**:
- [ ] No [NEEDS CLARIFICATION] markers (or resolved via clarify)
- [ ] Requirements are testable
- [ ] Success criteria are measurable
- [ ] All mandatory sections complete

**If clarifications needed**: Proceed to Step 2
**If spec is ready**: Skip to Step  3

---

### Step 2: Clarify Requirements (Optional)

Run clarification workflow if spec has uncertainties:

**Command**: `/speckit-clarify`

**Purpose**:
- Resolve [NEEDS CLARIFICATION] markers
- Refine ambiguous requirements
- Make informed decisions

**Outputs**:
- Updated spec.md with resolved clarifications
- Documented assumptions

**After clarification**: Return to Step 1 validation or proceed to Step 3

---

### Step 3: Create Technical Plan

Run planning workflow (see [speckit-plan.md](./speckit-plan.md)):

**Command**: `/speckit-plan`

**Inputs**:
- Completed spec.md
- Constitution for compliance check

**Outputs**:
- `plan.md` - Technical implementation plan
- `research.md` - Technology decisions
- `data-model.md` - Entity definitions
- `contracts/` - API specifications
- `quickstart.md` - Test scenarios

**Quality Gate**:
- [ ] All spec requirements addressed
- [ ] Constitutional compliance verified
- [ ] Data model includes TenantID on all entities
- [ ] Security controls defined
- [ ] Architecture decisions documented

---

### Step 4: Generate Task Breakdown

Run tasks workflow (see [speckit-tasks.md](./speckit-tasks.md)):

**Command**: `/speckit-tasks`

**Inputs**:
- plan.md (required)
- spec.md (required - for user stories)
- data-model.md (optional)
- contracts/ (optional)

**Outputs**:
- `tasks.md` - Complete task breakdown
  - Organized by user story
  - Dependency information
  - Parallel opportunities
  - Independent test criteria

**Quality Gate**:
- [ ] All tasks follow format: `- [ ] [TID] [P?] [Story?] Description with path`
- [ ] Tasks organized by user story priority
- [ ] Each story has independent test criteria
- [ ] All spec requirements have tasks
- [ ] File paths are correct

---

### Step 5: Quality Analysis

Run analysis workflow (see [speckit-analyze.md](./speckit-analyze.md)):

**Command**: `/speckit-analyze`

**Inputs**:
- spec.md
- plan.md
- tasks.md
- constitution.md

**Outputs**:
- Analysis report (console output)
- Coverage summary
- Constitution alignment check
- Remediation recommendations

**Checks**:
- Cross-artifact consistency
- Requirement coverage
- Constitutional compliance
- Ambiguity detection
- Duplication detection

**Quality Gate**:
- [ ] No CRITICAL issues
- [ ] Coverage ≥90% (requirements with tasks)
- [ ] Constitutional compliance verified
- [ ] No blocking ambiguities

**If CRITICAL issues found**: Remediate before implementation
**If only LOW/MEDIUM**: Can proceed with awareness

---

### Step 6: Phased Implementation

Run implementation workflow (see [speckit-implement.md](./speckit-implement.md)):

**Command**: `/speckit-implement`

**Strategy**: MVP-First (User Story 1 only)

**Execution**:

**Phase 1: Setup**
- Project structure
- Configuration
- Dependencies

**Phase 2: Foundational** 
- Core infrastructure
- Shared utilities
- Database setup

**Phase 3: User Story 1 (P1)** - MVP
- Implement all tasks for US1
- Test independently
- Verify acceptance criteria

**Validation after US1**:
- [ ] All US1 acceptance criteria met
- [ ] Multi-tenant isolation verified
- [ ] Security controls in place
- [ ] Independently testable

**Deploy MVP**: User Story 1 complete and validated

**Phase 4+: Additional Stories** (P2, P3, etc.)
- One story at a time
- Test independently
- Incremental deployment

---

## Quality Gates Summary

### Specification Quality
- Testable requirements
- Measurable success criteria
- No implementation details
- Complete mandatory sections

### Planning Quality
- Constitutional compliance
- All requirements addressed
- Security strategy defined
- Architecture decisions documented

### Tasks Quality
- Proper task format
- Story-based organization
- Complete coverage
- Clear file paths

### Implementation Quality
- Code compiles
- Tests pass
- Multi-tenancy verified
- Security validated

## Success Criteria

**Feature is successfully developed when**:
- ✅ Specification complete and validated
- ✅ Technical plan comprehensive
- ✅ Tasks executable and complete
- ✅ Quality analysis passed
- ✅ MVP (P1) implemented and tested
- ✅ Constitutional compliance maintained
- ✅ Independently deployable

## Time Estimates

| Phase | Complexity | Estimated Time |
|-------|-----------|----------------|
| Specification | Low | 30min - 1hr |
| Specification | Medium | 1-2hrs |
| Specification | High | 2-4hrs |
| Planning | Low | 1-2hrs |
| Planning | Medium | 2-4hrs |
| Planning | High | 4-8hrs |
| Tasks | Any | 30min - 1hr |
| Analysis | Any | 15-30min |
| Implementation | Per story | Varies |

## MVP Deployment Strategy

**Minimum Viable Product = P1 User Story Only**

1. Complete Setup + Foundational
2. Implement P1 user story completely
3. Test P1 independently
4. Deploy P1 to production
5. Gather feedback
6. Then add P2, P3 incrementally

**Benefits**:
- Fastest time to value
- Early user feedback
- Reduced risk
- Incremental learning

## References

- Agents: `.agent/agents/speckit-*.md`
- Workflows: `.agent/workflows/speckit-*.md`
- Templates: `.agent/templates/*.md`
- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
- Quester Workflows: `.agent/workflows/quester-ai-workflows.md`
