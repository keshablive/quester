-- Rollback content milestones table

DROP INDEX IF EXISTS idx_milestone_content;
DROP INDEX IF EXISTS idx_milestone_author;
DROP INDEX IF EXISTS idx_milestone_tenant;
DROP TABLE IF EXISTS content_milestones;
