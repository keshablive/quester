-- Create dashboard_metrics table
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    value DECIMAL(20,2) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    format VARCHAR(50),
    unit VARCHAR(20),
    icon VARCHAR(50),
    trend VARCHAR(20),
    change DECIMAL(10,2),
    target DECIMAL(20,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_dashboard_metric_format
        CHECK (format IN ('number', 'percentage', 'currency', 'duration', 'ratio')),
    
    CONSTRAINT chk_dashboard_metric_trend
        CHECK (trend IN ('up', 'down', 'stable', 'neutral'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_metric_tenant ON dashboard_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metric_name ON dashboard_metrics(name);
CREATE INDEX IF NOT EXISTS idx_dashboard_metric_category ON dashboard_metrics(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_metric_deleted ON dashboard_metrics(deleted_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_dashboard_metric_tenant_category 
    ON dashboard_metrics(tenant_id, category);

-- Add comments
COMMENT ON TABLE dashboard_metrics IS 'Real-time metrics displayed on dashboards';
COMMENT ON COLUMN dashboard_metrics.format IS 'Display format: number, percentage, currency, duration, ratio';
COMMENT ON COLUMN dashboard_metrics.trend IS 'Trend direction: up, down, stable, neutral';
COMMENT ON COLUMN dashboard_metrics.change IS 'Percentage change from previous period';
