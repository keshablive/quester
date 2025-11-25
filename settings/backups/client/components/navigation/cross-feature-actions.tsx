import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Share2, Link, ShoppingBag, MessageSquare, Trophy } from 'lucide-react-native';

export interface CrossFeatureAction {
  id: string;
  label: string;
  icon: string;
  sourceFeature: string;
  targetFeature: string;
  action: 'share' | 'link' | 'list' | 'attach';
  description: string;
  contentId: string;
}

interface CrossFeatureActionsProps {
  onActionPress: (action: CrossFeatureAction) => void;
  sourceFeature: string;
  contentType: string;
  contentId: string;
  maxActions?: number;
  layout?: 'horizontal' | 'vertical';
}

// Map of source feature + content type → available cross-feature actions
const CROSS_FEATURE_ACTIONS_MAP: Record<string, Omit<CrossFeatureAction, 'contentId'>[]> = {
  'quests-quest': [
    {
      id: 'share-quest-social',
      label: 'Share to Social',
      icon: 'share2',
      sourceFeature: 'quests',
      targetFeature: 'social',
      action: 'share',
      description: 'Share this quest with the community',
    },
    {
      id: 'link-quest-learning',
      label: 'Link to Course',
      icon: 'link',
      sourceFeature: 'quests',
      targetFeature: 'learning',
      action: 'link',
      description: 'Connect this quest to a learning course',
    },
  ],
  'learning-course': [
    {
      id: 'link-course-quest',
      label: 'Link to Quest',
      icon: 'link',
      sourceFeature: 'learning',
      targetFeature: 'quests',
      action: 'link',
      description: 'Connect this course to a quest',
    },
    {
      id: 'share-course-social',
      label: 'Share to Social',
      icon: 'share2',
      sourceFeature: 'learning',
      targetFeature: 'social',
      action: 'share',
      description: 'Share this course with friends',
    },
  ],
  'learning-certificate': [
    {
      id: 'share-cert-social',
      label: 'Share to Social',
      icon: 'share2',
      sourceFeature: 'learning',
      targetFeature: 'social',
      action: 'share',
      description: 'Show off your achievement',
    },
    {
      id: 'list-cert-marketplace',
      label: 'List in Marketplace',
      icon: 'shopping-bag',
      sourceFeature: 'learning',
      targetFeature: 'marketplace',
      action: 'list',
      description: 'Sell or trade your certificate',
    },
  ],
  'marketplace-item': [
    {
      id: 'share-item-social',
      label: 'Share to Social',
      icon: 'share2',
      sourceFeature: 'marketplace',
      targetFeature: 'social',
      action: 'share',
      description: 'Share this item with the community',
    },
    {
      id: 'link-item-quest',
      label: 'Link to Quest',
      icon: 'link',
      sourceFeature: 'marketplace',
      targetFeature: 'quests',
      action: 'link',
      description: 'Use this item for a quest reward',
    },
  ],
  'social-post': [
    {
      id: 'attach-quest',
      label: 'Attach Quest',
      icon: 'trophy',
      sourceFeature: 'social',
      targetFeature: 'quests',
      action: 'attach',
      description: 'Attach a quest to this post',
    },
    {
      id: 'attach-item',
      label: 'Attach Item',
      icon: 'shopping-bag',
      sourceFeature: 'social',
      targetFeature: 'marketplace',
      action: 'attach',
      description: 'Attach a marketplace item',
    },
  ],
};

const ICON_MAP = {
  share2: Share2,
  link: Link,
  'shopping-bag': ShoppingBag,
  'message-square': MessageSquare,
  trophy: Trophy,
};

export default function CrossFeatureActions({
  onActionPress,
  sourceFeature,
  contentType,
  contentId,
  maxActions,
  layout = 'horizontal',
}: CrossFeatureActionsProps) {
  const actions = useMemo(() => {
    const key = `${sourceFeature}-${contentType}`;
    const availableActions = CROSS_FEATURE_ACTIONS_MAP[key] || [];

    // Add contentId to each action
    const actionsWithContent = availableActions.map((action) => ({
      ...action,
      contentId,
    }));

    return maxActions ? actionsWithContent.slice(0, maxActions) : actionsWithContent;
  }, [sourceFeature, contentType, contentId, maxActions]);

  // Optimized with useCallback (Phase 7, T114)
  const handleActionPress = React.useCallback(
    (action: CrossFeatureAction) => {
      onActionPress(action);
    },
    [onActionPress]
  );

  if (actions.length === 0) {
    return (
      <View className="items-center rounded-lg border border-gray-600 bg-gray-700 p-4">
        <Text variant="small" className="text-center text-gray-400">
          No actions available
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
      style={{ flexDirection: layout === 'horizontal' ? 'row' : 'column' }}
      testID="cross-feature-actions">
      {actions.map((action) => {
        const IconComponent = ICON_MAP[action.icon as keyof typeof ICON_MAP] || Share2;

        return (
          <Pressable
            key={action.id}
            className={`min-w-[130px] flex-row items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700 px-3.5 py-2.5 active:border-blue-500 active:bg-gray-600 ${
              layout === 'horizontal' ? 'mr-2.5' : 'mb-2.5 w-full'
            }`}
            onPress={() => handleActionPress(action)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.description}>
            <View className="h-7 w-7 items-center justify-center rounded-md bg-green-500">
              <IconComponent size={18} color="#ffffff" />
            </View>
            <Text className="flex-1 text-[13px] font-semibold text-white" numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </ContainerComponent>
  );
}
