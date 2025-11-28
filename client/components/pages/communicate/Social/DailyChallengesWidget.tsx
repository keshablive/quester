/**
 * DailyChallengesWidget Component
 *
 * T080/T083: Widget showing daily challenges with progress and animations
 * US6/FR-010: Daily Social Challenges with XP rewards
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import {
  Heart,
  MessageCircle,
  Share2,
  Edit3,
  UserPlus,
  Zap,
  CheckCircle2,
  Trophy,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useDailyChallenges } from '@/core/hooks/useDailyChallenges';
import { DailyChallenge } from '@/core/api/services/social-gamification.service';

// Map action types to icons
const getActionIcon = (actionType: string, completed: boolean) => {
  const color = completed ? '#22c55e' : '#94a3b8';
  const size = 18;

  switch (actionType) {
    case 'like':
      return <Heart size={size} color={color} fill={completed ? color : 'none'} />;
    case 'comment':
      return <MessageCircle size={size} color={color} fill={completed ? color : 'none'} />;
    case 'share':
      return <Share2 size={size} color={color} />;
    case 'post':
      return <Edit3 size={size} color={color} />;
    case 'follow':
      return <UserPlus size={size} color={color} />;
    case 'any':
    default:
      return <Zap size={size} color={color} fill={completed ? color : 'none'} />;
  }
};

interface ChallengeItemProps {
  challenge: DailyChallenge;
  index: number;
}

const ChallengeItem: React.FC<ChallengeItemProps> = ({ challenge, index }) => {
  const progressPercent = Math.min((challenge.currentProgress / challenge.targetCount) * 100, 100);

  // Animation for completion
  const scaleAnim = useRef(new Animated.Value(challenge.isCompleted ? 1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(challenge.isCompleted ? 1 : 0.8)).current;
  const checkScaleAnim = useRef(new Animated.Value(challenge.isCompleted ? 1 : 0)).current;

  useEffect(() => {
    if (challenge.isCompleted) {
      // T083: Completion animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [challenge.isCompleted]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
      className={`mb-2 flex-row items-center rounded-xl p-3 ${
        challenge.isCompleted ? 'bg-green-500/10' : 'bg-slate-800/50'
      }`}>
      {/* Icon */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          challenge.isCompleted ? 'bg-green-500/20' : 'bg-slate-700'
        }`}>
        {getActionIcon(challenge.actionType, challenge.isCompleted)}
      </View>

      {/* Content */}
      <View className="ml-3 flex-1">
        <Text
          className={`text-sm font-semibold ${
            challenge.isCompleted ? 'text-green-400' : 'text-white'
          }`}>
          {challenge.name}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-400">
          {challenge.currentProgress}/{challenge.targetCount} • +{challenge.xpReward} XP
        </Text>

        {/* Progress bar */}
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
          <View
            className={`h-full rounded-full ${
              challenge.isCompleted ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>

      {/* Completion indicator */}
      {challenge.isCompleted && (
        <Animated.View style={{ transform: [{ scale: checkScaleAnim }] }} className="ml-2">
          <CheckCircle2 size={24} color="#22c55e" fill="#22c55e" />
        </Animated.View>
      )}
    </Animated.View>
  );
};

interface DailyChallengesWidgetProps {
  onViewAll?: () => void;
  compact?: boolean;
}

export const DailyChallengesWidget: React.FC<DailyChallengesWidgetProps> = ({
  onViewAll,
  compact = false,
}) => {
  const {
    challenges,
    loading,
    error,
    completedCount,
    totalCount,
    totalXPEarned,
    totalXPAvailable,
    allComplete,
    refresh,
  } = useDailyChallenges();

  // Animation for perfect day celebration
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (allComplete) {
      // Perfect day celebration animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [allComplete]);

  if (loading) {
    return (
      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <View className="items-center py-4">
          <Text className="text-slate-400">Loading challenges...</Text>
        </View>
      </View>
    );
  }

  if (error || challenges.length === 0) {
    return (
      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <View className="items-center py-4">
          <Zap size={32} color="#64748b" />
          <Text className="mt-2 text-center text-slate-400">
            {error || 'No challenges available today'}
          </Text>
          <TouchableOpacity onPress={refresh} className="mt-2">
            <Text className="text-sm text-purple-400">Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate time remaining
  const expiresAt = challenges[0]?.expiresAt ? new Date(challenges[0].expiresAt) : null;
  const hoursRemaining = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 24;

  const displayChallenges = compact ? challenges.slice(0, 3) : challenges;

  return (
    <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Animated.View
            style={{
              opacity: allComplete
                ? celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                : 1,
              transform: [
                {
                  scale: allComplete
                    ? celebrationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      })
                    : 1,
                },
              ],
            }}>
            <Trophy
              size={24}
              color={allComplete ? '#fbbf24' : '#a855f7'}
              fill={allComplete ? '#fbbf24' : 'none'}
            />
          </Animated.View>
          <Text className="ml-2 text-lg font-bold text-white">Daily Challenges</Text>
        </View>

        <View className="flex-row items-center">
          <Clock size={14} color="#64748b" />
          <Text className="ml-1 text-sm text-slate-400">{hoursRemaining}h left</Text>
        </View>
      </View>

      {/* Progress summary */}
      <View
        className={`mb-4 flex-row items-center justify-between rounded-xl p-3 ${
          allComplete ? 'border border-yellow-500/30 bg-yellow-500/20' : 'bg-purple-500/10'
        }`}>
        <View>
          <Text className={`font-bold ${allComplete ? 'text-yellow-400' : 'text-white'}`}>
            {allComplete ? '🎉 Perfect Day!' : `${completedCount}/${totalCount} Complete`}
          </Text>
          <Text className="text-xs text-slate-400">
            {totalXPEarned}/{totalXPAvailable} XP earned
          </Text>
        </View>

        {allComplete && (
          <View className="rounded-full bg-yellow-500/30 px-3 py-1">
            <Text className="text-xs font-semibold text-yellow-400">+100 XP Bonus!</Text>
          </View>
        )}
      </View>

      {/* Challenge list */}
      <View>
        {displayChallenges.map((challenge, index) => (
          <ChallengeItem key={challenge.id} challenge={challenge} index={index} />
        ))}
      </View>

      {/* View all button */}
      {(compact && challenges.length > 3) || onViewAll ? (
        <TouchableOpacity
          onPress={onViewAll}
          className="mt-3 flex-row items-center justify-center py-2">
          <Text className="text-sm font-medium text-purple-400">View All Challenges</Text>
          <ChevronRight size={16} color="#a855f7" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default DailyChallengesWidget;
