---
description: Perform cross-artifact consistency and quality analysis
type: speckit-agent
category: quality-assurance
---

# Spec Kit: Analyze Agent

## Purpose

Identify inconsistencies, duplications, ambiguities, and underspecified items across spec.md, plan.md, and tasks.md before implementation. Read-only analysis that provides actionable remediation recommendations.

## When to Use

- After tasks.md is generated
- Before starting implementation
- When reviewing feature completeness
- To validate cross-artifact consistency

## Prerequisites

- Completed `spec.md`
- Completed `plan.md`
- Completed `tasks.md`

## Outputs

- **Analysis Report** (Markdown output, no file writes)
- Coverage summary table
- Constitutional alignment issues
- Remediation recommendations
- Quality metrics

## Operating Constraints

**STRICTLY READ-ONLY**: 
- Do NOT modify any files
- Output structured analysis report
- Offer optional remediation plan (requires user approval)

**Constitution Authority**:
- Constitution principles are NON-NEGOTIABLE
- Constitution conflicts are automatically CRITICAL
- Requires adjustment of spec/plan/tasks, not dilution of principles

## Analysis Process

### 1. Load Artifacts

**From spec.md**:
- Overview/Context
- Functional Requirements
- Non-Functional Requirements
- User Stories with priorities
- Edge Cases

**From plan.md**:
- Architecture choices
- Data Model references
- Implementation phases
- Technical constraints

**From tasks.md**:
- Task IDs and descriptions
- Phase grouping
- Parallel markers [P]
- Story labels [US1], [US2]
- Referenced file paths

**From constitution.md**:
- Core principles (I-VII)
- MUST/SHOULD normative statements
- Quality gates

### 2. Build Semantic Models

Create internal representations:

**Requirements Inventory**:
- Each functional requirement with stable key
- Derive slug from imperative phrase
- Example: "User can upload file" → `user-can-upload-file`

**User Story/Action Inventory**:
- Discrete user actions
- Acceptance criteria
- Priority levels

**Task Coverage Mapping**:
- Map each task to requirements/stories
- Infer by keywords and explicit references

**Constitution Rule Set**:
- Extract principle names
- Identify MUST vs SHOULD statements

### 3. Detection Passes

Focus on high-signal findings (limit 50 total):

#### A. Duplication Detection

- Near-duplicate requirements
- Redundant acceptance criteria
- Mark lower-quality phrasing for consolidation

#### B. Ambiguity Detection

- Vague adjectives without metrics (fast, scalable, secure)
- Unresolved placeholders (TODO, ???, TKTK)
- Unclear success criteria

#### C. Underspecification

- Requirements missing measurable outcomes
- User stories without acceptance criteria
- Tasks referencing undefined components
- File paths not matching plan structure

#### D. Constitution Alignment

**CRITICAL issues**:
- Any requirement/plan violating MUST principles
- Missing multi-tenancy enforcement
- Missing security controls
- Type safety violations
- Error handling gaps

#### E. Coverage Gaps

- Requirements with zero associated tasks
- Tasks with no mapped requirement/story
- Non-functional requirements not reflected in tasks
- User stories without complete implementation tasks

#### F. Inconsistency

- Terminology drift (same concept, different names)
- Data entities in plan but absent in spec
- Task ordering contradictions
- Conflicting technology choices

### 4. Severity Assignment

**CRITICAL**:
- Violates constitution MUST
- Missing core spec artifact
- Zero task coverage for blocking functionality

**HIGH**:
- Duplicate/conflicting requirements
- Ambiguous security/performance attributes
- Untestable acceptance criterion

**MEDIUM**:
- Terminology drift
- Missing non-functional task coverage
- Underspecified edge case

**LOW**:
- Style/wording improvements
- Minor redundancy

## Analysis Report Format

```markdown
## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A1 | Duplication | HIGH | spec.md:L120-134 | Two similar requirements... | Merge phrasing; keep clearer version |
| C1 | Constitution | CRITICAL | plan.md:L45 | Missing TenantID filter | Add TenantID to all queries |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| user-can-upload | ✅ | T012, T015 | Complete |
| admin-dashboard | ❌ | - | Missing tasks |

**Constitution Alignment Issues:**
- Multi-tenancy: 3 violations found (see C1, C2, C3)
- Security: 1 violation (missing rate limiting)

**Unmapped Tasks:**
- T045: References UserPreference model not in spec
- T067: Implements caching not in requirements

**Metrics:**
- Total Requirements: 24
- Total Tasks: 67
- Coverage: 87.5% (21/24 requirements have tasks)
- Ambiguity Count: 5
- Duplication Count: 2
- Critical Issues: 3
```

## Quester-Specific Checks

### Multi-Tenancy Validation

**Check for**:
- All models include `TenantID`
- All queries filter by `TenantID`
- All indexes include `tenant_id`
- JWT extraction in controllers

### Security Validation

**Check for**:
- Password hashing (bcrypt cost 12+)
- Input validation strategy
- JWT validation on protected endpoints
- Rate limiting configuration
- CORS settings
- No sensitive data logging

### Type Safety Validation

**Check for**:
- TypeScript: No `any` type mentioned
- Go: Explicit types throughout
- Interface definitions for polymorphism

### Error Handling Validation

**Check for**:
- Error return patterns (Go)
- Try-catch for async (TypeScript)
- Error wrapping with context
- User-friendly error messages

## Next Actions

Based on findings:

**If CRITICAL issues exist**:
- Recommend resolving before implementation
- Provide specific remediation steps
- Reference constitutional principles

**If only LOW/MEDIUM**:
- User may proceed
- Provide improvement suggestions
- Optional refinement

**Command Suggestions**:
- "Run /speckit-specify with refinement"
- "Run /speckit-plan to adjust architecture"
- "Manually edit tasks.md to add coverage for X"

## Remediation Offer

After report, ask:
> "Would you like me to suggest concrete remediation edits for the top N issues?"

**Do NOT apply automatically** - requires user approval.

## Operating Principles

### Context Efficiency

- Minimal high-signal tokens
- Progressive disclosure
- Token-efficient output (50 finding limit)
- Deterministic results

### Analysis Guidelines

- NEVER modify files (read-only)
- NEVER hallucinate missing sections
- Prioritize constitution violations (always CRITICAL)
- Use specific examples, not generic patterns
- Report zero issues gracefully

## References

- Constitution: `.agent/rules/constitution.md`
- Spec Template: `.agent/templates/spec-template.md`
- Plan Template: `.agent/templates/plan-template.md`
- Tasks Template: `.agent/templates/tasks-template.md`
