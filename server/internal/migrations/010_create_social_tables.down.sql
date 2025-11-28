-- Migration 010 Rollback: Drop social engagement tables
-- User Story 8: Social Features with AI Moderation

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_interactions_timestamp ON interactions;
DROP TRIGGER IF EXISTS trigger_update_moderation_configs_timestamp ON moderation_configs;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_interactions_timestamp();
DROP FUNCTION IF EXISTS update_moderation_configs_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS idx_moderation_queue_ai_categories;
DROP INDEX IF EXISTS idx_moderation_queue_created;
DROP INDEX IF EXISTS idx_moderation_queue_pending;
DROP INDEX IF EXISTS idx_moderation_queue_reviewed;
DROP INDEX IF EXISTS idx_moderation_queue_reviewer;
DROP INDEX IF EXISTS idx_moderation_queue_reporter;
DROP INDEX IF EXISTS idx_moderation_queue_tenant;

DROP INDEX IF EXISTS idx_interactions_type;
DROP INDEX IF EXISTS idx_interactions_created;
DROP INDEX IF EXISTS idx_interactions_moderation;
DROP INDEX IF EXISTS idx_interactions_parent;
DROP INDEX IF EXISTS idx_interactions_target;
DROP INDEX IF EXISTS idx_interactions_user;
DROP INDEX IF EXISTS idx_interactions_tenant;

DROP INDEX IF EXISTS idx_moderation_configs_tenant;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS moderation_queue CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS moderation_configs CASCADE;
