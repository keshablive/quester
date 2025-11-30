/**
 * Quests Page
 *
 * Route file for quests view. Uses TanStack Query for data fetching
 * and mutations with proper cache invalidation.
 *
 * Phase 3 Migration: Direct service calls replaced with TanStack Query hooks
 * FR-005: System MUST migrate Quests page to use TanStack Query
 * US3: Quest progress and completion with cascade invalidation
 *
 * @module app/quests
 */

import React, { useState, useCallback } from 'react';
import { View, Modal } from 'react-native';
import { QuestList, QuestDetail } from '@/components/pages/quests';
import { Quest } from '@/core/types/quest';
import { useAuth } from '@/core/auth/AuthContext';
import { useStartQuest, useAbandonQuest } from '@/core/hooks/mutations/useQuestMutations';
import { useQuest } from '@/core/hooks/queries/useQuests';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function QuestsPage() {
  const { isAuthenticated } = useAuth();
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // TanStack Query hooks for mutations
  const startQuestMutation = useStartQuest();
  const abandonQuestMutation = useAbandonQuest();

  // Fetch quest details when selected
  const { data: selectedQuest, isLoading: isLoadingDetail } = useQuest(selectedQuestId ?? '', {
    enabled: !!selectedQuestId,
  });

  const handleQuestPress = useCallback((quest: Quest) => {
    setSelectedQuestId(quest.id);
  }, []);

  const handleStartQuest = useCallback(async () => {
    if (!selectedQuestId) return;
    startQuestMutation.mutate(selectedQuestId);
  }, [selectedQuestId, startQuestMutation]);

  const handleAbandonQuest = useCallback(async () => {
    if (!selectedQuestId) return;
    abandonQuestMutation.mutate(selectedQuestId, {
      onSuccess: () => {
        setSelectedQuestId(null);
      },
    });
  }, [selectedQuestId, abandonQuestMutation]);

  const handleBack = useCallback(() => {
    setSelectedQuestId(null);
  }, []);

  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <QuestList onQuestPress={handleQuestPress} />

        <Modal
          visible={!!selectedQuestId}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleBack}>
          {selectedQuest && (
            <QuestDetail
              quest={selectedQuest}
              onBack={handleBack}
              onStart={handleStartQuest}
              onAbandon={handleAbandonQuest}
            />
          )}
        </Modal>
      </View>
    </ChunkErrorBoundary>
  );
}
