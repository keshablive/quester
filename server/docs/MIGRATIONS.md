# Database Migration Guide

## Overview

Quester supports two migration approaches:

1. **SQL Migrations** (Recommended for Production)
2. **GORM Auto-Migration** (Development & Quick Setup)

## SQL Migrations (Production)

### Location

`server/internal/migrations/*.sql`

### File Naming Convention

```text
XXX_feature_name.up.sql    # Apply migration
XXX_feature_name.down.sql  # Rollback migration
```

Where `XXX` is a zero-padded sequence number (001, 002, 003, etc.)

### Running SQL Migrations

**Using psql:**

```bash
# Apply migration
psql -U postgres -d quester -f migrations/001_enable_postgis.up.sql

# Rollback migration
psql -U postgres -d quester -f migrations/001_enable_postgis.down.sql
```

**Using the migrate tool:**

```bash
cd server
go run cmd/migrate/main.go up     # Apply all pending migrations
go run cmd/migrate/main.go down   # Rollback last migration
```

### Creating New SQL Migrations

1. Find the next sequence number
2. Create paired files:

   ```text
   migrations/XXX_feature_name.up.sql
   migrations/XXX_feature_name.down.sql
   ```

3. Follow the template:

**Up Migration:**

```sql
-- XXX_feature_name.up.sql
CREATE TABLE IF NOT EXISTS feature_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- feature-specific fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for multi-tenancy and performance
CREATE INDEX IF NOT EXISTS idx_feature_name_tenant ON feature_name(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_name_tenant_created ON feature_name(tenant_id, created_at DESC);
```

**Down Migration:**

```sql
-- XXX_feature_name.down.sql
DROP TABLE IF EXISTS feature_name;
```

## GORM Auto-Migration (Development)

### Configuration

Set migration mode via environment variable:

```bash
# .env file
MIGRATION_MODE=none        # Default: Use SQL migrations
MIGRATION_MODE=core        # Migrate core tables only
MIGRATION_MODE=all         # Migrate all tables
MIGRATION_MODE=selective   # Migrate specific tables
MIGRATE_TABLES=users,quests,badges  # For selective mode
```

### Migration Modes

#### 1. None (Default)

Use SQL migrations only:

```bash
MIGRATION_MODE=none
```

- No GORM auto-migration
- Recommended for production
- Full control over schema changes

#### 2. Core Tables

Migrate essential tables only:

```bash
MIGRATION_MODE=core
```

Migrates:

- `tenants` - Multi-tenant organization
- `users` - User accounts
- `user_2fa` - Two-factor authentication
- `refresh_tokens` - JWT refresh tokens
- `encryption_keys` - KMS encryption keys
- `audit_logs` - Security audit trail

#### 3. All Tables

Migrate entire schema:

```bash
MIGRATION_MODE=all
```

Migrates all feature tables:

- Core tables
- Quest & Gamification
- LMS (Learning Management System)
- Social & Community
- Messaging & Notifications
- Video Streaming
- Property & Classifieds
- Analytics & Reporting
- Payments

#### 4. Selective Tables

Migrate specific tables:

```bash
MIGRATION_MODE=selective
MIGRATE_TABLES=users,quests,badges,leaderboards
```

### Using the Migration Tool

**Show current configuration:**

```bash
cd server
go run cmd/tools/migrate.go info
```

**Migrate all tables:**

```bash
go run cmd/tools/migrate.go all
```

**Migrate core tables only:**

```bash
go run cmd/tools/migrate.go core
```

**Migrate specific tables:**

```bash
go run cmd/tools/migrate.go selective users quests badges
```

### Available Tables

**Core:**

- tenants, users, user_2fa, refresh_tokens, encryption_keys, audit_logs

**Quest & Gamification:**

- quests, badges, user_badges, user_achievement_badges, achievements, leaderboards

**LMS:**

- courses, lessons, enrollments, assessments, certificates

**Social:**

- posts, comments, likes, follows, activities, interactions

**Messaging:**

- messages, notifications

**Streaming:**

- streams, video_streams

**Property:**

- properties, classified_ads, marketplace_listings, marketplace_reviews

**Analytics:**

- user_analytics, course_analytics, engagement_analytics, dashboards, reports

