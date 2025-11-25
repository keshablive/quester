/**
 * LeaderboardTabs Component (T048)
 *
 * Tab navigation for switching between different leaderboard types and time periods.
 * Used in leaderboard screens to toggle between Global/Category and AllTime/Monthly.
 *
 * Features:
 * - Type tabs (Global, Quest, Social, Learning)
 * - Period selector (All-Time, Monthly)
 * - Active state indicators
 * - Smooth transitions
 * - Responsive layout
 * - Accessibility support
 */

import * as React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GlobeIcon,
  MapIcon,
  UsersIcon,
  GraduationCapIcon,
  CalendarIcon,
  TrophyIcon,
} from 'lucide-react-native';

export type LeaderboardType = 'global' | 'quest' | 'social' | 'learning';
export type LeaderboardPeriod = 'alltime' | 'monthly';

export interface LeaderboardTab {
  type: LeaderboardType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  category?: string; // Backend category mapping
}

export interface LeaderboardTabsProps {
  selectedType: LeaderboardType;
  selectedPeriod: LeaderboardPeriod;
  onTypeChange: (type: LeaderboardType) => void;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  enabledTabs?: LeaderboardType[]; // Tabs to show (default: all)
  showBadge?: boolean; // Show "New" or count badges
  className?: string;
}

// Tab configuration
const LEADERBOARD_TABS: LeaderboardTab[] = [
  {
    type: 'global',
    label: 'Global',
    icon: GlobeIcon,
    description: 'All users by total XP',
    category: undefined, // No category for global
  },
  {
    type: 'quest',
    label: 'Quests',
    icon: MapIcon,
    description: 'Quest completions',
    category: 'quests',
  },
  {
    type: 'social',
    label: 'Social',
    icon: UsersIcon,
    description: 'Social interactions',
    category: 'social',
  },
  {
    type: 'learning',
    label: 'Learning',
    icon: GraduationCapIcon,
    description: 'Learning achievements',
    category: 'learning',
  },
];

// Period configuration
const PERIODS = [
  {
    value: 'alltime' as const,
    label: 'All-Time',
    icon: TrophyIcon,
    description: 'Overall rankings',
  },
  {
    value: 'monthly' as const,
    label: 'Monthly',
    icon: CalendarIcon,
    description: 'This month',
  },
];

