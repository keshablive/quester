-- Migration: Remove daily challenge seed data
-- Rollback for 022_seed_daily_challenges.up.sql

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_seed_daily_challenges ON tenants;

-- Drop the function
DROP FUNCTION IF EXISTS seed_daily_challenges_for_tenant();

-- Remove seed data (only the predefined templates, not user-created ones)
DELETE FROM daily_challenge_templates 
WHERE name IN (
    'Social Butterfly',
    'Voice Your Opinion', 
    'Share the Love',
    'Content Creator',
    'Community Builder',
    'Engagement Master'
);