**Payments:**

- transactions

## Migration Best Practices

### 1. Multi-Tenancy Requirements

Every table MUST include:

```sql
tenant_id UUID NOT NULL,
CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
```

Index:

```sql
CREATE INDEX idx_tablename_tenant ON tablename(tenant_id);
```

### 2. Standard Fields

All tables should have:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
deleted_at TIMESTAMP  -- For soft deletes
```

### 3. Indexing Strategy

- **Tenant isolation:** `CREATE INDEX idx_table_tenant ON table(tenant_id)`
- **Common queries:** `CREATE INDEX idx_table_tenant_created ON table(tenant_id, created_at DESC)`
- **Foreign keys:** Always index foreign key columns
- **Search fields:** Consider indexes on frequently searched columns

### 4. GORM AutoMigrate Limitations

⚠️ **GORM AutoMigrate CANNOT:**

- Drop columns
- Drop tables
- Modify column types (only adds new types)
- Rename columns or tables

✅ **GORM AutoMigrate CAN:**

- Create new tables
- Add new columns
- Add indexes
- Add foreign keys

### 5. Production Migration Workflow

**Development:**

```bash
# Use GORM auto-migration for rapid iteration
MIGRATION_MODE=all go run cmd/server/main.go
```

**Staging:**

```bash
# Generate SQL from GORM schema, test thoroughly
go run cmd/tools/migrate.go all
# Review generated schema, create SQL migration files
```

**Production:**

```bash
# Always use SQL migrations
MIGRATION_MODE=none
psql -U postgres -d quester -f migrations/XXX_feature.up.sql
```

### 6. Rollback Strategy

**SQL Migrations:**

- Always create `.down.sql` files
- Test rollback before deploying

**GORM AutoMigrate:**

- No automatic rollback
- Manual intervention required
- Use SQL migrations for production rollbacks

## Migration Checklist

Before applying migrations:

- [ ] Backup database
- [ ] Test migration in staging environment
- [ ] Verify multi-tenancy (tenant_id in all tables)
- [ ] Check indexes are created
- [ ] Test rollback procedure
- [ ] Verify data integrity after migration
- [ ] Update GORM models to match schema
- [ ] Run application to ensure compatibility

## Troubleshooting

### Migration Fails

1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql.log`
2. Verify DATABASE_URL is correct
3. Ensure user has sufficient permissions
4. Check for constraint violations

### GORM AutoMigrate Issues

1. Set `DBLogQueries=true` in config to see SQL
2. Check model definitions match expected schema
3. Verify all models are included in migration list
4. Ensure foreign key relationships are correct

### Performance Issues

1. Check indexes exist: `\d tablename` in psql
2. Analyze query performance: `EXPLAIN ANALYZE SELECT ...`
3. Add indexes for slow queries
4. Consider composite indexes for multi-column queries

## Example: Adding a New Feature

### Step 1: Create GORM Model

```go
// internal/models/feature.go
type Feature struct {
    ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_features_tenant" json:"tenant_id"`
    Name     string    `gorm:"type:varchar(255);not null" json:"name"`
    // ... other fields
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
```

### Step 2: Test with GORM AutoMigrate (Development)

```bash
MIGRATION_MODE=selective MIGRATE_TABLES=features go run cmd/server/main.go
```

### Step 3: Generate SQL Migration (Production)

```bash
# migrations/025_create_features_table.up.sql
CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_features_tenant ON features(tenant_id);
CREATE INDEX idx_features_tenant_created ON features(tenant_id, created_at DESC);
```

```bash
# migrations/025_create_features_table.down.sql
DROP TABLE IF EXISTS features;
```

### Step 4: Apply in Production

```bash
psql -U postgres -d quester -f migrations/025_create_features_table.up.sql
```

## Additional Resources

- **GORM Documentation:** <https://gorm.io/docs/migration.html>
- **PostgreSQL Migrations:** <https://www.postgresql.org/docs/current/ddl.html>
- **Multi-Tenancy Patterns:** See `docs/ARCHITECTURE.md`
- **Quester Constitution:** See `.specify/memory/constitution.md`

---

**Remember:** Always backup before migrations. Test in staging first. Multi-tenancy is non-negotiable.
