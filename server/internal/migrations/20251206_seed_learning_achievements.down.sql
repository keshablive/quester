-- Rollback learning achievements seed (T010)
-- Remove learning category badges

DELETE FROM badges WHERE category = 'learning' AND name IN (
    'First Steps',
    'Quick Learner',
    'Knowledge Seeker',
    'Scholar',
    'Course Graduate',
    'Multi-Disciplinary',
    'Lifelong Learner',
    'Week Warrior',
    'Fortnight Fighter',
    'Monthly Master',
    'Dedication Legend',
    'XP Starter',
    'XP Hunter',
    'XP Champion',
    'Challenge Accepted',
    'Challenge Champion'
);
