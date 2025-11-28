-- Create user_analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    login_count INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    courses_started INTEGER DEFAULT 0,
    courses_completed INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_attempted INTEGER DEFAULT 0,
    quizzes_passed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    badges_earned INTEGER DEFAULT 0,
    posts_created INTEGER DEFAULT 0,
    comments_created INTEGER DEFAULT 0,
    likes_given INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_user_analytics_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT uq_user_analytics_tenant_user_date
        UNIQUE (tenant_id, user_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_tenant ON user_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_analytics_deleted ON user_analytics(deleted_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_tenant_date 
    ON user_analytics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date 
    ON user_analytics(user_id, date DESC);

-- Add comments
COMMENT ON TABLE user_analytics IS 'Daily user activity and engagement metrics';
COMMENT ON COLUMN user_analytics.active_minutes IS 'Total active time in minutes';
COMMENT ON COLUMN user_analytics.login_count IS 'Number of login sessions';