export function LeaderboardTabs({
  selectedType,
  selectedPeriod,
  onTypeChange,
  onPeriodChange,
  enabledTabs = ['global', 'quest', 'social', 'learning'],
  showBadge = false,
  className,
}: LeaderboardTabsProps) {
  // Filter tabs based on enabled types (optimized with useMemo - Phase 7, T113)
  const visibleTabs = React.useMemo(
    () => LEADERBOARD_TABS.filter((tab) => enabledTabs.includes(tab.type)),
    [enabledTabs]
  );

  return (
    <View className={cn('gap-3', className)}>
      {/* Type Tabs */}
      <View>
        <Text variant="small" className="mb-2 px-1 uppercase tracking-wide text-muted-foreground">
          Leaderboard Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerClassName="gap-2">
          {visibleTabs.map((tab) => {
            const isSelected = selectedType === tab.type;
            const Icon = tab.icon;

            return (
              <Pressable
                key={tab.type}
                onPress={() => onTypeChange(tab.type)}
                className={cn(
                  'flex flex-row items-center gap-2 rounded-lg border px-4 py-3',
                  'transition-colors active:opacity-70',
                  isSelected ? 'border-primary bg-primary' : 'border-border bg-card active:bg-muted'
                )}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${tab.label} leaderboard`}
                accessibilityHint={tab.description}>
                <Icon
                  size={18}
                  className={cn(isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}
                />
                <Text
                  variant="small"
                  className={cn(
                    'font-semibold',
                    isSelected ? 'text-primary-foreground' : 'text-foreground'
                  )}>
                  {tab.label}
                </Text>
                {showBadge && isSelected && (
                  <Badge variant="secondary" className="ml-1">
                    <Text variant="small">New</Text>
                  </Badge>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Period Selector */}
      <View>
        <Text variant="small" className="mb-2 px-1 uppercase tracking-wide text-muted-foreground">
          Time Period
        </Text>
        <View className="flex flex-row gap-2">
          {PERIODS.map((period) => {
            const isSelected = selectedPeriod === period.value;
            const Icon = period.icon;

            return (
              <Pressable
                key={period.value}
                onPress={() => onPeriodChange(period.value)}
                className={cn(
                  'flex flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-4 py-3',
                  'transition-colors active:opacity-70',
                  isSelected ? 'border-primary bg-primary' : 'border-border bg-card active:bg-muted'
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                accessibilityLabel={`${period.label} period`}
                accessibilityHint={period.description}>
                <Icon
                  size={16}
                  className={cn(isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}
                />
                <Text
                  variant="small"
                  className={cn(
                    'font-semibold',
                    isSelected ? 'text-primary-foreground' : 'text-foreground'
                  )}>
                  {period.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * LeaderboardTabsCompact - Compact version with combined type/period selector
 * Useful for mobile screens with limited space
 */
export function LeaderboardTabsCompact({
  selectedType,
  selectedPeriod,
  onTypeChange: _onTypeChange,
  onPeriodChange: _onPeriodChange,
  className,
}: {
  selectedType: LeaderboardType;
  selectedPeriod: LeaderboardPeriod;
  onTypeChange: (type: LeaderboardType) => void;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  className?: string;
}) {
  const selectedTab = LEADERBOARD_TABS.find((tab) => tab.type === selectedType);
  const selectedPeriodData = PERIODS.find((p) => p.value === selectedPeriod);

  return (
    <View className={cn('flex flex-row gap-2', className)}>
      {/* Type Dropdown/Selector */}
      <View className="flex-1 rounded-lg border border-border bg-card p-3">
        <Text variant="small" className="mb-1 text-muted-foreground">
          Type
        </Text>
        <View className="flex flex-row items-center gap-2">
          {selectedTab &&
            React.createElement(selectedTab.icon, {
              size: 16,
              className: 'text-primary',
            })}
          <Text variant="small" className="font-semibold text-foreground">
            {selectedTab?.label}
          </Text>
        </View>
      </View>

      {/* Period Dropdown/Selector */}
      <View className="flex-1 rounded-lg border border-border bg-card p-3">
        <Text variant="small" className="mb-1 text-muted-foreground">
          Period
        </Text>
        <View className="flex flex-row items-center gap-2">
          {selectedPeriodData &&
            React.createElement(selectedPeriodData.icon, {
              size: 16,
              className: 'text-primary',
            })}
          <Text variant="small" className="font-semibold text-foreground">
            {selectedPeriodData?.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * LeaderboardTabIndicator - Visual indicator for current selection
 * Shows description and active filters
 */
export function LeaderboardTabIndicator({
  selectedType,
  selectedPeriod,
  className,
}: {
  selectedType: LeaderboardType;
  selectedPeriod: LeaderboardPeriod;
  className?: string;
}) {
  const selectedTab = LEADERBOARD_TABS.find((tab) => tab.type === selectedType);
  const selectedPeriodData = PERIODS.find((p) => p.value === selectedPeriod);

  if (!selectedTab || !selectedPeriodData) return null;

  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between rounded-lg bg-muted p-3',
        className
      )}>
      <View className="flex-1">
        <Text variant="small" className="mb-0.5 font-semibold text-foreground">
          {selectedTab.label} Leaderboard
        </Text>
        <Text variant="small" className="text-muted-foreground">
          {selectedTab.description} • {selectedPeriodData.label}
        </Text>
      </View>
      <Badge variant="secondary">
        <Text variant="small" className="font-semibold">
          {selectedPeriodData.value === 'monthly' ? 'This Month' : 'Overall'}
        </Text>
      </Badge>
    </View>
  );
}

/**
 * Helper function to get category from leaderboard type
 * Used for API calls
 */
export function getCategoryFromType(type: LeaderboardType): string | undefined {
  const tab = LEADERBOARD_TABS.find((t) => t.type === type);
  return tab?.category;
}

/**
 * Helper function to get backend leaderboard type from UI type
 */
export function getBackendLeaderboardType(type: LeaderboardType): 'global' | 'category' {
  return type === 'global' ? 'global' : 'category';
}

/**
 * Helper function to format leaderboard title
 */
export function formatLeaderboardTitle(type: LeaderboardType, period: LeaderboardPeriod): string {
  const tab = LEADERBOARD_TABS.find((t) => t.type === type);
  const periodLabel = period === 'monthly' ? 'Monthly' : 'All-Time';
  return `${tab?.label || 'Global'} ${periodLabel}`;
}
