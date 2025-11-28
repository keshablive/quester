-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    refresh_interval INTEGER DEFAULT 60,
    layout JSONB,
    widgets JSONB,
    filters JSONB,
    preferences JSONB,
    shared_with JSONB,
    export_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_dashboards_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_dashboards_refresh_interval
        CHECK (refresh_interval >= 10 AND refresh_interval <= 3600)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_tenant ON dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_user ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_default ON dashboards(is_default);
CREATE INDEX IF NOT EXISTS idx_dashboards_shared ON dashboards(is_shared);
CREATE INDEX IF NOT EXISTS idx_dashboards_deleted ON dashboards(deleted_at);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_tenant_user 
    ON dashboards(tenant_id, user_id);

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_dashboards_layout 
    ON dashboards USING GIN (layout);
CREATE INDEX IF NOT EXISTS idx_dashboards_widgets 
    ON dashboards USING GIN (widgets);
CREATE INDEX IF NOT EXISTS idx_dashboards_filters 
    ON dashboards USING GIN (filters);

-- Add comments
COMMENT ON TABLE dashboards IS 'Customizable analytics dashboards';
COMMENT ON COLUMN dashboards.refresh_interval IS 'Auto-refresh interval in seconds (10-3600)';
COMMENT ON COLUMN dashboards.layout IS 'Dashboard layout configuration';
COMMENT ON COLUMN dashboards.widgets IS 'Array of widget configurations';
