---
description: Create or update feature specifications from natural language descriptions
type: speckit-agent
category: specification
---

# Spec Kit: Specify Agent

## Purpose

Create comprehensive feature specifications from natural language descriptions. This agent transforms user requests into structured, testable requirements that serve as the foundation for technical planning.

## When to Use

- Starting a new feature development
- Documenting feature requirements
- Creating user stories and acceptance criteria
- Defining success metrics

## Inputs

- User's feature description (natural language)
- Optional: Existing specifications to update

## Outputs

- `specs/[NNN-feature-name]/spec.md` - Complete feature specification
- User story definitions with priorities (P1, P2, P3)
- Functional requirements (testable and measurable)
- Success criteria (technology-agnostic)
- Edge cases and constraints

## Process Overview

### 1. Feature Identification

- Extract key concepts from user description
- Identify actors, actions, data entities, and constraints
- Generate concise feature name (2-4 words)
- Determine branch naming: `NNN-feature-name`

### 2. Specification Generation

Using the spec template structure, create:

**User Scenarios & Testing** (Mandatory):
- Prioritized user stories (P1, P2, P3)
- Independent test criteria for each story
- Given-When-Then acceptance scenarios

**Requirements** (Mandatory):
- Functional requirements (FR-001, FR-002, etc.)
- Each requirement must be testable
- Key entities and relationships

**Success Criteria** (Mandatory):
- Measurable outcomes (time, performance, volume)
- Technology-agnostic metrics
- User-focused results

### 3. Quality Validation

Self-validate the specification against:
- No implementation details (languages, frameworks, APIs)
- Focused on user value and business needs
- All requirements are testable and unambiguous
- Success criteria are measurable and technology-agnostic

### 4. Clarification Management

**Maximum 3 clarifications allowed**:
- Only for critical scope/security/UX decisions
- Provide multiple-choice options with implications
- Make informed guesses for non-critical items
- Document assumptions

## Guidelines

### What to Include

- **User value**: Why this feature matters
- **Business needs**: What problem it solves  
- **Measurable outcomes**: How success is defined
- **Test scenarios**: How to verify it works

### What to Avoid

- Implementation details (tech stack, frameworks)
- Code structure or architecture
- Database schemas or API designs
- Specific technologies or tools

### Quality Standards

- Written for non-technical stakeholders
- No vague adjectives (fast, scalable) without metrics
- No unresolved placeholders (TODO, ???)
- Requirements independent of implementation

## Success Criteria Template

**Good Examples**:
- "Users can complete checkout in under 3 minutes"
- "System supports 10,000 concurrent users"
- "95% of searches return results in under 1 second"

**Bad Examples** (too technical):
- "API response time is under 200ms"
- "Database can handle 1000 TPS"
- "React components render efficiently"

## Next Steps

After specification is complete:
- Proceed to `/speckit-plan` for technical design
- Or use `/speckit-clarify` if requirements need refinement

## Integration with Quester

This agent follows:
- Quester AI Rules (multi-tenancy, security)
- Quester Constitution (type safety, error handling)
- Existing workflow patterns

## References

- Template: `.agent/templates/spec-template.md`
- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
