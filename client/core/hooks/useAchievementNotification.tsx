import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { UnlockedAchievement } from '@/components/ui/AchievementUnlockModal';

/**
 * Achievement notification data from server
 */
export interface AchievementNotificationData {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  category: string;
  unlockedAt: string;
}

/**
 * Achievement notification context value
 */
interface AchievementNotificationContextValue {
  /** Current achievement to display in modal */
  currentAchievement: UnlockedAchievement | null;
  /** Queue of pending achievement notifications */
  achievementQueue: UnlockedAchievement[];
  /** Add a new achievement notification */
  addAchievementNotification: (achievement: AchievementNotificationData) => void;
  /** Dismiss current achievement modal and show next in queue */
  dismissAchievement: () => void;
  /** Total achievements unlocked this session */
  sessionUnlocks: number;
  /** Whether modal is open */
  isModalOpen: boolean;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextValue | null>(
  null
);

interface AchievementNotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider for achievement unlock notifications
 * US3: Display celebratory modal when achievements are unlocked
 */
export function AchievementNotificationProvider({
  children,
}: AchievementNotificationProviderProps) {
  const [currentAchievement, setCurrentAchievement] = useState<UnlockedAchievement | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<UnlockedAchievement[]>([]);
  const [sessionUnlocks, setSessionUnlocks] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Track shown achievements to prevent duplicates
  const shownAchievementIds = useRef<Set<string>>(new Set());

  const mapDifficulty = (difficulty: string): 'easy' | 'medium' | 'hard' | 'legendary' => {
    switch (difficulty.toLowerCase()) {
      case 'legendary':
        return 'legendary';
      case 'hard':
      case 'epic':
        return 'hard';
      case 'medium':
      case 'rare':
        return 'medium';
      default:
        return 'easy';
    }
  };

  const showNextAchievement = useCallback(() => {
    setAchievementQueue((queue) => {
      if (queue.length === 0) {
        setCurrentAchievement(null);
        setIsModalOpen(false);
        return [];
      }

      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setIsModalOpen(true);
      return rest;
    });
  }, []);

  const addAchievementNotification = useCallback(
    (achievementData: AchievementNotificationData) => {
      // Skip if already shown
      if (shownAchievementIds.current.has(achievementData.id)) {
        return;
      }
      shownAchievementIds.current.add(achievementData.id);

      const achievement: UnlockedAchievement = {
        id: achievementData.id,
        name: achievementData.name,
        description: achievementData.description,
        iconUrl: achievementData.iconUrl,
        xpReward: achievementData.xpReward,
        difficulty: mapDifficulty(achievementData.difficulty),
      };

      setSessionUnlocks((prev) => prev + 1);

      // If no current achievement, show immediately
      if (!currentAchievement) {
        setCurrentAchievement(achievement);
        setIsModalOpen(true);
      } else {
        // Otherwise add to queue
        setAchievementQueue((queue) => [...queue, achievement]);
      }
    },
    [currentAchievement]
  );

  const dismissAchievement = useCallback(() => {
    setIsModalOpen(false);
    // Small delay before showing next to allow animation
    setTimeout(() => {
      showNextAchievement();
    }, 300);
  }, [showNextAchievement]);

  const value: AchievementNotificationContextValue = {
    currentAchievement,
    achievementQueue,
    addAchievementNotification,
    dismissAchievement,
    sessionUnlocks,
    isModalOpen,
  };

  return (
    <AchievementNotificationContext.Provider value={value}>
      {children}
    </AchievementNotificationContext.Provider>
  );
}

/**
 * Hook to access achievement notification context
 */
export function useAchievementNotification(): AchievementNotificationContextValue {
  const context = useContext(AchievementNotificationContext);
  if (!context) {
    throw new Error(
      'useAchievementNotification must be used within an AchievementNotificationProvider'
    );
  }
  return context;
}

/**
 * Hook to manually trigger achievement notifications
 * Useful for testing or handling notifications from WebSocket
 */
export function useTriggerAchievementUnlock() {
  const { addAchievementNotification } = useAchievementNotification();

  return useCallback(
    (achievement: AchievementNotificationData) => {
      addAchievementNotification(achievement);
    },
    [addAchievementNotification]
  );
}

export default useAchievementNotification;
