import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { QuestList, QuestDetail } from '@/components/pages/quests';
import { Quest } from '@/core/types/quest';
import { questService } from '@/core';
import { useAuth } from '@/core/auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query';

export default function QuestsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  const handleQuestPress = (quest: Quest) => {
    // Fetch full details including steps
    questService
      .getById(quest.id)
      .then((fullQuest) => {
        setSelectedQuest(fullQuest);
      })
      .catch((error) => {
        console.error('Failed to fetch quest details:', error);
        // Fallback to showing what we have
        setSelectedQuest(quest);
      });
  };

  const handleStartQuest = async () => {
    if (!selectedQuest) return;
    try {
      await questService.start(selectedQuest.id);
      // Refresh quest details to show progress
      const updatedQuest = await questService.getById(selectedQuest.id);
      setSelectedQuest(updatedQuest);
      // Invalidate quests cache to refresh list
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.all });
    } catch (error) {
      console.error('Failed to start quest:', error);
    }
  };

  const handleAbandonQuest = async () => {
    if (!selectedQuest) return;
    try {
      await questService.abandon(selectedQuest.id);
      const updatedQuest = await questService.getById(selectedQuest.id);
      setSelectedQuest(updatedQuest);
      // Invalidate quests cache to refresh list
      queryClient.invalidateQueries({ queryKey: queryKeys.quests.all });
    } catch (error) {
      console.error('Failed to abandon quest:', error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <QuestList onQuestPress={handleQuestPress} />

      <Modal
        visible={!!selectedQuest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedQuest(null)}>
        {selectedQuest && (
          <QuestDetail
            quest={selectedQuest}
            onBack={() => setSelectedQuest(null)}
            onStart={handleStartQuest}
            onAbandon={handleAbandonQuest}
          />
        )}
      </Modal>
    </View>
  );
}
