/**
 * Real-Time Notifications Provider
 *
 * Integrates WebSocket events with toast notification system.
 * Subscribes to real-time events and displays appropriate notifications.
 *
 * Events handled:
 * - quest:completed - Quest completion notifications
 * - quest:unlocked - New quest availability
 * - achievement:unlocked - Achievement earned
 * - badge:earned - Badge awarded (already handled by existing system)
 * - message:received - New chat messages
 * - party:invited - Party invitations
 * - party:joined - Party member joined
 * - party:left - Party member left
 * - level:up - Level up notifications
 * - xp:earned - XP gain notifications
 * - challenge:completed - Challenge completion
 * - reward:claimed - Reward claimed
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import { useToastNotifications } from '@/lib/hooks/use-toast-notifications';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

interface Quest {
  id: string;
  title: string;
  xp?: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  chatId: string;
}

interface Party {
  id: string;
  name: string;
  inviterId?: string;
  inviterName?: string;
  userId?: string;
  username?: string;
}

interface LevelUp {
  newLevel: number;
  rewards?: {
    xp?: number;
    coins?: number;
  };
}

interface XPEarned {
  amount: number;
  source: string;
  total?: number;
}

interface Challenge {
  id: string;
  title: string;
  reward?: {
    xp?: number;
    coins?: number;
  };
}

interface Reward {
  id: string;
  type: string;
  name: string;
  amount?: number;
}

export function RealTimeNotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { show: showToast } = useToastNotifications();

  const {
    isConnected,
    connectionState,
    error: wsError,
    on,
    off,
  } = useRealTimeConnection(WEBSOCKET_URL, {
    autoConnect: true,
  });

  // Show connection status changes
  useEffect(() => {
    if (connectionState === 'connected') {
      showToast({
        type: 'success',
        title: 'Connected',
        message: 'Real-time updates enabled',
        duration: 2000,
      });
    } else if (wsError) {
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to real-time services',
        duration: 3000,
      });
    }
  }, [connectionState, wsError, showToast]);

  // Quest completed
  useEffect(() => {
    if (!isConnected) return;

    const handleQuestCompleted = (data: Quest) => {
      showToast({
        type: 'success',
        title: '✅ Quest Completed!',
        message: data.xp ? `${data.title} (+${data.xp} XP)` : data.title,
        duration: 5000,
        action: {
          label: 'View',
          onPress: () => {
            router.push(`/(tabs)/quests/${data.id}` as any);
          },
        },
      });
    };

    on('quest:completed', handleQuestCompleted);
    return () => off('quest:completed', handleQuestCompleted);
  }, [isConnected, on, off, showToast, router]);

  // Quest unlocked
  useEffect(() => {
    if (!isConnected) return;

    const handleQuestUnlocked = (data: Quest) => {
      showToast({
        type: 'info',
        title: '🔓 New Quest Available!',
        message: data.title,
        duration: 5000,
        action: {
          label: 'View',
          onPress: () => {
            router.push(`/(tabs)/quests/${data.id}` as any);
          },
        },
      });
    };

    on('quest:unlocked', handleQuestUnlocked);
    return () => off('quest:unlocked', handleQuestUnlocked);
  }, [isConnected, on, off, showToast, router]);

  // Achievement unlocked
  useEffect(() => {
    if (!isConnected) return;

    const handleAchievementUnlocked = (data: Achievement) => {
      showToast({
        type: 'success',
        title: '🏆 Achievement Unlocked!',
        message: `${data.title} - ${data.description}`,
        duration: 6000,
        action: {
          label: 'View',
          onPress: () => {
            router.push('/(tabs)/profile' as any);
          },
        },
      });
    };

    on('achievement:unlocked', handleAchievementUnlocked);
    return () => off('achievement:unlocked', handleAchievementUnlocked);
  }, [isConnected, on, off, showToast, router]);

  // New message
  useEffect(() => {
    if (!isConnected) return;

    const handleMessageReceived = (data: Message) => {
      showToast({
        type: 'info',
        title: `💬 ${data.senderName}`,
        message: data.content.length > 50 ? `${data.content.substring(0, 50)}...` : data.content,
        duration: 4000,
        action: {
          label: 'Reply',
          onPress: () => {
            router.push(`/(tabs)/social/chat/${data.chatId}` as any);
          },
        },
      });
    };

    on('message:received', handleMessageReceived);
    return () => off('message:received', handleMessageReceived);
  }, [isConnected, on, off, showToast, router]);

  // Party invited
  useEffect(() => {
    if (!isConnected) return;

    const handlePartyInvited = (data: Party) => {
      showToast({
        type: 'info',
        title: '🎉 Party Invitation',
        message: `${data.inviterName || 'Someone'} invited you to ${data.name}`,
        duration: 8000,
        action: {
          label: 'View',
          onPress: () => {
            router.push('/(tabs)/social' as any);
          },
        },
      });
    };

    on('party:invited', handlePartyInvited);
    return () => off('party:invited', handlePartyInvited);
  }, [isConnected, on, off, showToast, router]);

  // Party member joined
  useEffect(() => {
    if (!isConnected) return;

    const handlePartyJoined = (data: Party) => {
      showToast({
        type: 'success',
        title: '👥 Party Update',
        message: `${data.username || 'A player'} joined the party`,
        duration: 3000,
      });
    };

    on('party:joined', handlePartyJoined);
    return () => off('party:joined', handlePartyJoined);
  }, [isConnected, on, off, showToast]);

  // Party member left
  useEffect(() => {
    if (!isConnected) return;

    const handlePartyLeft = (data: Party) => {
      showToast({
        type: 'warning',
        title: '👥 Party Update',
        message: `${data.username || 'A player'} left the party`,
        duration: 3000,
      });
    };

    on('party:left', handlePartyLeft);
    return () => off('party:left', handlePartyLeft);
  }, [isConnected, on, off, showToast]);

  // Level up
  useEffect(() => {
    if (!isConnected) return;

    const handleLevelUp = (data: LevelUp) => {
      const rewardText = data.rewards
        ? ` (${[
            data.rewards.xp && `+${data.rewards.xp} XP`,
            data.rewards.coins && `+${data.rewards.coins} coins`,
          ]
            .filter(Boolean)
            .join(', ')})`
        : '';

      showToast({
        type: 'success',
        title: '⬆️ Level Up!',
        message: `You reached level ${data.newLevel}${rewardText}`,
        duration: 5000,
        action: {
          label: 'View Profile',
          onPress: () => {
            router.push('/(tabs)/profile' as any);
          },
        },
      });
    };

    on('level:up', handleLevelUp);
    return () => off('level:up', handleLevelUp);
  }, [isConnected, on, off, showToast, router]);

  // XP earned
  useEffect(() => {
    if (!isConnected) return;

    const handleXPEarned = (data: XPEarned) => {
      showToast({
        type: 'success',
        title: '⭐ XP Earned',
        message: `+${data.amount} XP from ${data.source}${data.total ? ` (Total: ${data.total})` : ''}`,
        duration: 3000,
      });
    };

    on('xp:earned', handleXPEarned);
    return () => off('xp:earned', handleXPEarned);
  }, [isConnected, on, off, showToast]);

  // Challenge completed
  useEffect(() => {
    if (!isConnected) return;

    const handleChallengeCompleted = (data: Challenge) => {
      const rewardText = data.reward
        ? ` (${[
            data.reward.xp && `+${data.reward.xp} XP`,
            data.reward.coins && `+${data.reward.coins} coins`,
          ]
            .filter(Boolean)
            .join(', ')})`
        : '';

      showToast({
        type: 'success',
        title: '🎯 Challenge Complete!',
        message: `${data.title}${rewardText}`,
        duration: 5000,
        action: {
          label: 'View',
          onPress: () => {
            router.push('/(tabs)/quests' as any);
          },
        },
      });
    };

    on('challenge:completed', handleChallengeCompleted);
    return () => off('challenge:completed', handleChallengeCompleted);
  }, [isConnected, on, off, showToast, router]);

  // Reward claimed
  useEffect(() => {
    if (!isConnected) return;

    const handleRewardClaimed = (data: Reward) => {
      showToast({
        type: 'success',
        title: '🎁 Reward Claimed!',
        message: data.amount ? `${data.name} x${data.amount}` : data.name,
        duration: 4000,
      });
    };

    on('reward:claimed', handleRewardClaimed);
    return () => off('reward:claimed', handleRewardClaimed);
  }, [isConnected, on, off, showToast]);

  return <>{children}</>;
}
