-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    format VARCHAR(20),
    file_url TEXT,
    file_size INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_reports_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_reports_type
        CHECK (type IN ('user_activity', 'course_performance', 'engagement', 'revenue', 'custom')),
    
    CONSTRAINT chk_reports_period
        CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
    
    CONSTRAINT chk_reports_status
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    CONSTRAINT chk_reports_format
        CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    
    CONSTRAINT chk_reports_dates
        CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_deleted ON reports(deleted_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_tenant_user 
    ON reports(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant_status 
    ON reports(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_created 
    ON reports(created_at DESC);

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_reports_metadata 
    ON reports USING GIN (metadata);

-- Add comments
COMMENT ON TABLE reports IS 'Generated analytics reports';
COMMENT ON COLUMN reports.file_size IS 'Report file size in bytes';
COMMENT ON COLUMN reports.record_count IS 'Number of records included in report';
