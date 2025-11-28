-- Rollback migration for video_streams table

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_sync_video_stream_creator_info ON video_streams;
DROP TRIGGER IF EXISTS trigger_update_video_streams_updated_at ON video_streams;

-- Drop trigger functions
DROP FUNCTION IF EXISTS sync_video_stream_creator_info();
DROP FUNCTION IF EXISTS update_video_streams_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_streams_deleted_at;
DROP INDEX IF EXISTS idx_streams_stream_key;
DROP INDEX IF EXISTS idx_streams_live;
DROP INDEX IF EXISTS idx_streams_retention;
DROP INDEX IF EXISTS idx_streams_scheduled;
DROP INDEX IF EXISTS idx_streams_type_status;
DROP INDEX IF EXISTS idx_streams_creator;
DROP INDEX IF EXISTS idx_streams_tenant;

-- Drop table
DROP TABLE IF EXISTS video_streams;
