-- Migration: Add Performance Indexes for API Caching Feature
-- Feature: 007-api-performance-caching
-- Tasks: T003

-- Index 1: XP Transactions lookup
-- Supports: GetUserXPHistory, GetXPByAction queries
-- Query pattern: WHERE tenant_id = ? AND user_id = ? [AND action_type = ?]
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_xp_transactions_tenant_user_action 
ON learning_xp_transactions (tenant_id, user_id, action_type);

-- Index 2: Leaderboard queries  
-- Supports: GetLeaderboard filtered by type/period/category
-- Query pattern: WHERE tenant_id = ? AND type = ? AND period = ? [AND category = ?]
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboards_tenant_type_period_category
ON leaderboards (tenant_id, type, period, category);

-- Index 3: Course progress lookup
-- Supports: GetUserProgress, GetCourseCompletions queries
-- Query pattern: WHERE tenant_id = ? AND user_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_course_progress_tenant_user
ON learning_course_progress (tenant_id, user_id);

-- Note: Quest progress uses quest_user_progress table which already has
-- appropriate indexes from 006-course-gamification feature.
