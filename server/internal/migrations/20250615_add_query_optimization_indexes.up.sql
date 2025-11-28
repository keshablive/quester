-- Migration: 009-database-query-optimization
-- Purpose: Add composite indexes with tenant_id as leading column for list query optimization
-- Task Reference: T011-T017
-- 
-- IMPORTANT: All indexes created CONCURRENTLY to avoid locking production tables
-- CONCURRENTLY prevents write blocking during index creation on large tables
--
-- Constitution Compliance:
-- - Multi-Tenant Architecture: tenant_id is the leading column in ALL indexes
-- - Performance First: Composite indexes for common query patterns
-- - Security First: No sensitive data exposed in indexes

-- Index for course listing queries by status and category
-- Supports: GET /api/v1/courses?status=published&category_id=X
-- T012: idx_courses_tenant_status_category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_tenant_status_category 
ON courses (tenant_id, status, category_id);

-- Index for course listing by published status, ordered by creation date
-- Supports: GET /api/v1/courses?published=true&sort=created_at
-- T013: idx_courses_tenant_published_created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_tenant_published_created 
ON courses (tenant_id, published, created_at DESC);

-- Index for transaction listing by user and status
-- Supports: GET /api/v1/transactions?buyer_id=X&status=completed
-- T014: idx_transactions_tenant_user_status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tenant_user_status 
ON transactions (tenant_id, buyer_id, status);

-- Index for transaction listing by status, ordered by creation date  
-- Supports: GET /api/v1/transactions?status=pending&sort=created_at
-- T015: idx_transactions_tenant_status_created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tenant_status_created 
ON transactions (tenant_id, status, created_at DESC);

-- Index for quest listing by status and difficulty
-- Supports: GET /api/v1/quests?status=active&difficulty=medium
-- T016: idx_quests_tenant_status_difficulty
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_tenant_status_difficulty 
ON quests (tenant_id, status, difficulty);

-- Index for quest listing by status only
-- Supports: GET /api/v1/quests?status=active
-- T017: idx_quests_tenant_status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_tenant_status 
ON quests (tenant_id, status);

-- Additional useful indexes for common access patterns

-- Index for courses by instructor (author)
-- Supports: GET /api/v1/users/:id/courses (instructor's courses)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_tenant_instructor 
ON courses (tenant_id, instructor_id);

-- Index for transactions by seller
-- Supports: GET /api/v1/transactions?seller_id=X (seller's transactions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tenant_seller 
ON transactions (tenant_id, seller_id);

-- Index for user listings by status and tier
-- Supports: GET /api/v1/users?status=active&tier=GOLD
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_status_tier 
ON users (tenant_id, status, tier);

-- Analyze tables to update statistics for query planner
ANALYZE courses;
ANALYZE transactions;
ANALYZE quests;
ANALYZE users;
