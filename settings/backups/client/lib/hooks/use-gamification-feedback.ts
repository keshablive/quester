import { useState, useCallback, useEffect, useRef } from 'react';
import { useGamification } from '@/lib/contexts/gamification-context';
import { useAccessibility } from '@/lib/hooks/use-accessibility';
import { XPSource } from '@/lib/types/gamification';

export type { XPSource };

interface XPAnimation {
  amount: number;
  source: XPSource;
}

interface LevelUpInfo {
  level: number;
  unlockedFeatures: string[];
}

interface XPGain {
  amount: number;
  source: XPSource;
}

// Level thresholds and feature unlocks based on game design
const LEVEL_UNLOCKS: Record<number, string[]> = {
  2: ['Basic Badges'],
  3: ['Quest History'],
  5: ['Advanced Quests', 'Premium Badges'],
  7: ['Leaderboard Access'],
  10: ['Custom Profile Themes', 'Advanced Analytics'],
  15: ['Mentor Role', 'Group Creation'],
  20: ['VIP Status', 'Exclusive Marketplace Items']
};

// Calculate level from points (simple formula: 100 points per level)
function calculateLevel(points: number): number {
  return Math.floor(points / 100) + 1;
}

export function useGamificationFeedback() {
  const { incrementPoints, refresh, metrics } = useGamification();
  const { announceForAccessibility } = useAccessibility();
  
  const [activeXPAnimation, setActiveXPAnimation] = useState<XPAnimation | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  
  const xpQueueRef = useRef<XPGain[]>([]);
  const processingRef = useRef(false);

  // Process XP queue sequentially
  const processXPQueue = useCallback(async () => {
    if (processingRef.current || xpQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    const nextGain = xpQueueRef.current.shift();

    if (nextGain && nextGain.amount > 0) {
      const prevLevel = calculateLevel(metrics?.points ?? 0);
      
      // Show XP animation
      setActiveXPAnimation({
        amount: nextGain.amount,
        source: nextGain.source
      });

      // Announce XP gain for screen readers (T102)
      announceForAccessibility(
        `You gained ${nextGain.amount} experience points from ${nextGain.source.replace('_', ' ')}. Total: ${(metrics?.points ?? 0) + nextGain.amount} points`
      );

      // Award XP (points)
      await incrementPoints(nextGain.amount);
      
      // Refresh to get updated metrics
      await refresh();
      
      // Check for level-up (metrics will be updated via context)
      // Note: In real app, we'd need to wait for refresh to complete and read fresh metrics
      // For now, we calculate level from the updated points
      const newLevel = calculateLevel((metrics?.points ?? 0) + nextGain.amount);
      if (newLevel > prevLevel) {
        const unlockedFeatures = LEVEL_UNLOCKS[newLevel] || [];
        setLevelUpInfo({
          level: newLevel,
          unlockedFeatures
        });
        setShowLevelUpModal(true);
        
        // Announce level up for screen readers (T102)
        const features = unlockedFeatures.length > 0
          ? ` You unlocked: ${unlockedFeatures.join(', ')}`
          : '';
        announceForAccessibility(
          `Congratulations! You reached level ${newLevel}!${features}`
        );
      }
    }

    processingRef.current = false;
  }, [metrics, incrementPoints, refresh]);

  // Process queue when it changes
  useEffect(() => {
    if (!processingRef.current && xpQueueRef.current.length > 0) {
      processXPQueue();
    }
  }, [processXPQueue]);

  const awardXP = useCallback((amount: number, source: XPSource) => {
    if (amount <= 0) return;

    xpQueueRef.current.push({ amount, source });
    processXPQueue();
  }, [processXPQueue]);

  const dismissXPAnimation = useCallback(() => {
    setActiveXPAnimation(null);
    // Process next in queue
    setTimeout(() => processXPQueue(), 100);
  }, [processXPQueue]);

  const dismissLevelUpModal = useCallback(() => {
    setShowLevelUpModal(false);
    setLevelUpInfo(null);
  }, []);

  return {
    awardXP,
    dismissXPAnimation,
    dismissLevelUpModal,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo
  };
}
