-- Create analytics, WebSocket, and video streaming tables
-- Supports time-series analytics, active WebSocket connections, and video assets

-- Analytics events table (time-series platform usage events)
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50), -- 'engagement', 'conversion', 'error'
    properties JSONB, -- Event-specific data
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_analytics_category CHECK (event_category IN ('engagement', 'conversion', 'error', NULL))
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type, tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_deleted ON analytics_events(deleted_at);

COMMENT ON TABLE analytics_events IS 'Time-series platform usage events (90-day retention)';
COMMENT ON COLUMN analytics_events.properties IS 'JSON with event-specific data (50+ event types)';

-- WebSocket connections table (active connection tracking)
CREATE TABLE IF NOT EXISTS websocket_connections (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ping_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rooms JSONB, -- Array of room IDs subscribed
    server_instance VARCHAR(50), -- Server hostname for routing
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_websocket_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_websocket_tenant ON websocket_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_websocket_user ON websocket_connections(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_websocket_session ON websocket_connections(session_id);
CREATE INDEX IF NOT EXISTS idx_websocket_last_ping ON websocket_connections(last_ping_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_websocket_deleted ON websocket_connections(deleted_at);

COMMENT ON TABLE websocket_connections IS 'Active WebSocket connection tracking with heartbeat';
COMMENT ON COLUMN websocket_connections.last_ping_at IS 'Cleanup stale connections if > 60s old';

-- Video assets table (video metadata and processing status)
CREATE TABLE IF NOT EXISTS video_assets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    uploader_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_url VARCHAR(500) NOT NULL,
    master_playlist_url VARCHAR(500), -- HLS master playlist
    thumbnail_url VARCHAR(500),
    duration INT DEFAULT 0, -- Seconds
    file_size BIGINT, -- Bytes
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
    quality_variants JSONB, -- Array of quality levels with URLs
    view_count INT DEFAULT 0,
    watch_time_total INT DEFAULT 0, -- Total seconds watched by all users
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_video_assets_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_video_status CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
    CONSTRAINT chk_video_duration CHECK (duration >= 0),
    CONSTRAINT chk_video_view_count CHECK (view_count >= 0),
    CONSTRAINT chk_video_watch_time CHECK (watch_time_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_video_assets_tenant ON video_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_uploader ON video_assets(uploader_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status ON video_assets(processing_status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_views ON video_assets(view_count DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_deleted ON video_assets(deleted_at);

COMMENT ON TABLE video_assets IS 'Video metadata with HLS transcoding status (FFmpeg async processing)';
COMMENT ON COLUMN video_assets.quality_variants IS 'JSON array of quality levels: [360p, 480p, 720p, 1080p]';

-- Live streams table (live broadcast sessions)
CREATE TABLE IF NOT EXISTS live_streams (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    streamer_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    rtmp_key VARCHAR(100) UNIQUE NOT NULL, -- Secret for RTMP auth
    hls_playlist_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'live', 'ended', 'recording'
    viewer_count INT DEFAULT 0,
    peak_viewers INT DEFAULT 0,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    recording_url VARCHAR(500),
    is_dvr_enabled BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_live_streams_streamer FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_live_stream_status CHECK (status IN ('scheduled', 'live', 'ended', 'recording')),
    CONSTRAINT chk_live_stream_viewer_count CHECK (viewer_count >= 0),
    CONSTRAINT chk_live_stream_peak_viewers CHECK (peak_viewers >= 0)
);

CREATE INDEX IF NOT EXISTS idx_live_streams_tenant ON live_streams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_streamer ON live_streams(streamer_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_rtmp_key ON live_streams(rtmp_key);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_started ON live_streams(started_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_deleted ON live_streams(deleted_at);

COMMENT ON TABLE live_streams IS 'RTMP live streaming sessions with DVR recording (max 8h)';
COMMENT ON COLUMN live_streams.rtmp_key IS 'UUID secret used for RTMP authentication';
