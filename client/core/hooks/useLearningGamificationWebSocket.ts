/**
 * useLearningGamificationWebSocket Hook (T100)
 * 
 * Handles real-time WebSocket events for learning gamification:
 * - XP awards
 * - Level-ups
 * - Achievement unlocks
 * - Streak milestones
 * - Challenge completions
 */

import { useEffect, useCallback, useState } from 'react';
import { webSocketService } from '../api/services/websocket.service';
import type {
  LearningXPAwardResult,
  UnlockedAchievement,
  LearningChallengeUpdate,
} from '../types/learning-gamification.types';

// Learning gamification WebSocket message types
export const LEARNING_WS_EVENTS = {
  XP_AWARDED: 'learning_xp_awarded',
  LEVEL_UP: 'learning_level_up',
  ACHIEVEMENT_UNLOCKED: 'learning_achievement_unlocked',
  STREAK_MILESTONE: 'learning_streak_milestone',
  CHALLENGE_COMPLETED: 'learning_challenge_completed',
  CHALLENGE_PROGRESS: 'learning_challenge_progress',
} as const;

export type LearningWsEventType = typeof LEARNING_WS_EVENTS[keyof typeof LEARNING_WS_EVENTS];

// Event payload types
export interface XPAwardedEvent {
  user_id: string;
  xp_amount: number;
  action_type: string;
  new_total_xp: number;
  content_type?: string;
  content_id?: string;
  description?: string;
}

export interface LevelUpEvent {
  user_id: string;
  new_level: number;
  level_name: string;
  previous_level: number;
}

export interface AchievementUnlockedEvent {
  user_id: string;
  achievement: UnlockedAchievement;
}

export interface StreakMilestoneEvent {
  user_id: string;
  streak_days: number;
  milestone_xp: number;
  is_new_milestone: boolean;
}

export interface ChallengeCompletedEvent {
  user_id: string;
  challenge_id: string;
  challenge_title: string;
  xp_reward: number;
}

export interface ChallengeProgressEvent {
  user_id: string;
  challenge_id: string;
  current_progress: number;
  target_value: number;
  percentage: number;
}

// Combined event type
export type LearningGamificationEvent =
  | { type: 'xp_awarded'; data: XPAwardedEvent }
  | { type: 'level_up'; data: LevelUpEvent }
  | { type: 'achievement_unlocked'; data: AchievementUnlockedEvent }
  | { type: 'streak_milestone'; data: StreakMilestoneEvent }
  | { type: 'challenge_completed'; data: ChallengeCompletedEvent }
  | { type: 'challenge_progress'; data: ChallengeProgressEvent };

// Callback types for event handlers
export interface LearningGamificationCallbacks {
  onXPAwarded?: (event: XPAwardedEvent) => void;
  onLevelUp?: (event: LevelUpEvent) => void;
  onAchievementUnlocked?: (event: AchievementUnlockedEvent) => void;
  onStreakMilestone?: (event: StreakMilestoneEvent) => void;
  onChallengeCompleted?: (event: ChallengeCompletedEvent) => void;
  onChallengeProgress?: (event: ChallengeProgressEvent) => void;
}

/**
 * Hook to listen for learning gamification WebSocket events
 * 
 * @param callbacks - Event handlers for different gamification events
 * @returns Object with recent events and control functions
 * 
 * @example
 * ```tsx
 * const { recentEvents, clearEvents } = useLearningGamificationWebSocket({
 *   onXPAwarded: (event) => {
 *     showToast(`+${event.xp_amount} XP earned!`);
 *   },
 *   onLevelUp: (event) => {
 *     showCelebration(`Level ${event.new_level} - ${event.level_name}!`);
 *   },
 *   onAchievementUnlocked: (event) => {
 *     showAchievementModal(event.achievement);
 *   },
 * });
 * ```
 */
export function useLearningGamificationWebSocket(callbacks?: LearningGamificationCallbacks) {
  const [recentEvents, setRecentEvents] = useState<LearningGamificationEvent[]>([]);

  // XP awarded handler
  useEffect(() => {
    if (!callbacks?.onXPAwarded) return;
    
    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.XP_AWARDED, (data: XPAwardedEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'xp_awarded', data }]);
      callbacks.onXPAwarded?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onXPAwarded]);

  // Level up handler
  useEffect(() => {
    if (!callbacks?.onLevelUp) return;

    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.LEVEL_UP, (data: LevelUpEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'level_up', data }]);
      callbacks.onLevelUp?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onLevelUp]);

  // Achievement unlocked handler
  useEffect(() => {
    if (!callbacks?.onAchievementUnlocked) return;

    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.ACHIEVEMENT_UNLOCKED, (data: AchievementUnlockedEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'achievement_unlocked', data }]);
      callbacks.onAchievementUnlocked?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onAchievementUnlocked]);

  // Streak milestone handler
  useEffect(() => {
    if (!callbacks?.onStreakMilestone) return;

    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.STREAK_MILESTONE, (data: StreakMilestoneEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'streak_milestone', data }]);
      callbacks.onStreakMilestone?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onStreakMilestone]);

  // Challenge completed handler
  useEffect(() => {
    if (!callbacks?.onChallengeCompleted) return;

    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.CHALLENGE_COMPLETED, (data: ChallengeCompletedEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'challenge_completed', data }]);
      callbacks.onChallengeCompleted?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onChallengeCompleted]);

  // Challenge progress handler
  useEffect(() => {
    if (!callbacks?.onChallengeProgress) return;

    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.CHALLENGE_PROGRESS, (data: ChallengeProgressEvent) => {
      setRecentEvents(prev => [...prev.slice(-9), { type: 'challenge_progress', data }]);
      callbacks.onChallengeProgress?.(data);
    });

    return unsubscribe;
  }, [callbacks?.onChallengeProgress]);

  // Clear recent events
  const clearEvents = useCallback(() => {
    setRecentEvents([]);
  }, []);

  return {
    recentEvents,
    clearEvents,
  };
}

/**
 * Hook to listen for real-time XP updates only
 * Lightweight version for components that only need XP tracking
 */
export function useRealtimeXP(onXPChange: (newTotalXP: number, xpAwarded: number) => void) {
  useEffect(() => {
    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.XP_AWARDED, (data: XPAwardedEvent) => {
      onXPChange(data.new_total_xp, data.xp_amount);
    });

    return unsubscribe;
  }, [onXPChange]);
}

/**
 * Hook to listen for level-up events only
 * Used for triggering level-up celebrations
 */
export function useRealtimeLevelUp(onLevelUp: (level: number, levelName: string) => void) {
  useEffect(() => {
    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.LEVEL_UP, (data: LevelUpEvent) => {
      onLevelUp(data.new_level, data.level_name);
    });

    return unsubscribe;
  }, [onLevelUp]);
}

/**
 * Hook to listen for achievement unlocks only
 * Used for showing achievement celebration modals
 */
export function useRealtimeAchievements(onAchievement: (achievement: UnlockedAchievement) => void) {
  useEffect(() => {
    const unsubscribe = webSocketService.on(LEARNING_WS_EVENTS.ACHIEVEMENT_UNLOCKED, (data: AchievementUnlockedEvent) => {
      onAchievement(data.achievement);
    });

    return unsubscribe;
  }, [onAchievement]);
}

export default useLearningGamificationWebSocket;
