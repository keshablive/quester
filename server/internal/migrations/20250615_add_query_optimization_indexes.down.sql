-- Migration: 009-database-query-optimization
-- Purpose: Remove composite indexes added for query optimization
-- Task Reference: T018
--
-- IMPORTANT: Drop indexes CONCURRENTLY to avoid locking production tables
-- This ensures zero-downtime rollback

-- Drop course indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_courses_tenant_status_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_courses_tenant_published_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_courses_tenant_instructor;

-- Drop transaction indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_tenant_user_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_tenant_status_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_tenant_seller;

-- Drop quest indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_quests_tenant_status_difficulty;
DROP INDEX CONCURRENTLY IF EXISTS idx_quests_tenant_status;

-- Drop user indexes  
DROP INDEX CONCURRENTLY IF EXISTS idx_users_tenant_status_tier;

-- Note: ANALYZE not needed in down migration as indexes are being removed
