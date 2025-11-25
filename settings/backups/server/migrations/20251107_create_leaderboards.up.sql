-- Create leaderboards table for cached rankings
-- Supports global, quest, and course leaderboards with periodic updates

CREATE TABLE IF NOT EXISTS leaderboards (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    leaderboard_type VARCHAR(50) NOT NULL, -- 'global', 'quest', 'course'
    reference_id BIGINT, -- Quest/Course ID if applicable
    rank INT NOT NULL,
    score INT NOT NULL,
    period_type VARCHAR(20), -- 'all_time', 'monthly', 'weekly', 'daily'
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_leaderboards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_leaderboard_type CHECK (leaderboard_type IN ('global', 'quest', 'course')),
    CONSTRAINT chk_leaderboard_period_type CHECK (period_type IN ('all_time', 'monthly', 'weekly', 'daily', NULL)),
    CONSTRAINT chk_leaderboard_rank CHECK (rank >= 1),
    CONSTRAINT chk_leaderboard_score CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_tenant ON leaderboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON leaderboards(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(leaderboard_type, reference_id, period_type, rank, tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_score ON leaderboards(score DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_deleted ON leaderboards(deleted_at);

COMMENT ON TABLE leaderboards IS 'Cached leaderboard entries updated every 5 minutes (top 1000 in Redis)';
COMMENT ON COLUMN leaderboards.rank IS 'Tie-breaker: completion time → join date → user ID';
COMMENT ON COLUMN leaderboards.reference_id IS 'NULL for global, Quest/Course ID for specific leaderboards';
