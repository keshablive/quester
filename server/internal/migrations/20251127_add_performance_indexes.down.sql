-- Migration: Remove Performance Indexes
-- Feature: 007-api-performance-caching
-- Tasks: T004

-- Remove indexes in reverse order of creation
DROP INDEX CONCURRENTLY IF EXISTS idx_learning_course_progress_tenant_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_leaderboards_tenant_type_period_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_learning_xp_transactions_tenant_user_action;
