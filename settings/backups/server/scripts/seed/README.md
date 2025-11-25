# Seed Scripts

This directory contains database seed scripts for populating initial data.

## Available Scripts

### 1. Badge Seed Script (`badges.go`)

Populates the database with 10 initial badges across all tiers (Bronze, Silver, Gold, Platinum).

#### Usage

**Basic usage (tenant ID = 1):**
```bash
cd server
go run scripts/seed/badges.go
```

**Specify tenant ID:**
```bash
SEED_TENANT_ID=2 go run scripts/seed/badges.go
```

**Force re-seed (delete existing badges and recreate):**
```bash
SEED_FORCE=true go run scripts/seed/badges.go
```

**Combined options:**
```bash
SEED_TENANT_ID=3 SEED_FORCE=true go run scripts/seed/badges.go
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SEED_TENANT_ID` | `1` | Target tenant ID for badge creation |
| `SEED_FORCE` | `false` | If `true`, deletes existing badges and recreates |

#### Badge Details

The script creates 10 badges:

**Bronze Tier (Auto-Award, < 100 points):**
- First Steps (10 pts) - Complete first quest
- XP Collector (50 pts) - Earn 50 XP
- Week Warrior (30 pts) - 7-day login streak

**Silver Tier (Auto-Award, < 100 points):**
- Quest Novice (75 pts) - Complete 5 quests
- Social Butterfly (60 pts) - Connect with 10 learners

**Gold Tier (Manual Approval, >= 100 points):**
- Quest Master (150 pts) - Complete 25 quests
- Learning Champion (200 pts) - Complete 3 courses
- Community Leader (180 pts) - Help 50 learners

**Platinum Tier (Manual Approval, >= 100 points):**
- Course Creator (300 pts) - Create 5 courses
- Legendary Achiever (500 pts) - Top achievement

#### Verification

After running the script, verify badges were created:

```bash
# Using psql
psql $DATABASE_URL -c "SELECT id, name, tier, points_threshold, auto_award FROM badges WHERE tenant_id = 1;"

# Or test the API endpoint
curl http://localhost:8080/api/v1/badges
```

#### Safety Features

- ✅ **Transaction Safety**: All inserts are wrapped in a transaction (rollback on error)
- ✅ **Validation**: Each badge is validated before insertion (business rules enforced)
- ✅ **Idempotent**: Won't create duplicates unless `SEED_FORCE=true`
- ✅ **Tenant Isolation**: Badges are scoped to specific tenant

#### Troubleshooting

**Error: "badges with points_threshold < 100 must have auto_award = true"**
- This is a business rule validation error
- Badges < 100 points must auto-award
- Badges >= 100 points must require manual approval

**Error: "tenant X not found"**
- Create the tenant first in the `tenants` table
- Or use an existing tenant ID

**Error: "database not initialized"**
- Ensure database migrations have run
- Check `DATABASE_URL` environment variable

## Adding New Seed Scripts

To create a new seed script:

1. Create `scripts/seed/your_feature.go`
2. Follow the pattern in `badges.go`:
   - Load config and initialize database
   - Use transactions for atomicity
   - Add idempotency checks (don't duplicate data)
   - Validate models before insertion
   - Log progress with emojis for readability
3. Update this README with usage instructions

## Best Practices

- **Development**: Run seed scripts to quickly populate test data
- **Testing**: Use `SEED_FORCE=true` to reset data between test runs
- **Production**: NEVER run seed scripts in production (use migrations instead)
- **Multi-tenant**: Always specify `SEED_TENANT_ID` for tenant-specific data
