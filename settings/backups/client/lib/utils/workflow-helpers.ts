/**
 * Workflow Helper Utilities
 * Feature 003, T025: Utilities for cross-feature workflow orchestration
 * 
 * Provides helper functions for generating quick actions, suggesting content,
 * and linking features together.
 * 
 * Usage:
 * ```typescript
 * import { generateQuickActions, getSuggestedContent, linkFeatures } from '@/lib/utils/workflow-helpers';
 * 
 * // Generate quick actions after quest completion
 * const actions = generateQuickActions('quest', { questId: '123', completed: true });
 * 
 * // Get suggested content for user
 * const suggestions = getSuggestedContent({ interests: ['coding', 'design'] });
 * 
 * // Link features together
 * const links = linkFeatures('course', { courseId: '456' });
 * ```
 */

import { FeatureType } from '@/lib/types/navigation';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  feature: FeatureType;
  action: string;
  params?: Record<string, any>;
  priority: number; // Higher = more important
}

export interface SuggestedContent {
  id: string;
  type: 'quest' | 'course' | 'marketplace-item' | 'property' | 'video' | 'live-stream';
  title: string;
  description: string;
  thumbnail?: string;
  feature: FeatureType;
  relevanceScore: number; // 0-100
  reason: string; // Why it's being suggested
}

export interface FeatureLink {
  feature: FeatureType;
  label: string;
  icon: string;
  route: string;
  params?: Record<string, any>;
}

/**
 * Generate quick actions based on context
 * 
 * @param sourceFeature - The feature where the action originated
 * @param context - Context about the action
 * @returns Array of quick actions sorted by priority
 */
export function generateQuickActions(
  sourceFeature: FeatureType,
  context: Record<string, any>
): QuickAction[] {
  const actions: QuickAction[] = [];

  switch (sourceFeature) {
    case 'quests':
      if (context.completed) {
        actions.push(
          {
            id: 'share-quest-completion',
            label: 'Share Achievement',
            icon: 'share',
            feature: 'social',
            action: 'share-post',
            params: { type: 'quest-completion', questId: context.questId },
            priority: 90,
          },
          {
            id: 'view-certificate',
            label: 'View Certificate',
            icon: 'certificate',
            feature: 'learning',
            action: 'view-certificate',
            params: { questId: context.questId },
            priority: 80,
          },
          {
            id: 'browse-similar-quests',
            label: 'Find Similar Quests',
            icon: 'search',
            feature: 'quests',
            action: 'browse',
            params: { category: context.category },
            priority: 70,
          }
        );
      }
      break;

    case 'learning':
      if (context.completed && context.certificate) {
        actions.push(
          {
            id: 'share-certificate',
            label: 'Share Certificate',
            icon: 'share',
            feature: 'social',
            action: 'share-post',
            params: { type: 'certificate', certificateId: context.certificateId },
            priority: 95,
          },
          {
            id: 'list-certificate',
            label: 'List on Marketplace',
            icon: 'store',
            feature: 'marketplace',
            action: 'create-listing',
            params: { type: 'certificate', certificateId: context.certificateId },
            priority: 85,
          },
          {
            id: 'add-to-showcase',
            label: 'Add to Profile',
            icon: 'user',
            feature: 'social',
            action: 'add-to-profile',
            params: { certificateId: context.certificateId },
            priority: 75,
          }
        );
      }
      break;

    case 'marketplace':
      if (context.purchased) {
        actions.push(
          {
            id: 'rate-seller',
            label: 'Rate Seller',
            icon: 'star',
            feature: 'marketplace',
            action: 'rate',
            params: { sellerId: context.sellerId, transactionId: context.transactionId },
            priority: 85,
          },
          {
            id: 'message-seller',
            label: 'Message Seller',
            icon: 'message',
            feature: 'messaging',
            action: 'start-conversation',
            params: { userId: context.sellerId },
            priority: 75,
          }
        );
      }
      break;

    case 'video':
      if (context.watched) {
        actions.push(
          {
            id: 'enroll-full-course',
            label: 'Enroll in Full Course',
            icon: 'book',
            feature: 'learning',
            action: 'enroll',
            params: { courseId: context.courseId },
            priority: 90,
          },
          {
            id: 'follow-creator',
            label: 'Follow Creator',
            icon: 'user-plus',
            feature: 'social',
            action: 'follow',
            params: { userId: context.creatorId },
            priority: 80,
          },
          {
            id: 'browse-similar-videos',
            label: 'Watch Similar',
            icon: 'video',
            feature: 'video',
            action: 'browse',
            params: { category: context.category },
            priority: 70,
          }
        );
      }
      break;

    case 'properties':
      if (context.viewed) {
        actions.push(
          {
            id: 'message-owner',
            label: 'Message Owner',
            icon: 'message',
            feature: 'messaging',
            action: 'start-conversation',
            params: { userId: context.ownerId },
            priority: 95,
          },
          {
            id: 'view-owner-profile',
            label: 'View Owner Profile',
            icon: 'user',
            feature: 'social',
            action: 'view-profile',
            params: { userId: context.ownerId },
            priority: 75,
          },
          {
            id: 'browse-similar-properties',
            label: 'Find Similar',
            icon: 'search',
            feature: 'properties',
            action: 'browse',
            params: { category: context.category, location: context.location },
            priority: 70,
          }
        );
      }
      break;

    case 'social':
      if (context.postCreated) {
        actions.push(
          {
            id: 'boost-post',
            label: 'Boost Post',
            icon: 'trending-up',
            feature: 'marketplace',
            action: 'boost-listing',
            params: { postId: context.postId },
            priority: 70,
          }
        );
      }
      break;

    default:
      break;
  }

  // Sort by priority (highest first)
  return actions.sort((a, b) => b.priority - a.priority);
}

