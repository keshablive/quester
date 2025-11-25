-- Create report_executions table
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    schedule_id UUID NOT NULL,
    report_id UUID,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL,
    record_count INTEGER DEFAULT 0,
    file_url TEXT,
    file_size INTEGER DEFAULT 0,
    error_message TEXT,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_report_executions_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES report_schedules(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_report_executions_report
        FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE SET NULL,
    
    CONSTRAINT chk_report_executions_status
        CHECK (status IN ('running', 'success', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_executions_tenant ON report_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_schedule ON report_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_started ON report_executions(started_at DESC);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_report_executions_schedule_status 
    ON report_executions(schedule_id, status);

-- Add comments
COMMENT ON TABLE report_executions IS 'Execution history of scheduled reports';
COMMENT ON COLUMN report_executions.duration IS 'Execution duration in seconds';
COMMENT ON COLUMN report_executions.file_size IS 'Generated file size in bytes';
