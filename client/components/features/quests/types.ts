import { Quest } from '@/core/types/quest';

export interface QuestCardProps {
    quest: Quest;
    onPress: (quest: Quest) => void;
}

/**
 * @deprecated QuestListProps is now defined inline in QuestList.tsx
 * This interface is kept for backward compatibility only.
 */
export interface QuestListPropsLegacy {
    quests: Quest[];
    isLoading: boolean;
    onRefresh: () => void;
    onQuestPress: (quest: Quest) => void;
    onSearch: (query: string) => void;
}

export interface QuestDetailProps {
    quest: Quest;
    onBack: () => void;
    onStart: () => void;
    onAbandon: () => void;
}
