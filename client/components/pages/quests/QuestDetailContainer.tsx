/**
 * QuestDetailContainer Component
 *
 * Container component that fetches quest data using TanStack Query hooks
 * and integrates optimistic updates for step completion.
 *
 * US2: Responsive Quest Progress with Optimistic Updates (Priority: P1)
 * FR-005: useQuestProgress() returns quest progress with optimistic update support
 * FR-006: useCompleteQuestStep() mutation with immediate UI feedback
 * FR-007: Offline queuing for quest steps
 *
 * @module components/pages/quests/QuestDetailContainer
 */

import * as React from 'react';
import { View, ScrollView, ActivityIndicator, Animated, Easing } from 'react-native';
import { Quest } from '@/core/types/quest';
import { Button, Text, Badge, Icon, Separator, Progress } from '@/components/ui';
import {
  Clock,
  Trophy,
  ArrowLeft,
  CheckCircle,
  Circle,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';
import {
  useQuest,
  useQuestProgress,
  useCompleteQuestStep,
  useStartQuest,
  useAbandonQuest,
  cn,
} from '@/core';
import { OfflineIndicator, ErrorState, MutationErrorToast } from '@/components/shared';
import { useOnlineManager } from '@/core/hooks/useOnlineManager';

// ============================================================================
// Types
// ============================================================================

interface QuestDetailContainerProps {
  /** Quest ID to display */
  questId: string;
  /** Callback when back button is pressed */
  onBack: () => void;
  /** Callback when quest is completed */
  onComplete?: () => void;
}

interface StepItemProps {
  step: {
    id: string;
    title: string;
    description?: string;
    type?: string;
    order?: number;
    completed?: boolean;
  };
  index: number;
  totalSteps: number;
  isCompleting: boolean;
  onComplete: () => void;
  isOffline: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * T028: Quest step item with optimistic update support
 */
function StepItem({ step, index, totalSteps, isCompleting, onComplete, isOffline }: StepItemProps) {
  // Animation for optimistic update feedback
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handlePress = () => {
    if (step.completed || isCompleting) return;

    // Optimistic animation feedback
    setIsAnimating(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => setIsAnimating(false));

    onComplete();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-4 flex-row">
      <View className="mr-4 items-center">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-full',
            step.completed ? 'bg-primary' : isCompleting ? 'bg-primary/50' : 'bg-secondary'
          )}
          onPress={handlePress}
          disabled={step.completed || isCompleting}>
          {step.completed ? (
            <Icon as={CheckCircle} size={20} className="text-primary-foreground" />
          ) : isCompleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="font-semibold text-foreground">{index + 1}</Text>
          )}
        </Button>
        {index < totalSteps - 1 && (
          <View className={cn('mt-2 h-full w-0.5', step.completed ? 'bg-primary' : 'bg-border')} />
        )}
      </View>
      <View className="flex-1 pb-4">
        <Text
          className={cn(
            'mb-1 font-semibold',
            step.completed ? 'text-foreground' : 'text-muted-foreground'
          )}>
          {step.title}
        </Text>
        {step.description && (
          <Text className="text-sm text-muted-foreground">{step.description}</Text>
        )}
        {step.type && (
          <Badge variant="outline" className="mt-2 self-start">
            <Text className="text-xs">{step.type}</Text>
          </Badge>
        )}
        {/* T030: Offline queuing indicator */}
        {isOffline && !step.completed && (
          <View className="mt-2 flex-row items-center">
            <Icon as={WifiOff} size={12} className="mr-1 text-yellow-500" />
            <Text className="text-xs text-yellow-500">Will sync when online</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Loading skeleton for quest detail
 */
function QuestDetailSkeleton() {
  return (
    <View className="flex-1 p-4">
      <View className="mb-4 flex-row gap-2">
        <View className="h-6 w-20 animate-pulse rounded bg-muted" />
        <View className="h-6 w-16 animate-pulse rounded bg-muted" />
      </View>
      <View className="mb-2 h-8 w-3/4 animate-pulse rounded bg-muted" />
      <View className="mb-4 h-4 w-full animate-pulse rounded bg-muted" />
      <View className="mb-6 h-4 w-2/3 animate-pulse rounded bg-muted" />
      <View className="h-2 w-full animate-pulse rounded bg-muted" />
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuestDetailContainer
 *
 * T026: Uses useQuestProgress() hook for quest data
 * T027: Integrates useCompleteQuestStep() mutation
 * T028: Implements optimistic update logic (progress bar, step status)
 * T029: Error rollback with toast notification
 * T030: Offline queuing indicator for quest steps
 *
 * @example
 * ```tsx
 * <Modal visible={!!selectedQuestId}>
 *   <QuestDetailContainer
 *     questId={selectedQuestId}
 *     onBack={() => setSelectedQuestId(null)}
 *     onComplete={handleQuestComplete}
 *   />
 * </Modal>
 * ```
 */
export function QuestDetailContainer({ questId, onBack, onComplete }: QuestDetailContainerProps) {
  // T026: Use TanStack Query hooks
  const {
    data: quest,
    isLoading: questLoading,
    error: questError,
    refetch: refetchQuest,
  } = useQuest(questId);

  const {
    data: progress,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useQuestProgress(questId);

  // T027: Mutation hooks
  const startQuestMutation = useStartQuest();
  const abandonQuestMutation = useAbandonQuest();
  const completeStepMutation = useCompleteQuestStep();

  // T029: Error toast state
  const [errorToast, setErrorToast] = React.useState<{
    visible: boolean;
    message: string;
    retryFn?: () => void;
  }>({
    visible: false,
    message: '',
  });

  // Track which step is being completed for optimistic UI
  const [completingStepId, setCompletingStepId] = React.useState<string | null>(null);

  // T030: Offline status
  const { isOnline } = useOnlineManager();

  // Calculate progress percentage
  const progressPercentage = React.useMemo(() => {
    if (!quest?.steps?.length) return 0;
    const completedSteps = progress?.completedSteps?.length ?? 0;
    return (completedSteps / quest.steps.length) * 100;
  }, [quest?.steps?.length, progress?.completedSteps?.length]);

  // T028: Handle step completion with optimistic update
  const handleStepComplete = React.useCallback(
    (stepId: string) => {
      if (!quest) return;

      // Optimistic UI: show step as completing
      setCompletingStepId(stepId);

      completeStepMutation.mutate(
        { questId, stepId },
        {
          onSuccess: () => {
            setCompletingStepId(null);
            // Check if quest is now complete
            const totalSteps = quest.steps?.length ?? 0;
            const newCompletedCount = (progress?.completedSteps?.length ?? 0) + 1;
            if (newCompletedCount >= totalSteps) {
              onComplete?.();
            }
          },
          onError: (error) => {
            // T029: Rollback optimistic update and show error toast
            setCompletingStepId(null);
            setErrorToast({
              visible: true,
              message: error.message || 'Failed to complete step',
              retryFn: () => handleStepComplete(stepId),
            });
          },
        }
      );
    },
    [questId, quest, progress, completeStepMutation, onComplete]
  );

  // Handle start quest
  const handleStartQuest = React.useCallback(() => {
    startQuestMutation.mutate(questId, {
      onError: (error) => {
        setErrorToast({
          visible: true,
          message: error.message || 'Failed to start quest',
          retryFn: () => handleStartQuest(),
        });
      },
    });
  }, [questId, startQuestMutation]);

  // Handle abandon quest
  const handleAbandonQuest = React.useCallback(() => {
    abandonQuestMutation.mutate(questId, {
      onSuccess: () => onBack(),
      onError: (error) => {
        setErrorToast({
          visible: true,
          message: error.message || 'Failed to abandon quest',
          retryFn: () => handleAbandonQuest(),
        });
      },
    });
  }, [questId, abandonQuestMutation, onBack]);

  // Handle refresh
  const handleRefresh = React.useCallback(() => {
    refetchQuest();
    refetchProgress();
  }, [refetchQuest, refetchProgress]);

  // Loading state
  if (questLoading || progressLoading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon" onPress={onBack} className="mr-2">
            <Icon as={ArrowLeft} size={24} />
          </Button>
          <Text className="text-lg font-semibold">Loading...</Text>
        </View>
        <QuestDetailSkeleton />
      </View>
    );
  }

  // Error state
  if ((questError || progressError) && !quest) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon" onPress={onBack} className="mr-2">
            <Icon as={ArrowLeft} size={24} />
          </Button>
          <Text className="text-lg font-semibold">Error</Text>
        </View>
        <ErrorState
          title="Failed to Load Quest"
          message={questError?.message || progressError?.message || 'An error occurred'}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  if (!quest) {
    return null;
  }

  const isActive = quest.status === 'active';
  const isCompleted = quest.status === 'completed';
  const allStepsComplete = quest.steps?.length === (progress?.completedSteps?.length ?? 0);

  return (
    <View className="flex-1 bg-background">
      {/* T021: OfflineIndicator */}
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center border-b border-border px-4 py-2">
        <Button variant="ghost" size="icon" onPress={onBack} className="mr-2">
          <Icon as={ArrowLeft} size={24} />
        </Button>
        <Text className="flex-1 text-lg font-semibold" numberOfLines={1}>
          {quest.title}
        </Text>
        {isActive && (
          <Button variant="ghost" size="icon" onPress={handleRefresh}>
            <Icon as={RefreshCw} size={20} />
          </Button>
        )}
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Quest Info */}
        <View className="mb-6">
          <View className="mb-4 flex-row gap-2">
            <Badge variant="outline">
              <Text className="text-xs">{quest.type}</Text>
            </Badge>
            <Badge variant="secondary">
              <Text className="text-xs">{quest.difficulty}</Text>
            </Badge>
            {isActive && (
              <Badge variant="default">
                <Text className="text-xs text-primary-foreground">In Progress</Text>
              </Badge>
            )}
          </View>

          <Text className="mb-2 text-2xl font-bold">{quest.title}</Text>
          <Text className="mb-4 text-muted-foreground">{quest.description}</Text>

          {/* Rewards */}
          <View className="mb-6 flex-row gap-6">
            <View className="flex-row items-center">
              <Icon as={Trophy} size={20} className="mr-2 text-yellow-500" />
              <View>
                <Text className="font-semibold">{quest.xpReward} XP</Text>
                <Text className="text-xs text-muted-foreground">Reward</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Icon as={Clock} size={20} className="mr-2 text-blue-500" />
              <View>
                <Text className="font-semibold">30 min</Text>
                <Text className="text-xs text-muted-foreground">Duration</Text>
              </View>
            </View>
          </View>

          {/* T028: Progress bar with optimistic update */}
          {isActive && (
            <View className="mb-6">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-semibold">Progress</Text>
                <Text className="text-sm text-muted-foreground">
                  {progress?.completedSteps?.length ?? 0}/{quest.steps?.length ?? 0} steps
                </Text>
              </View>
              <Progress value={progressPercentage} />
            </View>
          )}
        </View>

        <Separator className="mb-6" />

        {/* Steps */}
        <View className="mb-6">
          <Text className="mb-4 text-lg font-semibold">Steps</Text>
          {quest.steps?.map((step, index) => {
            const isStepCompleted = progress?.completedSteps?.includes(step.id) ?? false;
            const isCompleting = completingStepId === step.id;

            return (
              <StepItem
                key={step.id}
                step={{
                  ...step,
                  completed: isStepCompleted || isCompleting,
                }}
                index={index}
                totalSteps={quest.steps?.length ?? 0}
                isCompleting={isCompleting}
                onComplete={() => handleStepComplete(step.id)}
                isOffline={!isOnline}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View className="border-t border-border p-4">
        {!isActive && !isCompleted && (
          <Button
            size="lg"
            className="w-full"
            onPress={handleStartQuest}
            disabled={startQuestMutation.isPending}>
            {startQuestMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-primary-foreground">Start Quest</Text>
            )}
          </Button>
        )}

        {isActive && !allStepsComplete && (
          <View className="flex-row gap-2">
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onPress={handleAbandonQuest}
              disabled={abandonQuestMutation.isPending}>
              <Text>Abandon</Text>
            </Button>
            <Button size="lg" className="flex-1" disabled>
              <Text className="text-primary-foreground">In Progress</Text>
            </Button>
          </View>
        )}

        {isActive && allStepsComplete && (
          <Button size="lg" className="w-full bg-green-600" onPress={onComplete}>
            <Icon as={Trophy} size={20} className="mr-2 text-white" />
            <Text className="text-white">Claim Rewards</Text>
          </Button>
        )}

        {isCompleted && (
          <View className="flex-row items-center justify-center rounded-lg bg-primary/10 py-3">
            <Icon as={CheckCircle} size={20} className="mr-2 text-primary" />
            <Text className="font-semibold text-primary">Quest Completed</Text>
          </View>
        )}
      </View>

      {/* T029: Error toast with retry */}
      <MutationErrorToast
        message={errorToast.message}
        visible={errorToast.visible}
        onDismiss={() => setErrorToast({ ...errorToast, visible: false })}
        onRetry={errorToast.retryFn}
      />
    </View>
  );
}

export default QuestDetailContainer;
