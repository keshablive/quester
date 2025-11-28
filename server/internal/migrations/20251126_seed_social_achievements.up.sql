-- Migration: Seed social achievements
-- Description: Add social gamification achievements for posts, likes, comments, followers
-- Date: 2025-11-26

-- Insert social achievements for posts
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'First Post',
    'Create your first social post and share with the community',
    '/icons/achievements/first-post.svg',
    'social',
    'count',
    1,
    25,
    'easy',
    100,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Content Creator',
    'Create 10 social posts',
    '/icons/achievements/content-creator.svg',
    'social',
    'count',
    10,
    100,
    'easy',
    101,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Prolific Poster',
    'Create 50 social posts',
    '/icons/achievements/prolific-poster.svg',
    'social',
    'count',
    50,
    300,
    'medium',
    102,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Social Influencer',
    'Create 100 social posts',
    '/icons/achievements/social-influencer.svg',
    'social',
    'count',
    100,
    500,
    'hard',
    103,
    true
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert social achievements for likes given
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'First Like',
    'Like your first post',
    '/icons/achievements/first-like.svg',
    'social',
    'count',
    1,
    10,
    'easy',
    110,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Appreciator',
    'Give 10 likes to posts',
    '/icons/achievements/appreciator.svg',
    'social',
    'count',
    10,
    50,
    'easy',
    111,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Super Supporter',
    'Give 50 likes to posts',
    '/icons/achievements/super-supporter.svg',
    'social',
    'count',
    50,
    200,
    'medium',
    112,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Like Machine',
    'Give 100 likes to posts',
    '/icons/achievements/like-machine.svg',
    'social',
    'count',
    100,
    400,
    'medium',
    113,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Heart of Gold',
    'Give 500 likes to posts',
    '/icons/achievements/heart-of-gold.svg',
    'social',
    'count',
    500,
    1000,
    'hard',
    114,
    true
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert social achievements for comments
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Conversation Starter',
    'Write your first comment',
    '/icons/achievements/conversation-starter.svg',
    'social',
    'count',
    1,
    15,
    'easy',
    120,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Active Commenter',
    'Write 10 comments',
    '/icons/achievements/active-commenter.svg',
    'social',
    'count',
    10,
    75,
    'easy',
    121,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Discussion Leader',
    'Write 50 comments',
    '/icons/achievements/discussion-leader.svg',
    'social',
    'count',
    50,
    250,
    'medium',
    122,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Community Voice',
    'Write 100 comments',
    '/icons/achievements/community-voice.svg',
    'social',
    'count',
    100,
    500,
    'hard',
    123,
    true
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert social achievements for followers
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'First Connection',
    'Follow your first user',
    '/icons/achievements/first-connection.svg',
    'social',
    'count',
    1,
    10,
    'easy',
    130,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Networker',
    'Follow 5 users',
    '/icons/achievements/networker.svg',
    'social',
    'count',
    5,
    50,
    'easy',
    131,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Social Butterfly',
    'Follow 25 users',
    '/icons/achievements/social-butterfly.svg',
    'social',
    'count',
    25,
    150,
    'medium',
    132,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Community Builder',
    'Follow 100 users',
    '/icons/achievements/community-builder.svg',
    'social',
    'count',
    100,
    400,
    'hard',
    133,
    true
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert achievements for gaining followers (likes received as proxy for popularity)
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Getting Noticed',
    'Receive 10 likes on your posts',
    '/icons/achievements/getting-noticed.svg',
    'social',
    'count',
    10,
    50,
    'easy',
    140,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Rising Star',
    'Receive 100 likes on your posts',
    '/icons/achievements/rising-star.svg',
    'social',
    'count',
    100,
    250,
    'medium',
    141,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Popular Creator',
    'Receive 500 likes on your posts',
    '/icons/achievements/popular-creator.svg',
    'social',
    'count',
    500,
    750,
    'hard',
    142,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Viral Sensation',
    'Receive 1000 likes on your posts',
    '/icons/achievements/viral-sensation.svg',
    'social',
    'count',
    1000,
    1500,
    'epic',
    143,
    true
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert achievements for shares
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'First Share',
    'Share your first post',
    '/icons/achievements/first-share.svg',
    'social',
    'count',
    1,
    15,
    'easy',
    150,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Share Enthusiast',
    'Share 10 posts',
    '/icons/achievements/share-enthusiast.svg',
    'social',
    'count',
    10,
    100,
    'easy',
    151,
    true
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, xp_reward, difficulty, sort_order, active)
SELECT 
    id as tenant_id,
    'Content Amplifier',
    'Share 50 posts',
    '/icons/achievements/content-amplifier.svg',
    'social',
    'count',
    50,
    350,
    'medium',
    152,
    true
FROM tenants
ON CONFLICT DO NOTHING;
