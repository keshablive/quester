-- Seed learning achievements (T009)
-- Pre-defined achievements for learning category
-- FR-010: Award achievements for learning milestones

-- Insert learning achievements into badges table
-- These use the existing badges table structure

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'First Steps',
    'Complete your first lesson',
    '/badges/learning/first-steps.svg',
    'COMMON',
    'lesson_count',
    1,
    25,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'First Steps' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Quick Learner',
    'Complete 5 lessons',
    '/badges/learning/quick-learner.svg',
    'COMMON',
    'lesson_count',
    5,
    50,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Quick Learner' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Knowledge Seeker',
    'Complete 25 lessons',
    '/badges/learning/knowledge-seeker.svg',
    'UNCOMMON',
    'lesson_count',
    25,
    100,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Knowledge Seeker' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Scholar',
    'Complete 100 lessons',
    '/badges/learning/scholar.svg',
    'RARE',
    'lesson_count',
    100,
    250,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Scholar' AND b.category = 'learning'
);

-- Course completion achievements
INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Course Graduate',
    'Complete your first course',
    '/badges/learning/course-graduate.svg',
    'UNCOMMON',
    'course_count',
    1,
    100,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Course Graduate' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Multi-Disciplinary',
    'Complete 5 courses',
    '/badges/learning/multi-disciplinary.svg',
    'RARE',
    'course_count',
    5,
    250,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Multi-Disciplinary' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Lifelong Learner',
    'Complete 25 courses',
    '/badges/learning/lifelong-learner.svg',
    'EPIC',
    'course_count',
    25,
    500,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Lifelong Learner' AND b.category = 'learning'
);

-- Streak achievements
INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Week Warrior',
    'Maintain a 7-day learning streak',
    '/badges/learning/week-warrior.svg',
    'COMMON',
    'streak_days',
    7,
    50,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Week Warrior' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Fortnight Fighter',
    'Maintain a 14-day learning streak',
    '/badges/learning/fortnight-fighter.svg',
    'UNCOMMON',
    'streak_days',
    14,
    100,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Fortnight Fighter' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Monthly Master',
    'Maintain a 30-day learning streak',
    '/badges/learning/monthly-master.svg',
    'RARE',
    'streak_days',
    30,
    250,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Monthly Master' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Dedication Legend',
    'Maintain a 100-day learning streak',
    '/badges/learning/dedication-legend.svg',
    'LEGENDARY',
    'streak_days',
    100,
    1000,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Dedication Legend' AND b.category = 'learning'
);

-- XP milestones
INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'XP Starter',
    'Earn 100 learning XP',
    '/badges/learning/xp-starter.svg',
    'COMMON',
    'learning_xp',
    100,
    25,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'XP Starter' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'XP Hunter',
    'Earn 1,000 learning XP',
    '/badges/learning/xp-hunter.svg',
    'UNCOMMON',
    'learning_xp',
    1000,
    100,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'XP Hunter' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'XP Champion',
    'Earn 10,000 learning XP',
    '/badges/learning/xp-champion.svg',
    'EPIC',
    'learning_xp',
    10000,
    500,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'XP Champion' AND b.category = 'learning'
);

-- Challenge achievements
INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Challenge Accepted',
    'Complete your first daily challenge',
    '/badges/learning/challenge-accepted.svg',
    'COMMON',
    'challenge_count',
    1,
    25,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Challenge Accepted' AND b.category = 'learning'
);

INSERT INTO badges (id, tenant_id, name, description, icon_url, rarity, criteria_type, criteria_value, xp_reward, category, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    t.id,
    'Challenge Champion',
    'Complete 50 daily challenges',
    '/badges/learning/challenge-champion.svg',
    'RARE',
    'challenge_count',
    50,
    250,
    'learning',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM badges b WHERE b.tenant_id = t.id AND b.name = 'Challenge Champion' AND b.category = 'learning'
);

COMMENT ON COLUMN badges.category IS 'Badge category: social, learning, achievement, etc.';
