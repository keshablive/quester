-- Migration: Remove social achievements seed data
-- Description: Remove social gamification achievements
-- Date: 2025-11-26

-- Delete social achievements (cascades to user_achievements)
DELETE FROM achievements WHERE category = 'social' AND name IN (
    'First Post',
    'Content Creator',
    'Prolific Poster',
    'Social Influencer',
    'First Like',
    'Appreciator',
    'Super Supporter',
    'Like Machine',
    'Heart of Gold',
    'Conversation Starter',
    'Active Commenter',
    'Discussion Leader',
    'Community Voice',
    'First Connection',
    'Networker',
    'Social Butterfly',
    'Community Builder',
    'Getting Noticed',
    'Rising Star',
    'Popular Creator',
    'Viral Sensation',
    'First Share',
    'Share Enthusiast',
    'Content Amplifier'
);
