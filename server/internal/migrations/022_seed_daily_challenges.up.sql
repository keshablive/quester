-- Migration: Seed daily challenge templates
-- US6/FR-010: Daily Social Challenges with XP rewards
-- T072: Define challenge templates seed data

-- Note: These are templates. User challenges are created dynamically when users view the challenges page.
-- Each tenant can have their own set of active challenges.

-- For default tenant (will be applied to all tenants via trigger or manual seeding)
-- Using a function to insert for each tenant

DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT id FROM tenants LOOP
        -- Insert challenge templates for each tenant
        INSERT INTO daily_challenge_templates (tenant_id, name, description, action_type, target_count, xp_reward, icon_name, sort_order, active)
        VALUES
            -- Easy challenges (low target, moderate XP)
            (tenant_record.id, 'Social Butterfly', 'Like 5 posts from others', 'like', 5, 25, 'heart', 1, true),
            (tenant_record.id, 'Voice Your Opinion', 'Leave 3 comments on posts', 'comment', 3, 30, 'message-circle', 2, true),
            (tenant_record.id, 'Share the Love', 'Share 2 posts with your network', 'share', 2, 20, 'share-2', 3, true),
            
            -- Medium challenges (higher target, better XP)
            (tenant_record.id, 'Content Creator', 'Create 1 new post', 'post', 1, 50, 'edit-3', 4, true),
            (tenant_record.id, 'Community Builder', 'Follow 2 new people', 'follow', 2, 35, 'user-plus', 5, true),
            (tenant_record.id, 'Engagement Master', 'Perform 10 social actions (any type)', 'any', 10, 75, 'zap', 6, true)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Create function to auto-seed challenges for new tenants
CREATE OR REPLACE FUNCTION seed_daily_challenges_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_challenge_templates (tenant_id, name, description, action_type, target_count, xp_reward, icon_name, sort_order, active)
    VALUES
        (NEW.id, 'Social Butterfly', 'Like 5 posts from others', 'like', 5, 25, 'heart', 1, true),
        (NEW.id, 'Voice Your Opinion', 'Leave 3 comments on posts', 'comment', 3, 30, 'message-circle', 2, true),
        (NEW.id, 'Share the Love', 'Share 2 posts with your network', 'share', 2, 20, 'share-2', 3, true),
        (NEW.id, 'Content Creator', 'Create 1 new post', 'post', 1, 50, 'edit-3', 4, true),
        (NEW.id, 'Community Builder', 'Follow 2 new people', 'follow', 2, 35, 'user-plus', 5, true),
        (NEW.id, 'Engagement Master', 'Perform 10 social actions (any type)', 'any', 10, 75, 'zap', 6, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-seeding new tenants
DROP TRIGGER IF EXISTS trigger_seed_daily_challenges ON tenants;
CREATE TRIGGER trigger_seed_daily_challenges
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION seed_daily_challenges_for_tenant();

-- Add comments
COMMENT ON FUNCTION seed_daily_challenges_for_tenant() IS 'Auto-seeds daily challenge templates for new tenants';
