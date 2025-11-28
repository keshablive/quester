-- Create report_schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    day_of_week INTEGER DEFAULT 0,
    day_of_month INTEGER DEFAULT 1,
    time_of_day VARCHAR(5),
    timezone VARCHAR(50) DEFAULT 'UTC',
    format VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    recipients TEXT[],
    filters JSONB,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_report_schedules_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_report_schedules_frequency
        CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    
    CONSTRAINT chk_report_schedules_day_of_week
        CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    CONSTRAINT chk_report_schedules_day_of_month
        CHECK (day_of_month >= 1 AND day_of_month <= 31),
    
    CONSTRAINT chk_report_schedules_format
        CHECK (format IN ('pdf', 'excel', 'csv', 'json'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON report_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_user ON report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON report_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_deleted ON report_schedules(deleted_at);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant_active 
    ON report_schedules(tenant_id, is_active);

-- Create GIN index for filters JSONB queries
CREATE INDEX IF NOT EXISTS idx_report_schedules_filters 
    ON report_schedules USING GIN (filters);

-- Add comments
COMMENT ON TABLE report_schedules IS 'Scheduled report configurations';
COMMENT ON COLUMN report_schedules.day_of_week IS '0-6 where 0 is Sunday';
COMMENT ON COLUMN report_schedules.time_of_day IS 'Time in HH:MM format';
COMMENT ON COLUMN report_schedules.recipients IS 'Array of email addresses';
