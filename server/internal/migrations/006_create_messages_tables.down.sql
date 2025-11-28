-- Drop triggers first
DROP TRIGGER IF EXISTS ensure_monthly_partition ON messages;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_create_monthly_partition();
DROP FUNCTION IF EXISTS drop_old_message_partitions(INTEGER);
DROP FUNCTION IF EXISTS create_monthly_partition_for_messages();

-- Drop views
DROP VIEW IF EXISTS message_threads;

-- Drop message partitions
DO $$
DECLARE
    partition_record RECORD;
BEGIN
    FOR partition_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename LIKE 'messages_%'
        AND tablename ~ '^messages_\d{4}_\d{2}$'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_record.tablename);
    END LOOP;
END $$;

-- Drop messages table
DROP TABLE IF EXISTS messages CASCADE;

-- Drop group_members table
DROP TABLE IF EXISTS group_members CASCADE;

-- Drop groups table
DROP TABLE IF EXISTS groups CASCADE;
