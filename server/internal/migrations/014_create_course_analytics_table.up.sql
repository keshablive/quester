-- Create course_analytics table
CREATE TABLE IF NOT EXISTS course_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    course_id UUID NOT NULL,
    date DATE NOT NULL,
    total_enrollments INTEGER DEFAULT 0,
    active_students INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    average_progress DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    dropout_rate DECIMAL(5,2) DEFAULT 0,
    average_time_spent INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT uq_course_analytics_tenant_course_date
        UNIQUE (tenant_id, course_id, date),
    
    CONSTRAINT chk_course_analytics_completion_rate
        CHECK (completion_rate >= 0 AND completion_rate <= 100),
    
    CONSTRAINT chk_course_analytics_average_progress
        CHECK (average_progress >= 0 AND average_progress <= 100),
    
    CONSTRAINT chk_course_analytics_average_rating
        CHECK (average_rating >= 0 AND average_rating <= 5),
    
    CONSTRAINT chk_course_analytics_dropout_rate
        CHECK (dropout_rate >= 0 AND dropout_rate <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_analytics_tenant ON course_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course ON course_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_date ON course_analytics(date);
CREATE INDEX IF NOT EXISTS idx_course_analytics_deleted ON course_analytics(deleted_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_course_analytics_tenant_date 
    ON course_analytics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course_date 
    ON course_analytics(course_id, date DESC);

-- Add comments
COMMENT ON TABLE course_analytics IS 'Daily course performance and engagement metrics';
COMMENT ON COLUMN course_analytics.average_time_spent IS 'Average time spent in minutes';
COMMENT ON COLUMN course_analytics.total_revenue IS 'Total revenue generated from course';
