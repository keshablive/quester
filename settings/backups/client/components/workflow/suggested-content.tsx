import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { BookOpen, Trophy, ShoppingBag, Users, Award, Sparkles } from 'lucide-react-native';
import { useAccessibility, useScaledSize } from '@/lib/hooks/use-accessibility';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'quest' | 'course' | 'item' | 'social' | 'certificate';
  targetFeature: string;
  icon: string;
  category?: string;
}

interface SuggestedContentProps {
  onSuggestionPress: (suggestion: Suggestion) => void;
  currentFeature: string;
  context: string;
  contextData?: Record<string, any>;
  maxSuggestions?: number;
  layout?: 'list' | 'grid';
  groupByCategory?: boolean;
  userHistory?: {
    completedQuests?: string[];
    enrolledCourses?: string[];
    interests?: string[];
  };
}

// Context-based suggestion mapping
const SUGGESTION_MAP: Record<string, Record<string, Omit<Suggestion, 'id'>[]>> = {
  quests: {
    quest_completed: [
      {
        title: 'Related Course',
        description: 'Learn skills for advanced quests',
        type: 'course',
        targetFeature: 'learning',
        icon: 'book-open',
        category: 'Learning',
      },
      {
        title: 'Quest Rewards',
        description: 'Spend your earnings in marketplace',
        type: 'item',
        targetFeature: 'marketplace',
        icon: 'shopping-bag',
        category: 'Marketplace',
      },
      {
        title: 'Share Achievement',
        description: 'Post about your success',
        type: 'social',
        targetFeature: 'social',
        icon: 'users',
        category: 'Social',
      },
    ],
    browsing: [
      {
        title: 'Recommended Quest',
        description: 'Based on your interests',
        type: 'quest',
        targetFeature: 'quests',
        icon: 'trophy',
        category: 'Quests',
      },
    ],
  },
  learning: {
    course_completed: [
      {
        title: 'Claim Certificate',
        description: 'Get your completion certificate',
        type: 'certificate',
        targetFeature: 'learning',
        icon: 'award',
        category: 'Achievements',
      },
      {
        title: 'Apply Skills',
        description: 'Try related quests',
        type: 'quest',
        targetFeature: 'quests',
        icon: 'trophy',
        category: 'Practice',
      },
      {
        title: 'Share Certificate',
        description: 'Show off your achievement',
        type: 'social',
        targetFeature: 'social',
        icon: 'users',
        category: 'Social',
      },
    ],
    browsing: [
      {
        title: 'Continue Learning',
        description: 'Resume your current course',
        type: 'course',
        targetFeature: 'learning',
        icon: 'book-open',
        category: 'Learning',
      },
    ],
  },
  marketplace: {
    purchase_completed: [
      {
        title: 'Use in Quest',
        description: 'Apply your new item',
        type: 'quest',
        targetFeature: 'quests',
        icon: 'trophy',
        category: 'Quests',
      },
      {
        title: 'Show Friends',
        description: 'Share your purchase',
        type: 'social',
        targetFeature: 'social',
        icon: 'users',
        category: 'Social',
      },
    ],
    browsing: [
      {
        title: 'Recommended Items',
        description: 'Based on your profile',
        type: 'item',
        targetFeature: 'marketplace',
        icon: 'shopping-bag',
        category: 'Marketplace',
      },
    ],
  },
};

const ICON_MAP = {
  'book-open': BookOpen,
  trophy: Trophy,
  'shopping-bag': ShoppingBag,
  users: Users,
  award: Award,
  sparkles: Sparkles,
};

export default function SuggestedContent({
  onSuggestionPress,
  currentFeature,
  context,
  maxSuggestions,
  layout = 'list',
  groupByCategory = false,
  userHistory,
}: SuggestedContentProps) {
  const suggestions = useMemo(() => {
    const featureMap = SUGGESTION_MAP[currentFeature];
    if (!featureMap) return [];

    const contextSuggestions = featureMap[context] || [];

    // Add IDs to suggestions
    const withIds = contextSuggestions.map((suggestion, index) => ({
      ...suggestion,
      id: `${currentFeature}-${context}-${index}`,
    }));

    // Filter based on user history if provided
    let filtered = withIds;
    if (userHistory?.interests && userHistory.interests.length > 0) {
      // In production, this would use actual personalization logic
      filtered = withIds;
    }

    return maxSuggestions ? filtered.slice(0, maxSuggestions) : filtered;
  }, [currentFeature, context, maxSuggestions, userHistory]);

  if (suggestions.length === 0) {
    return (
      <View className="items-center p-8">
        <Text variant="p" className="text-gray-500">
          No suggestions available
        </Text>
      </View>
    );
  }

  const groupedSuggestions = useMemo(() => {
    if (!groupByCategory) return null;

    const groups: Record<string, Suggestion[]> = {};
    suggestions.forEach((suggestion) => {
      const category = suggestion.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(suggestion);
    });
    return groups;
  }, [suggestions, groupByCategory]);

  // Accessibility hooks
  const minTouchTarget = useScaledSize(44);
  const { announceForAccessibility } = useAccessibility();

  const renderSuggestion = (suggestion: Suggestion) => {
    const IconComponent = ICON_MAP[suggestion.icon as keyof typeof ICON_MAP] || Sparkles;

    return (
      <Pressable
        key={suggestion.id}
        className="mb-3 flex-row items-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:scale-[0.98] active:opacity-80"
        style={[
          layout === 'grid' && { flex: 1, marginHorizontal: 4 },
          { minHeight: minTouchTarget },
        ]}
        onPress={() => {
          onSuggestionPress(suggestion);
          announceForAccessibility(`Opening ${suggestion.title}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={suggestion.title}
        accessibilityHint={suggestion.description}>
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-500">
          <IconComponent size={20} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text variant="h4" className="mb-1 text-gray-800">
            {suggestion.title}
          </Text>
          <Text variant="small" className="text-gray-600" numberOfLines={2}>
            {suggestion.description}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="p-4" testID="suggested-content">
      <View className="mb-4 flex-row items-center gap-2">
        <Sparkles size={18} color="#4299e1" />
        <Text variant="h3" className="text-gray-800">
          Suggested for you
        </Text>
      </View>

      {groupByCategory && groupedSuggestions ? (
        <ScrollView>
          {Object.entries(groupedSuggestions).map(([category, items]) => (
            <View key={category} className="mb-4">
              <Text variant="small" className="px-4 py-2 font-semibold text-gray-600">
                {category}
              </Text>
              <View className={layout === 'grid' ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
                {items.map(renderSuggestion)}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className={layout === 'grid' ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
          {suggestions.map(renderSuggestion)}
        </View>
      )}
    </View>
  );
}
