---
description: Generate quality validation checklists for specifications and plans
type: speckit-agent
category: quality-assurance
---

# Spec Kit: Checklist Agent

## Purpose

Generate comprehensive quality validation checklists for feature specifications, implementation plans, and task breakdowns. Ensures completeness and readiness before proceeding to next phase.

## When to Use

- After creating specification
- After creating implementation plan
- After generating task breakdown
- Before starting implementation

## Inputs

- Feature artifact to validate (spec.md, plan.md, or tasks.md)
- Validation criteria

## Outputs

- Quality checklist markdown file
- Pass/fail status for each criterion
- Notes on incomplete items
- Readiness assessment

## Checklist Types

### Specification Quality Checklist

**File**: `[feature-dir]/checklists/specification.md`

**Validates**:
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Success criteria are technology-agnostic
- [ ] All acceptance scenarios defined
- [ ] Edge cases identified
- [ ] Scope clearly bounded
- [ ] Dependencies and assumptions identified
- [ ] All functional requirements have acceptance criteria
- [ ] User scenarios cover primary flows

### Plan Quality Checklist

**File**: `[feature-dir]/checklists/plan.md`

**Validates**:
- [ ] All spec requirements addressed
- [ ] Technical stack justified
- [ ] Data model includes all entities from spec
- [ ] All models include TenantID (multi-tenancy)
- [ ] API contracts map to user actions
- [ ] Security controls defined
- [ ] Error handling strategy documented
- [ ] Type safety approach clear
- [ ] Context propagation strategy defined
- [ ] Observability plan included
- [ ] Constitutional compliance verified
- [ ] All [NEEDS CLARIFICATION] resolved
- [ ] Dependencies documented
- [ ] Configuration requirements listed
- [ ] Migration strategy defined

### Tasks Quality Checklist

**File**: `[feature-dir]/checklists/tasks.md`

**Validates**:
- [ ] All tasks follow format: `- [ ] [TID] [P?] [Story?] Description with path`
- [ ] Tasks organized by user story
- [ ] Each story has independent test criteria
- [ ] Setup phase present (project initialization)
- [ ] Foundational phase present (prerequisites)
- [ ] User story phases in priority order
- [ ] Polish phase present (cross-cutting)
- [ ] All spec requirements have corresponding tasks
- [ ] All plan components have implementation tasks
- [ ] Parallel markers [P] used appropriately
- [ ] Story labels [US1], [US2] used correctly
- [ ] File paths specified in task descriptions
- [ ] Dependencies documented
- [ ] Parallel execution opportunities identified
- [ ] MVP scope clearly defined

## Checklist Template Structure

```markdown
# [Artifact Type] Quality Checklist: [Feature Name]

**Purpose**: Validate [artifact] completeness and quality before [next phase]
**Created**: [Date]
**Feature**: [Link to artifact]

## Content Quality

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Notes**: [Specific issues or observations]

## [Category Name]

- [ ] Criterion 4
- [ ] Criterion 5

**Notes**: [Specific issues or observations]

## Readiness Assessment

**Status**: [Ready/Needs Work/Blocked]

**Summary**: [Overall assessment]

**Blocking Issues**: [List CRITICAL issues if any]

**Next Steps**: [What to do next]
```

## Validation Process

### 1. Select Checklist Type

Determine which artifact to validate:
- Specification → Use spec quality checklist
- Plan → Use plan quality checklist
- Tasks → Use tasks quality checklist

### 2. Load Artifact

Read the target artifact file completely.

### 3. Evaluate Each Criterion

For each checklist item:

**Check if criterion is met**:
- ✅ Passes: Mark as `- [x]`
- ❌ Fails: Mark as `- [ ]` and note issue
- ⚠️ Partial: Mark as `- [ ]` and note what's missing

**Document findings**:
- Quote relevant sections
- Specify line numbers
- Explain why it fails

### 4. Categorize Issues

**CRITICAL** (Blocks next phase):
- Missing mandatory sections
- Constitutional violations
- Untestable requirements
- Unresolved clarifications

**HIGH** (Should fix):
- Ambiguous requirements
- Missing tasks for requirements
- Incomplete coverage

**MEDIUM** (Nice to have):
- Minor inconsistencies
- Documentation gaps

**LOW**:
- Style issues
- Minor improvements

### 5. Generate Readiness Assessment

**Ready**:
- All CRITICAL items pass
- All HIGH items pass
- Most MEDIUM items pass

**Needs Work**:
- Some HIGH items fail
- Many MEDIUM items fail

**Blocked**:
- Any CRITICAL items fail
- Missing dependencies
- Unresolved blockers

### 6. Provide Next Steps

Based on status:

**If Ready**:
- "Proceed to [next phase]"
- "Run [command] to continue"

**If Needs Work**:
- "Address issues: [list]"
- "Update artifact and re-validate"

**If Blocked**:
- "CRITICAL: Resolve blockers first"
- "Contact [person] for [dependency]"

## Quester-Specific Validations

### Multi-Tenancy Validation

For plans and tasks:
```
✅ All data models include TenantID
✅ All queries filter by TenantID
✅ All indexes include tenant_id
✅ Controllers extract from JWT
✅ Repository methods accept tenantID param
```

### Security Validation

```
✅ Authentication strategy defined
✅ Authorization/permissions planned
✅ Input validation approach
✅ Rate limiting configured
✅ No sensitive data logging
✅ Password hashing (bcrypt 12+)
✅ JWT validation on protected routes
```

### Code Quality Validation

```
✅ Type safety approach (no `any`)
✅ Error handling strategy
✅ Context propagation (Go)
✅ State management (TypeScript)
✅ Repository → Service → Controller pattern
✅ File naming conventions
```

## Example Checklist Output

```markdown
# Specification Quality Checklist: User Authentication

**Purpose**: Validate specification completeness before planning
**Created**: 2025-11-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details
- [x] Focused on user value
- [x] Written for non-technical stakeholders
- [ ] All mandatory sections completed
  - Issue: Missing "Edge Cases" section

**Notes**: Spec is mostly complete but needs edge case documentation.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers
- [x] Requirements are testable
- [ ] Success criteria are measurable
  - Issue: SC-001 says "fast login" without defining time threshold
- [x] All acceptance scenarios defined

**Notes**: Need to quantify "fast" in SC-001.

## Readiness Assessment

**Status**: Needs Work

**Summary**: Specification is mostly ready but has 2 HIGH issues:
1. Missing edge cases section
2. Unmeasurable success criterion (SC-001)

**Blocking Issues**: None (all issues are HIGH, not CRITICAL)

**Next Steps**: 
1. Add "Edge Cases" section to spec
2. Replace "fast login" with "login completes in under 2 seconds"
3. Re-run validation
4. Proceed to `/speckit-plan` once ready
```

## Automation

Checklists can be:
- **Auto-generated** after artifact creation
- **Auto-validated** by parsing artifact content
- **Updated** as artifacts change
- **Referenced** in quality gates

## Next Steps

After checklist validation:
- **If CRITICAL issues**: Must resolve before proceeding
- **If HIGH issues**: Strongly recommend resolving
- **If only MEDIUM/LOW**: Can proceed with awareness
- **If all pass**: Ready for next phase

## References

- Checklist Template: `.agent/templates/checklist-template.md`
- Constitution: `.agent/rules/constitution.md`
- Quality Standards: `.agent/rules/quester-ai-rules.md`
