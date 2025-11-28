-- Rollback Phase 2: Revert UUID primary keys back to uint
-- WARNING: This is a complex rollback that requires the original uint IDs to still exist
-- This rollback is primarily for emergency use in staging/testing
-- Production rollback would require restoring from backup

RAISE EXCEPTION 'Phase 2 rollback is not supported. Restore from database backup instead.';

-- Note: A proper rollback would require:
-- 1. Re-adding uint ID columns
-- 2. Repopulating them from a backup or sequence
-- 3. Updating all foreign keys
-- 4. Switching primary keys back
-- 5. Removing UUID columns
--
-- This is complex and error-prone. The recommended approach is to:
-- - Test Phase 2 thoroughly in staging before production
-- - Take a full database backup before running Phase 2 in production
-- - Restore from backup if rollback is needed
