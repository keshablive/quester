---
description: Clarify ambiguous requirements and resolve specification uncertainties
type: speckit-agent
category: refinement
---

# Spec Kit: Clarify Agent

## Purpose

Resolve ambiguous requirements, clarify uncertainties, and refine specifications through structured questioning. Helps transform vague descriptions into concrete, testable requirements.

## When to Use

- Specification has [NEEDS CLARIFICATION] markers
- Requirements are too vague or ambiguous
- Multiple interpretations possible
- Before moving to technical planning

## Inputs

- `spec.md` with unclear requirements
- User responses to clarification questions

## Outputs

- Updated `spec.md` with resolved clarifications
- Documented assumptions and decisions
- Clear, testable requirements

## Clarification Process

### 1. Identify Ambiguities

Scan specification for:
- [NEEDS CLARIFICATION] markers
- Vague adjectives (fast, scalable, intuitive, robust)
- Unresolved placeholders (TODO, ???, TKTK)
- Requirements with multiple interpretations
- Missing acceptance criteria
- Unclear scope boundaries

### 2. Prioritize Questions

**Prioritization order**:
1. Scope-impacting decisions
2. Security/privacy requirements
3. User experience choices
4. Technical integration points
5. Performance expectations

**Maximum 3 questions per clarification session**.

### 3. Structure Questions

For each clarification needed:

```markdown
## Question [N]: [Topic]

**Context**: [Quote relevant spec section]

**What we need to know**: [Specific question]

**Suggested Answers**:

| Option | Answer | Implications |
|--------|--------|--------------|
| A | [First option] | [Impact on feature] |
| B | [Second option] | [Impact on feature] |
| C | [Third option] | [Impact on feature] |
| Custom | Provide your own | [How to input custom] |

**Your choice**: _[Wait for user response]_
```

### 4. Apply Responses

- Replace [NEEDS CLARIFICATION] with user's choice
- Document assumption in spec
- Update affected requirements
- Re-validate specification quality

## Clarification Categories

### Scope Clarification

**Example questions**:
- "Should this feature support mobile devices?"
- "Are offline capabilities required?"
- "Should historical data be retained?"

**Implications**:
- Affects task count and complexity
- Impacts technical architecture
- Changes success criteria

### Security/Privacy Clarification

**Example questions**:
- "What authentication method should be used?"
- "Is data encryption at rest required?"
- "Are there compliance requirements (GDPR, HIPAA)?"

**Implications**:
- Constitutional compliance
- Infrastructure requirements
- Legal/regulatory obligations

### User Experience Clarification

**Example questions**:
- "Should users see real-time updates or periodic refresh?"
- "What happens when operation fails?"
- "Should confirmations be required for destructive actions?"

**Implications**:
- Client-side architecture (polling vs websockets)
- Error handling strategy
- UI component requirements

### Performance Clarification

**Example questions**:
- "How many concurrent users should be supported?"
- "What's acceptable response time for search?"
- "Should pagination be implemented?"

**Implications**:
- Caching strategy
- Database indexing
- Load balancing needs

## Good vs Bad Clarifications

### Good Clarifications (Ask These)

✅ **Scope-impacting**:
- "Should admins be able to manage other tenants' data?" 
- "Is bulk import/export required?"

✅ **Security-critical**:
- "Should 2FA be required or optional?"
- "What roles/permissions are needed?"

✅ **Legally significant**:
- "What's the data retention policy?"
- "Which countries/regions must be supported?"

### Bad Clarifications (Don't Ask)

❌ **Has reasonable default**:
- "What database should be used?" (Use existing: PostgreSQL)
- "Should we validate email format?" (Always: Yes)

❌ **Implementation detail**:
- "Which frontend framework?" (Already decided: React)
- "Should we use Redis for caching?" (Technical choice)

❌ **Obvious from context**:
- "Should passwords be encrypted?" (Always: Yes per constitution)
- "Should errors be logged?" (Always: Yes per observability)

## Response Handling

### User Selects Option A/B/C

1. Apply selected answer to spec
2. Remove [NEEDS CLARIFICATION] marker
3. Document decision in assumptions
4. Update related requirements if needed

### User Provides Custom Answer

1. Validate answer addresses the question
2. Apply custom answer to spec
3. Remove marker
4. Document assumption

### User Defers Decision

1. Make informed guess based on:
   - Industry standards
   - Existing Quester patterns
   - Constitutional requirements
2. Document assumption clearly
3. Mark as "Assumed: [decision]"

## Quality Validation

After clarifications resolved:

**Check that**:
- No [NEEDS CLARIFICATION] markers remain
- Requirements are testable
- Success criteria are measurable
- No vague adjectives without metrics
- Acceptance criteria are complete

## Quester-Specific Clarifications

### Multi-Tenancy

**Usually clear** (per constitution):
- All features are multi-tenant
- TenantID required on all data
- No cross-tenant access

**May need clarification**:
- "Should tenant admins see usage metrics?"
- "Can tenants be hierarchical (parent/child)?"

### Authentication

**Usually clear**:
- JWT-based authentication
- Extract tenantID from JWT

**May need clarification**:
- "Is social login required (Google/Facebook)?"
- "Should guest access be supported?"

### Data Access

**Usually clear**:
- Repository pattern
- Filter by TenantID

**May need clarification**:
- "Should deleted items be soft-deleted or hard-deleted?"
- "What data can users export?"

## Next Steps

After clarification:
- **If spec now complete**: Proceed to `/speckit-plan`
- **If more issues**: Run another clarification round
- **If quality concerns**: Run `/speckit-analyze`

## References

- Spec Template: `.agent/templates/spec-template.md`
- Constitution: `.agent/rules/constitution.md`
- Quester Rules: `.agent/rules/quester-ai-rules.md`
