export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type QuestStatus = 'draft' | 'active' | 'completed' | 'archived';
export type QuestStepType = 'text' | 'video' | 'quiz' | 'upload' | 'code' | 'external' | 'review';
export type QuestStepStatus = 'locked' | 'not_started' | 'in_progress' | 'completed' | 'failed';

/**
 * Text step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestTextContent {
    body: string;
    format?: 'markdown' | 'html' | 'plain';
}

/**
 * Quiz step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestQuizContent {
    questions: Array<{
        id: string;
        text: string;
        type: 'single' | 'multiple' | 'text';
        options?: Array<{
            id: string;
            text: string;
            isCorrect?: boolean;
        }>;
        correctAnswer?: string | string[];
    }>;
    passingScore?: number;
    timeLimit?: number;
}

/**
 * Video step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestVideoContent {
    videoUrl: string;
    duration?: number;
    thumbnail?: string;
    transcript?: string;
}

/**
 * Code challenge step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestCodeContent {
    language: string;
    starterCode?: string;
    testCases?: Array<{
        input: string;
        expectedOutput: string;
    }>;
    solution?: string;
}

/**
 * Upload step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestUploadContent {
    acceptedTypes: string[];
    maxSize?: number;
    instructions?: string;
}

/**
 * External link step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestExternalContent {
    url: string;
    instructions?: string;
    verificationMethod?: 'manual' | 'automatic';
}

/**
 * Review step content
 * FR-011: Replaced `any` with concrete type
 */
export interface QuestReviewContent {
    criteria: Array<{
        id: string;
        name: string;
        description: string;
        weight?: number;
    }>;
    minReviewers?: number;
}

/**
 * Union type for all quest step content types
 * FR-011: Type-safe content based on step type
 */
export type QuestStepContent =
    | QuestTextContent
    | QuestQuizContent
    | QuestVideoContent
    | QuestCodeContent
    | QuestUploadContent
    | QuestExternalContent
    | QuestReviewContent;

/**
 * Quest step metadata
 * FR-011: Replaced `metadata?: any` with concrete interface
 */
export interface QuestStepMetadata {
    createdBy?: string;
    lastModifiedBy?: string;
    version?: number;
    tags?: string[];
    difficulty?: number;
    estimatedTime?: number;
    [key: string]: unknown; // Allow additional metadata with unknown type
}

export interface QuestStep {
    id: string;
    quest_id: string;
    title: string;
    description: string;
    type: QuestStepType;
    order: number;
    /** JSON content depending on type - FR-011: Changed from `any` to typed union */
    content: QuestStepContent;
    /** Step metadata - FR-011: Changed from `any` to typed interface */
    metadata?: QuestStepMetadata;
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
