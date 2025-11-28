-- Create groups table first (referenced by messages)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL,
    group_type VARCHAR(50) NOT NULL DEFAULT 'private',
    max_members INTEGER NOT NULL DEFAULT 100,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_groups_tenant ON groups(tenant_id);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_type ON groups(group_type);
CREATE INDEX idx_groups_deleted ON groups(deleted_at);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_members_tenant ON group_members(tenant_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);
CREATE INDEX idx_group_members_deleted ON group_members(deleted_at);
CREATE UNIQUE INDEX idx_group_members_unique ON group_members(group_id, user_id) WHERE deleted_at IS NULL;

-- Create partitioned messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    recipient_id UUID,
    group_id UUID,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    metadata JSONB,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CHECK (content IS NOT NULL OR media_url IS NOT NULL),
    CHECK (recipient_id IS NOT NULL OR group_id IS NOT NULL)
) PARTITION BY RANGE (created_at);

-- Create indexes on the partitioned table
CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_deleted ON messages(deleted_at);
CREATE INDEX idx_messages_type ON messages(message_type);

-- Create initial partitions (3 months: previous, current, next)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
    -- Previous month partition
    start_date := current_month - INTERVAL '1 month';
    end_date := current_month;
    partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    -- Current month partition
    start_date := current_month;
    end_date := current_month + INTERVAL '1 month';
    partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    -- Next month partition
    start_date := current_month + INTERVAL '1 month';
    end_date := current_month + INTERVAL '2 months';
    partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END $$;

-- Create function to auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition_for_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
BEGIN
    start_date := next_month;
    end_date := next_month + INTERVAL '1 month';
    partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
    
    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF messages
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        RAISE NOTICE 'Created partition % for messages', partition_name;
    END IF;
END;
$$;

-- Create function to delete old partitions (retention policy)
CREATE OR REPLACE FUNCTION drop_old_message_partitions(retention_months INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
BEGIN
    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'messages_%'
        AND tablename ~ '^messages_\d{4}_\d{2}$'
    LOOP
        -- Extract date from partition name (e.g., messages_2025_01)
        DECLARE
            partition_date DATE;
            year_str TEXT;
            month_str TEXT;
        BEGIN
            year_str := SUBSTRING(partition_record.tablename FROM 10 FOR 4);
            month_str := SUBSTRING(partition_record.tablename FROM 15 FOR 2);
            partition_date := TO_DATE(year_str || '-' || month_str || '-01', 'YYYY-MM-DD');
            
            IF partition_date < cutoff_date THEN
                EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
                RAISE NOTICE 'Dropped old partition %', partition_record.tablename;
            END IF;
        END;
    END LOOP;
END;
$$;

-- Create message_threads view for easier querying
CREATE OR REPLACE VIEW message_threads AS
SELECT DISTINCT ON (thread_id)
    CASE
        WHEN m.group_id IS NOT NULL THEN CONCAT('group_', m.group_id)
        WHEN m.sender_id < m.recipient_id THEN CONCAT(m.sender_id, '_', m.recipient_id)
        ELSE CONCAT(m.recipient_id, '_', m.sender_id)
    END AS thread_id,
    m.tenant_id,
    m.group_id,
    CASE
        WHEN m.group_id IS NOT NULL THEN NULL
        WHEN m.sender_id < m.recipient_id THEN m.recipient_id
        ELSE m.sender_id
    END AS user1_id,
    CASE
        WHEN m.group_id IS NOT NULL THEN NULL
        WHEN m.sender_id < m.recipient_id THEN m.sender_id
        ELSE m.recipient_id
    END AS user2_id,
    m.id AS last_message_id,
    m.content AS last_message_content,
    m.message_type AS last_message_type,
    m.created_at AS last_message_at,
    COUNT(*) FILTER (WHERE m.read_at IS NULL AND m.recipient_id IS NOT NULL) AS unread_count
FROM messages m
WHERE m.deleted_at IS NULL
GROUP BY thread_id, m.tenant_id, m.group_id, user1_id, user2_id, 
         m.id, m.content, m.message_type, m.created_at
ORDER BY thread_id, m.created_at DESC;

-- Create trigger to automatically create next month's partition
CREATE OR REPLACE FUNCTION trigger_create_monthly_partition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if we're in the last week of the month
    IF EXTRACT(DAY FROM CURRENT_DATE) >= 24 THEN
        PERFORM create_monthly_partition_for_messages();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_monthly_partition
    BEFORE INSERT ON messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_create_monthly_partition();

-- Add comments for documentation
COMMENT ON TABLE messages IS 'Stores all messages (direct and group) with monthly partitioning';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, video, file, audio';
COMMENT ON COLUMN messages.metadata IS 'Extensible JSONB field for additional message data';
COMMENT ON COLUMN messages.recipient_id IS 'Direct message recipient (NULL for group messages)';
COMMENT ON COLUMN messages.group_id IS 'Group message destination (NULL for direct messages)';

COMMENT ON TABLE groups IS 'Stores group chat information';
COMMENT ON COLUMN groups.group_type IS 'Type of group: private, public';
COMMENT ON COLUMN groups.max_members IS 'Maximum number of members allowed in the group';

COMMENT ON TABLE group_members IS 'Junction table for group membership with roles';
COMMENT ON COLUMN group_members.role IS 'Member role: admin, moderator, member';
COMMENT ON COLUMN group_members.left_at IS 'Timestamp when member left the group (NULL if active)';

COMMENT ON FUNCTION create_monthly_partition_for_messages() IS 'Automatically creates next month partition for messages table';
COMMENT ON FUNCTION drop_old_message_partitions(INTEGER) IS 'Drops message partitions older than specified retention period (default 1 month)';
