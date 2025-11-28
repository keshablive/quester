import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Quest as UIQuest } from '@/core/types/quest';
import { Quest as ApiQuest } from '@/core/types/query.types';
import { QuestCard } from './QuestCard';
import { Text, Input, Icon } from '@/components/ui';
import { Search } from 'lucide-react-native';
import { useQuests } from '@/core/hooks/queries/useQuests';
import { useStartQuest } from '@/core/hooks/mutations/useQuestMutations';
import { InfiniteScrollList } from '@/components/shared/InfiniteScrollList';

/**
 * Transform API Quest to UI Quest format
 */
function transformApiQuestToUI(apiQuest: ApiQuest): UIQuest {
  return {
    id: apiQuest.id,
    title: apiQuest.title,
    description: apiQuest.description,
    category: apiQuest.type, // Map type to category
    difficulty:
      apiQuest.difficulty === 'easy'
        ? 'beginner'
        : apiQuest.difficulty === 'medium'
          ? 'intermediate'
          : 'advanced',
    status:
      apiQuest.status === 'available'
        ? 'active'
        : apiQuest.status === 'active'
          ? 'active'
          : 'completed',
    xp_reward: apiQuest.xpReward,
    points_reward: 0,
    estimated_time_minutes: 30, // Default
    min_level_required: 1,
    tags: [],
    steps: apiQuest.steps?.map((step, index) => ({
      id: step.id,
      quest_id: apiQuest.id,
      title: step.title,
      description: step.description,
      type: 'text' as const,
      order: step.order ?? index,
      content: {},
      is_required: true,
      xp_reward: 0,
      points_reward: 0,
    })),
    created_at: apiQuest.createdAt,
    updated_at: apiQuest.createdAt,
    creator_id: '',
    is_completed: apiQuest.status === 'completed',
    progress_percentage: apiQuest.status === 'completed' ? 100 : 0,
  };
}

export interface QuestListProps {
  /** Filter quests by status */
  status?: 'available' | 'active' | 'completed';
  /** Filter quests by type */
  type?: 'daily' | 'weekly' | 'story';
  /** Callback when a quest is pressed */
  onQuestPress: (quest: UIQuest) => void;
}

export function QuestList({ status, type, onQuestPress }: QuestListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useQuests({
      status,
      type,
    });

  const startQuest = useStartQuest();

  // Flatten pages and transform to UI format
  const quests = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => (page.items ?? []).map(transformApiQuestToUI));
  }, [data?.pages]);

  // Client-side search filtering (since API may not support search)
  const filteredQuests = React.useMemo(() => {
    if (!searchQuery) return quests;
    const query = searchQuery.toLowerCase();
    return quests.filter(
      (quest) =>
        quest.title.toLowerCase().includes(query) || quest.description.toLowerCase().includes(query)
    );
  }, [quests, searchQuery]);

  const handleLoadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const renderQuest = React.useCallback(
    ({ item }: { item: UIQuest }) => (
      <View className="px-4">
        <QuestCard quest={item} onPress={onQuestPress} />
      </View>
    ),
    [onQuestPress]
  );

  const renderFooter = React.useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = React.useCallback(() => {
    if (isLoading) return undefined;
    return (
      <View className="flex-1 items-center justify-center py-10">
        <Text className="text-muted-foreground">
          {searchQuery ? 'No quests match your search' : 'No quests available'}
        </Text>
      </View>
    );
  }, [isLoading, searchQuery]);

  return (
    <View className="flex-1">
      <View className="px-4 py-2">
        <View className="relative">
          <View className="absolute left-3 top-3 z-10">
            <Icon as={Search} size={16} className="text-muted-foreground" />
          </View>
          <Input
            placeholder="Search quests..."
            className="pl-10"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <InfiniteScrollList<UIQuest>
        data={filteredQuests}
        keyExtractor={(item) => item.id}
        renderItem={renderQuest}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        isLoading={isLoading}
        isRefreshing={isRefetching}
        onRefresh={handleRefresh}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
