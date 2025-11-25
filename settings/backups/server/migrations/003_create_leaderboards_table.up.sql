-- Migration: Create leaderboards table
-- Purpose: Store cached leaderboard rankings for performance and historical tracking
-- Primary data source: Redis sorted sets (for real-time rankings)
-- This table: Periodic snapshots, historical queries, backup

CREATE TABLE IF NOT EXISTS leaderboards (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    leaderboard_type VARCHAR(20) NOT NULL CHECK (leaderboard_type IN ('global', 'category')),
    period VARCHAR(20) NOT NULL CHECK (period IN ('alltime', 'monthly')),
    period_key VARCHAR(50) NOT NULL, -- 'alltime' or 'YYYY-MM' format
    category VARCHAR(50), -- Only for category leaderboards
    rank INTEGER NOT NULL DEFAULT 0 CHECK (rank >= 0),
    metric_value INTEGER NOT NULL DEFAULT 0 CHECK (metric_value >= 0),
    cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to users table
    CONSTRAINT fk_leaderboards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Composite index for multi-tenant leaderboard queries by type and period
-- Supports: SELECT * FROM leaderboards WHERE tenant_id = ? AND leaderboard_type = ? AND period_key = ? ORDER BY rank
CREATE INDEX idx_leaderboards_tenant_type_period ON leaderboards(tenant_id, leaderboard_type, period_key, rank);

-- Index for user lookups across all leaderboards
-- Supports: SELECT * FROM leaderboards WHERE tenant_id = ? AND user_id = ?
CREATE INDEX idx_leaderboards_tenant_user ON leaderboards(tenant_id, user_id);

-- Index for category-specific leaderboards
-- Supports: SELECT * FROM leaderboards WHERE tenant_id = ? AND leaderboard_type = 'category' AND category = ?
CREATE INDEX idx_leaderboards_tenant_category ON leaderboards(tenant_id, leaderboard_type, category, period_key, rank);

-- Index for finding top N by rank
-- Supports: SELECT * FROM leaderboards WHERE tenant_id = ? AND period_key = ? ORDER BY rank LIMIT N
CREATE INDEX idx_leaderboards_rank ON leaderboards(tenant_id, period_key, rank);

-- Index for cache invalidation and cleanup (find old cached entries)
-- Supports: DELETE FROM leaderboards WHERE cached_at < ?
CREATE INDEX idx_leaderboards_cached_at ON leaderboards(cached_at);

-- Unique constraint: One entry per user per leaderboard type/period/category combination
-- Prevents duplicate entries for same user in same leaderboard
CREATE UNIQUE INDEX idx_leaderboards_unique_user_entry ON leaderboards(
    tenant_id,
    user_id,
    leaderboard_type,
    period_key,
    COALESCE(category, '')
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_leaderboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leaderboards_updated_at
    BEFORE UPDATE ON leaderboards
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboards_updated_at();

-- Comments for documentation
COMMENT ON TABLE leaderboards IS 'Cached leaderboard rankings for performance and historical tracking. Primary data source is Redis sorted sets.';
COMMENT ON COLUMN leaderboards.leaderboard_type IS 'Type of leaderboard: global (all users) or category (specific activity category)';
COMMENT ON COLUMN leaderboards.period IS 'Time period: alltime (never reset) or monthly (reset on 1st of month)';
COMMENT ON COLUMN leaderboards.period_key IS 'Period identifier: "alltime" or "YYYY-MM" format for monthly leaderboards';
COMMENT ON COLUMN leaderboards.category IS 'Activity category for category leaderboards (e.g., quest, learning, social). NULL for global leaderboards.';
COMMENT ON COLUMN leaderboards.rank IS 'User rank in this leaderboard (1-based). 0 indicates not ranked.';
COMMENT ON COLUMN leaderboards.metric_value IS 'Metric value for ranking (e.g., total XP, quest completions, course completions)';
COMMENT ON COLUMN leaderboards.cached_at IS 'Timestamp when this entry was last cached from Redis. Used for cache invalidation.';