/**
 * Get suggested content based on user context
 * 
 * @param userContext - Information about the user's interests and activity
 * @returns Array of suggested content sorted by relevance
 */
export function getSuggestedContent(userContext: {
  interests?: string[];
  recentActivity?: Array<{ feature: FeatureType; id: string }>;
  completedQuests?: number;
  coursesEnrolled?: number;
}): SuggestedContent[] {
  const suggestions: SuggestedContent[] = [];

  // Suggest quests based on activity level
  if ((userContext.completedQuests || 0) < 5) {
    suggestions.push({
      id: 'beginner-quests',
      type: 'quest',
      title: 'Beginner Quests',
      description: 'Start your journey with these easy quests',
      feature: 'quests',
      relevanceScore: 85,
      reason: 'Perfect for getting started',
    });
  }

  // Suggest courses if user is active in quests
  if ((userContext.completedQuests || 0) >= 3 && (userContext.coursesEnrolled || 0) === 0) {
    suggestions.push({
      id: 'intro-courses',
      type: 'course',
      title: 'Recommended Courses',
      description: 'Build on your quest experience with structured learning',
      feature: 'learning',
      relevanceScore: 90,
      reason: 'Based on your quest completion',
    });
  }

  // Suggest marketplace exploration
  if ((userContext.completedQuests || 0) >= 5) {
    suggestions.push({
      id: 'marketplace-intro',
      type: 'marketplace-item',
      title: 'Explore Marketplace',
      description: 'Discover items and services from the community',
      feature: 'marketplace',
      relevanceScore: 75,
      reason: 'You have enough experience to explore',
    });
  }

  // Interest-based suggestions
  if (userContext.interests?.includes('video')) {
    suggestions.push({
      id: 'trending-videos',
      type: 'video',
      title: 'Trending Videos',
      description: 'Watch what the community is watching',
      feature: 'video',
      relevanceScore: 80,
      reason: 'Based on your interests',
    });
  }

  if (userContext.interests?.includes('property')) {
    suggestions.push({
      id: 'featured-properties',
      type: 'property',
      title: 'Featured Properties',
      description: 'Explore properties in your area',
      feature: 'properties',
      relevanceScore: 82,
      reason: 'Based on your interests',
    });
  }

  // Sort by relevance (highest first)
  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Generate feature links based on current context
 * 
 * @param currentFeature - The feature currently being viewed
 * @param context - Context about what's being viewed
 * @returns Array of related feature links
 */
export function linkFeatures(
  currentFeature: FeatureType,
  context: Record<string, any>
): FeatureLink[] {
  const links: FeatureLink[] = [];

  switch (currentFeature) {
    case 'learning':
      links.push(
        {
          feature: 'quests',
          label: 'Practice with Quests',
          icon: 'target',
          route: '/quests',
          params: { category: context.category },
        },
        {
          feature: 'marketplace',
          label: 'Buy Study Materials',
          icon: 'shopping-cart',
          route: '/marketplace',
          params: { search: context.courseName },
        },
        {
          feature: 'social',
          label: 'Study Group',
          icon: 'users',
          route: '/social',
          params: { topic: context.courseId },
        }
      );
      break;

    case 'marketplace':
      if (context.itemType === 'certificate') {
        links.push({
          feature: 'learning',
          label: 'View Related Course',
          icon: 'book',
          route: '/courses',
          params: { courseId: context.courseId },
        });
      }
      links.push(
        {
          feature: 'social',
          label: 'Seller Profile',
          icon: 'user',
          route: '/social/profile',
          params: { userId: context.sellerId },
        },
        {
          feature: 'messaging',
          label: 'Ask Seller',
          icon: 'message-circle',
          route: '/messages',
          params: { userId: context.sellerId },
        }
      );
      break;

    case 'properties':
      links.push(
        {
          feature: 'social',
          label: 'Owner Profile',
          icon: 'user',
          route: '/social/profile',
          params: { userId: context.ownerId },
        },
        {
          feature: 'messaging',
          label: 'Contact Owner',
          icon: 'message-circle',
          route: '/messages',
          params: { userId: context.ownerId },
        },
        {
          feature: 'marketplace',
          label: 'Related Services',
          icon: 'briefcase',
          route: '/marketplace',
          params: { search: 'property services' },
        }
      );
      break;

    case 'video':
      if (context.hasFullCourse) {
        links.push({
          feature: 'learning',
          label: 'Full Course',
          icon: 'book-open',
          route: '/courses',
          params: { courseId: context.courseId },
        });
      }
      links.push(
        {
          feature: 'social',
          label: 'Creator Profile',
          icon: 'user',
          route: '/social/profile',
          params: { userId: context.creatorId },
        },
        {
          feature: 'quests',
          label: 'Related Quests',
          icon: 'target',
          route: '/quests',
          params: { category: context.category },
        }
      );
      break;

    case 'social':
      links.push(
        {
          feature: 'messaging',
          label: 'Send Message',
          icon: 'message-circle',
          route: '/messages',
          params: { userId: context.userId },
        },
        {
          feature: 'marketplace',
          label: 'View Listings',
          icon: 'shopping-bag',
          route: '/marketplace',
          params: { sellerId: context.userId },
        }
      );
      break;

    default:
      break;
  }

  return links;
}

/**
 * Calculate workflow completion percentage
 * 
 * @param workflow - Array of steps in the workflow
 * @param completedSteps - Array of completed step IDs
 * @returns Completion percentage (0-100)
 */
export function calculateWorkflowCompletion(
  workflow: Array<{ id: string; required: boolean }>,
  completedSteps: string[]
): number {
  const requiredSteps = workflow.filter((step) => step.required);
  const completedRequiredSteps = requiredSteps.filter((step) =>
    completedSteps.includes(step.id)
  );

  if (requiredSteps.length === 0) return 100;

  return Math.round((completedRequiredSteps.length / requiredSteps.length) * 100);
}

/**
 * Get next workflow step
 * 
 * @param workflow - Array of steps in the workflow
 * @param completedSteps - Array of completed step IDs
 * @returns Next step to complete, or null if workflow is done
 */
export function getNextWorkflowStep(
  workflow: Array<{ id: string; feature: FeatureType; label: string }>,
  completedSteps: string[]
): { id: string; feature: FeatureType; label: string } | null {
  return workflow.find((step) => !completedSteps.includes(step.id)) || null;
}
