import React, { useMemo, useCallback } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Plus, BookOpen, ShoppingBag, MessageSquare, Trophy, FileText } from 'lucide-react-native';
import { useAccessibility, useScaledSize } from '@/lib/hooks/use-accessibility';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  feature: string;
  description: string;
}

interface QuickActionsMenuProps {
  onActionPress: (action: QuickAction) => void;
  currentFeature?: string;
  maxActions?: number;
  layout?: 'horizontal' | 'vertical';
}

// Contextual actions by feature
const FEATURE_ACTIONS: Record<string, QuickAction[]> = {
  quests: [
    {
      id: 'create-quest',
      label: 'Create Quest',
      icon: 'plus',
      feature: 'quests',
      description: 'Start a new quest',
    },
    {
      id: 'browse-quests',
      label: 'Browse Quests',
      icon: 'trophy',
      feature: 'quests',
      description: 'Find quests to complete',
    },
    {
      id: 'my-progress',
      label: 'My Progress',
      icon: 'file-text',
      feature: 'quests',
      description: 'View your quest progress',
    },
  ],
  learning: [
    {
      id: 'browse-courses',
      label: 'Browse Courses',
      icon: 'book-open',
      feature: 'learning',
      description: 'Explore courses',
    },
    {
      id: 'continue-learning',
      label: 'Continue Learning',
      icon: 'play',
      feature: 'learning',
      description: 'Resume your current course',
    },
    {
      id: 'my-certificates',
      label: 'My Certificates',
      icon: 'file-text',
      feature: 'learning',
      description: 'View earned certificates',
    },
  ],
  marketplace: [
    {
      id: 'browse-marketplace',
      label: 'Browse Items',
      icon: 'shopping-bag',
      feature: 'marketplace',
      description: 'Explore marketplace',
    },
    {
      id: 'sell-item',
      label: 'Sell Item',
      icon: 'plus',
      feature: 'marketplace',
      description: 'List an item for sale',
    },
    {
      id: 'my-wallet',
      label: 'My Wallet',
      icon: 'wallet',
      feature: 'marketplace',
      description: 'View wallet balance',
    },
  ],
  social: [
    {
      id: 'create-post',
      label: 'Create Post',
      icon: 'plus',
      feature: 'social',
      description: 'Share with the community',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'message-square',
      feature: 'social',
      description: 'View your messages',
    },
    {
      id: 'find-friends',
      label: 'Find Friends',
      icon: 'users',
      feature: 'social',
      description: 'Connect with others',
    },
  ],
};

const ICON_MAP = {
  plus: Plus,
  'book-open': BookOpen,
  'shopping-bag': ShoppingBag,
  'message-square': MessageSquare,
  trophy: Trophy,
  'file-text': FileText,
};

/**
 * QuickActionsMenu Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when onActionPress, currentFeature, maxActions, or layout changes.
 * Uses useMemo internally for actions array to prevent recalculation.
 */
const QuickActionsMenu = React.memo(function QuickActionsMenu({
  onActionPress,
  currentFeature = 'quests',
  maxActions,
  layout = 'horizontal',
}: QuickActionsMenuProps) {
  // Accessibility hooks
  const minTouchTarget = useScaledSize(44);
  const { announceForAccessibility } = useAccessibility();

  const actions = useMemo(() => {
    const featureActions = FEATURE_ACTIONS[currentFeature] || [];
    return maxActions ? featureActions.slice(0, maxActions) : featureActions;
  }, [currentFeature, maxActions]);

  // Optimize event handler with useCallback (Phase 7, T114)
  const handleActionPress = useCallback(
    (action: QuickAction) => {
      onActionPress(action);
      announceForAccessibility(`${action.label} selected`);
    },
    [onActionPress, announceForAccessibility]
  );

  if (actions.length === 0) {
    return (
      <View className="items-center rounded-xl border border-gray-700 bg-gray-800 p-6">
        <Text variant="small" className="text-center text-gray-400">
          No quick actions available
        </Text>
      </View>
    );
  }

  const ContainerComponent = layout === 'horizontal' ? ScrollView : View;
  const containerProps =
    layout === 'horizontal' ? { horizontal: true, showsHorizontalScrollIndicator: false } : {};

  return (
    <ContainerComponent
      {...containerProps}
      className={layout === 'horizontal' ? 'flex-row' : 'flex-col'}
      testID="quick-actions-menu"
      accessibilityRole="menu"
      accessibilityLabel="Quick actions menu">
      {actions.map((action) => {
        const IconComponent = ICON_MAP[action.icon as keyof typeof ICON_MAP] || Plus;

        return (
          <Pressable
            key={action.id}
            testID={`action-${action.id}`}
            className={`min-w-[140px] flex-row items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 ${
              layout === 'vertical' ? 'mb-3 mr-0 w-full' : 'mr-3'
            }`}
            style={{ minHeight: minTouchTarget }}
            onPress={() => {
              handleActionPress(action);
            }}
            accessibilityRole="menuitem"
            accessibilityLabel={action.label}
            accessibilityHint={action.description}>
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <IconComponent size={20} color="#ffffff" />
            </View>
            <Text variant="small" className="flex-1 font-semibold text-white">
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </ContainerComponent>
  );
});

export default QuickActionsMenu;
