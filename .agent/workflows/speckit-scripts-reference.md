---
description: Reference for original spec kit bash scripts and antigravity adaptations
---

# Spec Kit Scripts Reference

This document describes the original bash scripts from `.specify/scripts/bash/` and provides guidance on how to adapt them for use with antigravity.

## Original Scripts Overview

The spec kit includes several bash scripts located in `.specify/scripts/bash/` that automate feature setup and validation. Since antigravity runs on Windows and may not have direct access to bash, this document provides alternatives.

## Script Inventory

### 1. `create-new-feature.sh`

**Purpose**: Create new feature branch and directory structure

**Original functionality**:
- Generates feature branch name: `NNN-short-name`
- Creates `specs/NNN-short-name/` directory
- Checks out new git branch
- Initializes `spec.md` from template
- Returns JSON with paths

**Antigravity adaptation**:
```bash
# Manual steps or use PowerShell/Git Bash equivalent:

# 1. Determine next feature number
git fetch --all --prune
git branch -a | grep -E '[0-9]+-' | sed 's/.*\/\([0-9]\+\)-.*/\1/' | sort -n | tail -1

# 2. Create feature directory
mkdir -p specs/NNN-feature-name

# 3. Create and checkout branch
git checkout -b NNN-feature-name

# 4. Copy spec template
cp .agent/templates/spec-template.md specs/NNN-feature-name/spec.md
```

**When to use**: At the start of `/speckit-specify` workflow

---

### 2. `check-prerequisites.sh`

**Purpose**: Validate that required files exist before running commands

**Original functionality**:
- Checks for existence of spec.md, plan.md, tasks.md
- Returns JSON with FEATURE_DIR and AVAILABLE_DOCS
- Optionally requires specific files

**Antigravity adaptation**:
```bash
# Use standard file existence checks:

if [ ! -f "specs/NNN-feature-name/spec.md" ]; then
    echo "Error: spec.md not found"
    exit 1
fi

# Or in PowerShell:
if (-not (Test-Path "specs/NNN-feature-name/spec.md")) {
    Write-Error "spec.md not found"
    exit 1
}
```

**When to use**: Before `/speckit-plan` or `/speckit-tasks` workflows

---

### 3. `setup-plan.sh`

**Purpose**: Initialize planning workspace

**Original functionality**:
- Loads feature spec path
- Copies plan template to feature directory
- Returns JSON with FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH

**Antigravity adaptation**:
```bash
# Manual steps:

# 1. Copy plan template
cp .agent/templates/plan-template.md specs/NNN-feature-name/plan.md

# 2. Get current branch
BRANCH=$(git branch --show-current)

# 3. Set feature directory
FEATURE_DIR="specs/NNN-feature-name"
```

**When to use**: At the start of `/speckit-plan` workflow

---

### 4. `update-agent-context.sh`

**Purpose**: Update agent-specific context files (Copilot, Cursor, etc.)

**Original functionality**:
- Detects which AI agent is in use
- Updates appropriate context file
- Preserves manual additions between markers
- Adds new technology from current plan

**Antigravity adaptation**:

For antigravity, update `AGENT.md` or memory files directly:

```bash
# Add learned patterns to memory
echo "## Pattern: [Entity] Repository" >> .agent/memory/patterns.md
echo "..."  >> .agent/memory/patterns.md

# Or update AGENT.md in root
echo "### Technology: [Framework]" >> AGENT.md
echo "Used for: [purpose]" >> AGENT.md
```

**When to use**: After completing `/speckit-plan` workflow

---

## Directory Structure Created by Scripts

```
specs/
└── NNN-feature-name/
    ├── spec.md              # From /speckit-specify
    ├── plan.md              # From /speckit-plan
    ├── research.md           # From /speckit-plan (Phase 0)
    ├── data-model.md        # From /speckit-plan (Phase 1)
    ├── quickstart.md        # From /speckit-plan (Phase 1)
    ├── contracts/           # From /speckit-plan (Phase 1)
    │   └── [endpoints].yaml
    ├── tasks.md             # From /speckit-tasks
    └── checklists/          # From /speckit-checklist
        ├── specification.md
        ├── plan.md
        └── tasks.md
```

## JSON Output Format

Original scripts return JSON for parsing. Here's the expected format:

```json
{
  "FEATURE_DIR": "/absolute/path/to/specs/NNN-feature-name",
  "SPEC_FILE": "/absolute/path/to/specs/NNN-feature-name/spec.md",
  "PLAN_FILE": "/absolute/path/to/specs/NNN-feature-name/plan.md",
  "TASKS_FILE": "/absolute/path/to/specs/NNN-feature-name/tasks.md",
  "BRANCH_NAME": "NNN-feature-name",
  "FEATURE_NUMBER": "NNN",
  "SHORT_NAME": "feature-name",
  "AVAILABLE_DOCS": ["spec.md", "plan.md", "data-model.md"]
}
```

## Antigravity Alternative: Direct Implementation

Instead of relying on external scripts, antigravity can:

1. **Create directories** using standard file operations
2. **Copy templates** from `.agent/templates/`
3. **Manage git** using git commands
4. **Track state** in memory files (`.agent/memory/`)

## Integration with Quester Workflows

The spec kit workflows complement existing Quester Workflows:

**Quester Workflows** (`.agent/workflows/quester-ai-workflows.md`):
- New Feature Workflow (End-to-End)
- Modify Existing Feature
- Add New Endpoint
- Bug Fix Workflow

**Spec Kit Workflows** (`.agent/workflows/speckit-*.md`):
- Specification-first approach
- Quality gates and analysis
- Constitutional compliance
- MVP-first implementation

**Use Spec Kit when**:
- Starting complex features
- Need structured planning
- Want quality analysis
- Building customer-facing features

**Use Quester Workflows when**:
- Quick modifications
- Bug fixes
- Internal utilities
- Following existing patterns

## Script Dependencies

The original scripts depend on:
- **bash**: Shell environment
- **git**: Version control
- **jq**: JSON processing (optional)
- **grep/sed/awk**: Text processing

**Antigravity alternatives**:
- **Git Bash**: Available on Windows
- **PowerShell**: Native Windows shell
- **Direct file operations**: Copy, create, read
- **JSON parsing**: Built into most languages

## Best Practices

1. **Always validate paths** before creating files
2. **Check git status** before making branches
3. **Use absolute paths** for reliability
4. **Track feature numbers** to avoid conflicts
5. **Document decisions** in memory files

## Troubleshooting

**Q: Feature number conflicts?**
A: Always check remote branches, local branches, AND specs directories

**Q: Template not found?**
A: Ensure `.agent/templates/` directory exists with all templates

**Q: Branch already exists?**
A: Check all branches (`git branch -a`) and increment number

**Q: Permission errors?**
A: Verify write access to specs/ directory and git repository

## References

- Original scripts: `.specify/scripts/bash/`
- Templates: `.agent/templates/`
- Workflows: `.agent/workflows/speckit-*.md`
- Memory: `.agent/memory/`
