-- Migration: Create video_streams table for live streaming and VOD
-- Purpose: Store video stream metadata, status, URLs, and DVR configuration
-- Features: RTMP ingest, HLS playback, DVR, retention policy, viewer tracking

CREATE TABLE IF NOT EXISTS video_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Stream configuration
    stream_type VARCHAR(10) NOT NULL DEFAULT 'live' CHECK (stream_type IN ('live', 'vod')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'ended', 'error')),
    stream_key VARCHAR(64) UNIQUE NOT NULL,
    
    -- URLs
    ingest_url VARCHAR(500),
    playback_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Stream metadata
    viewer_count INTEGER NOT NULL DEFAULT 0,
    peak_viewers INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    dvr_enabled BOOLEAN NOT NULL DEFAULT true,
    dvr_window INTEGER NOT NULL DEFAULT 7200, -- 2 hours in seconds
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Retention
    retention_until TIMESTAMP WITH TIME ZONE,
    
    -- Creator info (denormalized)
    creator_name VARCHAR(100),
    creator_avatar VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_dvr_window CHECK (dvr_window >= 0 AND dvr_window <= 14400), -- Max 4 hours
    CONSTRAINT valid_duration CHECK (duration >= 0),
    CONSTRAINT valid_viewer_count CHECK (viewer_count >= 0),
    CONSTRAINT scheduled_before_start CHECK (scheduled_at IS NULL OR started_at IS NULL OR scheduled_at <= started_at),
    CONSTRAINT start_before_end CHECK (started_at IS NULL OR ended_at IS NULL OR started_at <= ended_at)
);

-- Indexes for performance

-- Composite index for filtering by tenant and creator
CREATE INDEX idx_streams_tenant ON video_streams(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_streams_creator ON video_streams(creator_id) WHERE deleted_at IS NULL;

-- Composite index for filtering by type and status (common query pattern)
CREATE INDEX idx_streams_type_status ON video_streams(stream_type, status) WHERE deleted_at IS NULL;

-- Index for scheduled streams
CREATE INDEX idx_streams_scheduled ON video_streams(scheduled_at) WHERE deleted_at IS NULL AND scheduled_at IS NOT NULL;

-- Index for retention cleanup cron job
CREATE INDEX idx_streams_retention ON video_streams(retention_until) WHERE deleted_at IS NULL AND retention_until IS NOT NULL;

-- Index for live streams (viewer count updates)
CREATE INDEX idx_streams_live ON video_streams(status, viewer_count DESC) WHERE deleted_at IS NULL AND status = 'live';

-- Unique index on stream_key for RTMP authentication
CREATE UNIQUE INDEX idx_streams_stream_key ON video_streams(stream_key) WHERE deleted_at IS NULL;

-- Index for soft deletes
CREATE INDEX idx_streams_deleted_at ON video_streams(deleted_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_streams_updated_at
    BEFORE UPDATE ON video_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_video_streams_updated_at();

-- Trigger to update creator denormalized fields from users table
CREATE OR REPLACE FUNCTION sync_video_stream_creator_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update creator_name and creator_avatar when creator_id changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.creator_id != OLD.creator_id) THEN
        SELECT name, avatar_url 
        INTO NEW.creator_name, NEW.creator_avatar
        FROM users 
        WHERE id = NEW.creator_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_video_stream_creator_info
    BEFORE INSERT OR UPDATE ON video_streams
    FOR EACH ROW
    EXECUTE FUNCTION sync_video_stream_creator_info();

-- Comments for documentation
COMMENT ON TABLE video_streams IS 'Stores video stream metadata for live streaming and VOD content';
COMMENT ON COLUMN video_streams.stream_key IS 'Secret key for RTMP authentication, should never be exposed to clients';
COMMENT ON COLUMN video_streams.ingest_url IS 'RTMP ingest URL with stream key for broadcasters';
COMMENT ON COLUMN video_streams.playback_url IS 'HLS master playlist URL for viewers (signed)';
COMMENT ON COLUMN video_streams.dvr_enabled IS 'Enable DVR (rewind) functionality for live streams';
COMMENT ON COLUMN video_streams.dvr_window IS 'DVR window in seconds (default 2 hours = 7200s)';
COMMENT ON COLUMN video_streams.retention_until IS 'Automatic deletion date for stream data';
COMMENT ON COLUMN video_streams.viewer_count IS 'Current number of concurrent viewers (live streams only)';
COMMENT ON COLUMN video_streams.peak_viewers IS 'Maximum concurrent viewers achieved during stream';
COMMENT ON COLUMN video_streams.total_views IS 'Total number of views (includes VOD replays)';
