-- T402: Rollback backup_codes table

DROP INDEX IF EXISTS idx_backup_codes_deleted_at;
DROP INDEX IF EXISTS idx_backup_codes_user_id;
DROP TABLE IF EXISTS backup_codes;
