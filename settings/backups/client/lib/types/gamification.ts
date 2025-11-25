// Feature 003: Gamification Types

export type XPSource =
  | 'quest_completion'
  | 'lesson_completion'
  | 'course_completion'
  | 'daily_login'
  | 'social_interaction'
  | 'marketplace_purchase'
  | 'video_upload'
  | 'comment'
  | 'like'
  | 'other';

export interface GamificationMetrics {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXPEarned: number;
  points: number;
  totalPointsEarned: number;
  badges: Badge[];
  currentStreak: number;
  leaderboardRank?: number;
  xpBreakdown: XPBreakdown;
}

export interface XPBreakdown {
  quests: number;
  learning: number;
  marketplace: number;
  social: number;
  referrals: number;
  other: number;
}

export interface XPGain {
  id: string;
  amount: number;
  source: string;
  description: string;
  timestamp: number;
  feature: string;
}

export interface LevelUp {
  oldLevel: number;
  newLevel: number;
  unlockedFeatures: string[];
  eligibleQuests: string[];
  eligibleCourses: string[];
  rewards?: {
    points?: number;
    badges?: string[];
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'legendary';
  earnedAt: number;
  progress?: {
    current: number;
    required: number;
  };
}

export interface Leaderboard {
  id: string;
  type: 'global' | 'feature' | 'quest' | 'course';
  title: string;
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  level: number;
  trend?: 'up' | 'down' | 'same';
}
