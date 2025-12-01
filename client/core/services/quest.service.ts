import { apiClient } from '../api/client';
import { Quest, QuestFilters, QuestProgress } from '../types/quest';

export const questService = {
    /**
     * Get all quests with optional filters
     */
    getAll: async (filters?: QuestFilters): Promise<{ data: Quest[]; meta: any }> => {
        const params = new URLSearchParams();
        if (filters?.category) params.append('category', filters.category);
        if (filters?.difficulty) params.append('difficulty', filters.difficulty);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        return apiClient.get<{ data: Quest[]; meta: any }>(`/quests?${params.toString()}`);
    },

    /**
     * Get a single quest by ID
     */
    getById: async (id: string): Promise<Quest> => {
        return apiClient.get<Quest>(`/quests/${id}`);
    },

    /**
     * Get user's quests (created or joined depending on API, usually created)
     */
    getMyQuests: async (): Promise<Quest[]> => {
        return apiClient.get<Quest[]>('/quests/my');
    },

    /**
     * Start a quest
     */
    start: async (questId: string): Promise<QuestProgress> => {
        return apiClient.post<QuestProgress>(`/progress/${questId}/start`);
    },

    /**
     * Complete a quest step
     */
    completeStep: async (questId: string, stepId: string, data?: any): Promise<{ success: boolean; progress: QuestProgress }> => {
        return apiClient.post<{ success: boolean; progress: QuestProgress }>(`/progress/${questId}/steps/${stepId}/complete`, data);
    },

    /**
     * Complete a quest
     */
    complete: async (questId: string): Promise<{ success: boolean; rewards: any }> => {
        return apiClient.post<{ success: boolean; rewards: any }>(`/progress/${questId}/complete`);
    },

    /**
     * Abandon a quest
     */
    abandon: async (questId: string): Promise<void> => {
        return apiClient.post<void>(`/progress/${questId}/abandon`);
    },

    /**
     * Rate a quest
     */
    rate: async (questId: string, rating: number, review?: string): Promise<void> => {
        return apiClient.post<void>(`/progress/${questId}/rate`, { rating, review });
    },

    /**
     * Get global leaderboard
     */
    getLeaderboard: async (params?: any): Promise<any> => {
        const query = new URLSearchParams(params).toString();
        return apiClient.get<any>(`/leaderboard?${query}`);
    }
};
