/**
 * BadgeCard Component (T024)
 *
 * Displays a single badge with tier-specific styling, icon, and metadata.
 * Used in badge gallery, profile view, and achievement toasts.
 *
 * Features:
 * - Tier-based color schemes (Bronze, Silver, Gold, Platinum)
 * - Locked/unlocked states with visual feedback
 * - Progress indicator for partially earned badges
 * - Responsive sizing (small, medium, large)
 * - Accessibility support
 */

import * as React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TrophyIcon, LockIcon, CheckCircle2Icon, ClockIcon } from 'lucide-react-native';
import { useScaledSize, formatAccessibleDate } from '@/lib/hooks/use-accessibility';

// Badge tier type matching backend enum
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Badge category type matching backend enum
export type BadgeCategory = 'quest' | 'social' | 'learning';

// Approval status type matching backend enum
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  tier: BadgeTier;
  pointsThreshold: number;
  autoAward: boolean;
  category: BadgeCategory;
  // User badge fields (if earned)
  earnedAt?: string;
  approvalStatus?: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
}

export interface BadgeCardProps {
  badge: BadgeData;
  isLocked?: boolean; // Badge not yet earned
  progress?: number; // Progress towards earning (0-100)
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean; // Show description and metadata
  onPress?: (badge: BadgeData) => void;
  className?: string;
}

// Tier color schemes
const tierColors = {
  bronze: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900',
  },
  silver: {
    bg: 'bg-slate-50 dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800',
  },
  gold: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-400 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900',
  },
  platinum: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-400 dark:border-purple-700',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900',
  },
};

// Size configurations
const sizeConfig = {
  small: {
    card: 'w-24 h-28',
    icon: 32,
    image: 'w-12 h-12',
    title: 'text-xs',
    description: 'hidden',
  },
  medium: {
    card: 'w-36 h-44',
    icon: 48,
    image: 'w-16 h-16',
    title: 'text-sm',
    description: 'text-xs line-clamp-2',
  },
  large: {
    card: 'w-full min-h-32',
    icon: 64,
    image: 'w-20 h-20',
    title: 'text-base',
    description: 'text-sm',
  },
};

/**
 * BadgeCard Component - Optimized with React.memo (Phase 5, T111)
 *
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Only re-renders when badge data or callbacks change.
 */
export const BadgeCard = React.memo(function BadgeCard({
  badge,
  isLocked = false,
  progress = 0,
  size = 'medium',
  showDetails = true,
  onPress,
  className,
}: BadgeCardProps) {
  const colors = tierColors[badge.tier];
  const sizes = sizeConfig[size];
  const minTouchTarget = useScaledSize(44);

  // Determine badge state
  const isEarned = !!badge.earnedAt;
  const isPending = badge.approvalStatus === 'pending';
  const isApproved = badge.approvalStatus === 'approved';
  const isRejected = badge.approvalStatus === 'rejected';
  const isRevoked = badge.approvalStatus === 'revoked';

  // Visual state
  const showLocked = isLocked || (!isEarned && !isPending);
  const showPending = isPending;
  const showProgress = !isEarned && progress > 0 && progress < 100;

  // Accessibility label
  const accessibilityLabel = React.useMemo(() => {
    let label = `${badge.name}, ${badge.tier} tier badge`;
    if (showLocked) label += ', locked';
    else if (isEarned) label += `, earned on ${formatAccessibleDate(new Date(badge.earnedAt!))}`;
    else if (showProgress) label += `, ${progress}% progress`;
    return label;
  }, [badge, showLocked, isEarned, showProgress, progress]);

  return (
    <Pressable
      onPress={() => onPress?.(badge)}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={showDetails ? badge.description : undefined}
      accessibilityState={{
        disabled: showLocked || !onPress,
        selected: isEarned,
      }}
      style={{ minHeight: minTouchTarget, minWidth: minTouchTarget }}
      className={cn('active:opacity-70', className)}
      testID={`badge-card-${badge.id}`}>
      <Card
        className={cn(
          sizes.card,
          colors.border,
          'border-2',
          showLocked && 'opacity-60',
          isRevoked && 'opacity-40'
        )}>
        <CardContent className={cn('flex flex-col items-center gap-2 p-3', colors.bg)}>
          {/* Badge Icon/Image */}
          <View className="relative">
            {badge.iconUrl ? (
              <Image
                source={{ uri: badge.iconUrl }}
                className={cn(sizes.image, 'rounded-full')}
                resizeMode="cover"
              />
            ) : (
              <View
                className={cn(
                  sizes.image,
                  'items-center justify-center rounded-full',
                  colors.badge
                )}>
                <TrophyIcon size={sizes.icon * 0.6} className={colors.icon} />
              </View>
            )}

            {/* State Overlay Icons */}
            {showLocked && (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
                <LockIcon size={sizes.icon * 0.4} className="text-white" />
              </View>
            )}

            {showPending && (
              <View className="absolute -right-1 -top-1 rounded-full bg-yellow-500 p-1">
                <ClockIcon size={12} className="text-white" />
              </View>
            )}

            {isApproved && !showLocked && (
              <View className="absolute -right-1 -top-1 rounded-full bg-green-500 p-1">
                <CheckCircle2Icon size={12} className="text-white" />
              </View>
            )}
          </View>

          {/* Badge Name */}
          <Text
            className={cn(sizes.title, 'text-center font-semibold', colors.text)}
            numberOfLines={2}>
            {badge.name}
          </Text>

          {/* Tier Badge */}
          <UIBadge variant="secondary" className={cn('text-xs', colors.badge)}>
            <Text className={cn('text-xs capitalize', colors.text)}>{badge.tier}</Text>
          </UIBadge>

          {/* Description (optional, based on size) */}
          {showDetails && sizes.description !== 'hidden' && (
            <Text
              className={cn(sizes.description, 'text-center text-muted-foreground')}
              numberOfLines={2}>
              {badge.description}
            </Text>
          )}

          {/* Progress Bar */}
          {showProgress && (
            <View className="mt-1 w-full">
              <Progress value={progress} className="h-1" />
              <Text variant="small" className="mt-1 text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </Text>
            </View>
          )}

          {/* Points Threshold */}
          {showDetails && size !== 'small' && (
            <Text variant="small" className="text-center text-muted-foreground">
              {badge.pointsThreshold} points
            </Text>
          )}

          {/* Status Messages */}
          {isPending && showDetails && (
            <Text variant="small" className="text-center text-yellow-600 dark:text-yellow-400">
              Pending Approval
            </Text>
          )}

          {isRejected && showDetails && (
            <Text variant="small" className="text-center text-red-600 dark:text-red-400">
              Not Approved
            </Text>
          )}

          {isRevoked && showDetails && (
            <Text variant="small" className="text-center text-red-600 dark:text-red-400">
              Revoked
            </Text>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
});

// Export types for use in other components
export type { BadgeData as Badge };
