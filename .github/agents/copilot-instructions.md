# quester Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-23

## Active Technologies
- PostgreSQL with PostGIS extension, Redis for caching (001-server-refactor)
- Go 1.24.0 + Fiber v2 (web framework), GORM v1.30.0 (ORM), go-redis/v9 (cache), go-playground/validator/v10 (validation), google/uuid (identifiers) (002-server-refactor)
- PostgreSQL (primary), Redis (cache/session), S3 (file storage) (002-server-refactor)
- Go 1.25.0 + Fiber v2.52.9, GORM v1.30.0, go-redis v9.4.0, jwt-go v5.3.0 (003-framework-consolidation)
- PostgreSQL (via GORM), Redis (via go-redis) (003-framework-consolidation)
- Go 1.25.0 (Windows AMD64) + Fiber (web), GORM (ORM), go-playground/validator (validation), google/uuid (004-framework-reusability)
- PostgreSQL with PostGIS, Redis (caching) (004-framework-reusability)

- Go 1.24.0 + Fiber v2 (HTTP framework), GORM v2 (ORM), PostgreSQL driver, UUID library, Redis client (001-server-refactor)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for Go 1.24.0

## Code Style

Go 1.24.0: Follow standard conventions

## Recent Changes
- 004-framework-reusability: Added Go 1.25.0 (Windows AMD64) + Fiber (web), GORM (ORM), go-playground/validator (validation), google/uuid
- 003-framework-consolidation: Added Go 1.25.0 + Fiber v2.52.9, GORM v1.30.0, go-redis v9.4.0, jwt-go v5.3.0
- 002-server-refactor: Added Go 1.24.0 + Fiber v2 (web framework), GORM v1.30.0 (ORM), go-redis/v9 (cache), go-playground/validator/v10 (validation), google/uuid (identifiers)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
