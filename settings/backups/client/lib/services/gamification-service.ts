import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GamificationMetrics } from '@/lib/types/gamification';

const PREFIX = 'gamification_metrics_v1:';

export type { GamificationMetrics };

export class GamificationService {
  async getMetrics(userId: string): Promise<GamificationMetrics> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + userId);
      if (!raw) {
        return {
          level: 1,
          currentXP: 0,
          xpToNextLevel: 100,
          totalXPEarned: 0,
          points: 0,
          totalPointsEarned: 0,
          badges: [],
          currentStreak: 0,
          leaderboardRank: undefined,
          xpBreakdown: { quests: 0, learning: 0, marketplace: 0, social: 0, referrals: 0, other: 0 },
        };
      }
      return JSON.parse(raw) as GamificationMetrics;
    } catch (e) {
      return {
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
        totalXPEarned: 0,
        points: 0,
        totalPointsEarned: 0,
        badges: [],
        currentStreak: 0,
        leaderboardRank: undefined,
        xpBreakdown: { quests: 0, learning: 0, marketplace: 0, social: 0, referrals: 0, other: 0 },
      };
    }
  }

  private async persist(userId: string, metrics: GamificationMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + userId, JSON.stringify(metrics));
    } catch (e) {
      // best-effort
    }
  }

  async incrementPoints(userId: string, points: number): Promise<GamificationMetrics> {
    const metrics = await this.getMetrics(userId);
    const next = { ...metrics, points: metrics.points + points };
    await this.persist(userId, next);
    return next;
  }

  async awardBadge(userId: string, badgeId: string): Promise<GamificationMetrics> {
    const metrics = await this.getMetrics(userId);
    const badge: import('@/lib/types/gamification').Badge = {
      id: badgeId,
      name: badgeId,
      description: '',
      iconUrl: '',
      rarity: 'common',
      earnedAt: Date.now(),
    };
    if (!metrics.badges.find((b) => b.id === badgeId)) {
      metrics.badges.push(badge);
    }
    await this.persist(userId, metrics);
    return metrics;
  }

  async resetUserMetrics(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + userId);
    } catch (e) {
      // ignore
    }
  }
}
