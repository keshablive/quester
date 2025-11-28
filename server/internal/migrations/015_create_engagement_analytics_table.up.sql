-- Create engagement_analytics table
CREATE TABLE IF NOT EXISTS engagement_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    total_active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    daily_active_users INTEGER DEFAULT 0,
    weekly_active_users INTEGER DEFAULT 0,
    monthly_active_users INTEGER DEFAULT 0,
    average_session_duration DECIMAL(10,2) DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_engagement_analytics_tenant_date
        UNIQUE (tenant_id, date),
    
    CONSTRAINT chk_engagement_bounce_rate
        CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
    
    CONSTRAINT chk_engagement_conversion_rate
        CHECK (conversion_rate >= 0 AND conversion_rate <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_tenant ON engagement_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_date ON engagement_analytics(date);
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_deleted ON engagement_analytics(deleted_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_tenant_date 
    ON engagement_analytics(tenant_id, date DESC);

-- Add comments
COMMENT ON TABLE engagement_analytics IS 'Platform-wide engagement and activity metrics';
COMMENT ON COLUMN engagement_analytics.average_session_duration IS 'Average session duration in minutes';
COMMENT ON COLUMN engagement_analytics.daily_active_users IS 'Unique active users in last 24 hours';
COMMENT ON COLUMN engagement_analytics.weekly_active_users IS 'Unique active users in last 7 days';
COMMENT ON COLUMN engagement_analytics.monthly_active_users IS 'Unique active users in last 30 days';
