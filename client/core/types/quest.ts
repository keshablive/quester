export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type QuestStatus = 'draft' | 'active' | 'completed' | 'archived';
export type QuestStepType = 'text' | 'video' | 'quiz' | 'upload' | 'code' | 'external' | 'review';
export type QuestStepStatus = 'locked' | 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface QuestStep {
    id: string;
    quest_id: string;
    title: string;
    description: string;
    type: QuestStepType;
    order: number;
    content: any; // JSON content depending on type
    metadata?: any;
    is_required: boolean;
    xp_reward: number;
    points_reward: number;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: QuestDifficulty;
    status: QuestStatus;
    xp_reward: number;
    points_reward: number;
    estimated_time_minutes: number;
    min_level_required: number;
    max_attempts?: number;
    tags: string[];
    steps?: QuestStep[];
    created_at: string;
    updated_at: string;
    creator_id: string;

    // Computed/User specific
    is_completed?: boolean;
    progress_percentage?: number;
    current_step_id?: string;
}

export interface QuestProgress {
    id: string;
    user_id: string;
    quest_id: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    current_step_id: string;
    steps_completed: string[];
    started_at: string;
    completed_at?: string;
    last_activity_at: string;
}

export interface QuestFilters {
    category?: string;
    difficulty?: QuestDifficulty;
    status?: QuestStatus;
    search?: string;
    page?: number;
    limit?: number;
}
