-- Create quest management tables: quest_progress, quest_steps
-- Supports quest tracking with 7 step types and XP multipliers

-- Quest progress table (user progress tracking)
CREATE TABLE IF NOT EXISTS quest_progress (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    quest_id BIGINT NOT NULL,
    current_step_id BIGINT,
    status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'abandoned'
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent INT DEFAULT 0, -- Total seconds
    score INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_quest_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_quest_progress_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
    CONSTRAINT chk_quest_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
    CONSTRAINT chk_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT chk_xp_earned CHECK (xp_earned >= 0),
    CONSTRAINT chk_time_spent CHECK (time_spent >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_tenant ON quest_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest ON quest_progress(quest_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_status ON quest_progress(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_completed ON quest_progress(completed_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_deleted ON quest_progress(deleted_at);

COMMENT ON TABLE quest_progress IS 'User progress tracking for quests with XP multipliers';
COMMENT ON COLUMN quest_progress.xp_earned IS 'Total XP earned (includes 1.5x first-time, 2x perfect multipliers)';

-- Quest steps table (individual steps within quests)
CREATE TABLE IF NOT EXISTS quest_steps (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    quest_id BIGINT NOT NULL,
    step_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    step_type VARCHAR(20) NOT NULL, -- 'text', 'video', 'quiz', 'upload', 'code', 'link', 'review'
    config JSONB, -- Type-specific configuration
    xp_reward INT DEFAULT 10,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_time INT DEFAULT 0, -- Minutes
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_quest_steps_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
    CONSTRAINT chk_step_type CHECK (step_type IN ('text', 'video', 'quiz', 'upload', 'code', 'link', 'review')),
    CONSTRAINT chk_xp_reward CHECK (xp_reward >= 0),
    CONSTRAINT chk_estimated_time CHECK (estimated_time >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quest_steps_tenant ON quest_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_steps_quest ON quest_steps(quest_id, step_order, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quest_steps_deleted ON quest_steps(deleted_at);

-- Add foreign key to quest_progress for current_step_id (circular dependency, add after both tables exist)
ALTER TABLE quest_progress ADD CONSTRAINT fk_quest_progress_current_step FOREIGN KEY (current_step_id) REFERENCES quest_steps(id) ON DELETE SET NULL;

COMMENT ON TABLE quest_steps IS 'Individual steps within quests (7 types: text, video, quiz, upload, code, link, review)';
COMMENT ON COLUMN quest_steps.config IS 'JSON configuration specific to step_type (questions, test cases, etc.)';
