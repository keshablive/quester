/**
 * Workflow Analytics Utility (T086)
 * 
 * Tracks user workflow progression and multi-feature navigation patterns.
 * Provides insights into how users transition between features and
 * the effectiveness of suggested content and quick actions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type FeatureType = 'quests' | 'learning' | 'marketplace' | 'social' | 'certificates';

export interface WorkflowEvent {
  id: string;
  timestamp: number;
  type: 'workflow_started' | 'workflow_completed' | 'step_completed' | 'suggestion_clicked' | 'quick_action_used';
  workflowId?: string;
  sourceFeature: FeatureType;
  targetFeature?: FeatureType;
  sourceId: string;
  targetId?: string;
  context: string;
  metadata?: Record<string, any>;
}

export interface WorkflowSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: WorkflowEvent[];
  completed: boolean;
  abandonedAt?: number;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  abandonedWorkflows: number;
  completionRate: number;
  averageDuration: number;
  mostPopularPaths: Array<{
    path: string;
    count: number;
  }>;
  suggestionClickRate: number;
  quickActionUsageRate: number;
}

class WorkflowAnalytics {
  private static instance: WorkflowAnalytics;
  private currentSession: WorkflowSession | null = null;
  private sessionQueue: WorkflowEvent[] = [];

  private constructor() { }

  static getInstance(): WorkflowAnalytics {
    if (!WorkflowAnalytics.instance) {
      WorkflowAnalytics.instance = new WorkflowAnalytics();
    }
    return WorkflowAnalytics.instance;
  }

  /**
   * Start a new workflow session
   */
  startWorkflow(workflowId: string, sourceFeature: FeatureType, sourceId: string): string {
    const sessionId = `workflow_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      events: [],
      completed: false,
    };

    const event: WorkflowEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'workflow_started',
      workflowId,
      sourceFeature,
      sourceId,
      context: 'workflow_start',
    };

    this.trackEvent(event);
    return sessionId;
  }

  /**
   * Track a workflow event
   */
  trackEvent(event: WorkflowEvent): void {
    if (this.currentSession) {
      this.currentSession.events.push(event);
    }

    this.sessionQueue.push(event);
    this.persistEvent(event);

    // Batch send events every 10 or when queue is full
    if (this.sessionQueue.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Track a workflow step completion
   */
  trackStepCompleted(
    workflowId: string,
    sourceFeature: FeatureType,
    sourceId: string,
    stepIndex: number
  ): void {
    const event: WorkflowEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'step_completed',
      workflowId,
      sourceFeature,
      sourceId,
      context: 'step_completed',
      metadata: { stepIndex },
    };

    this.trackEvent(event);
  }

  /**
   * Track suggestion click
   */
  trackSuggestionClick(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    suggestionType: string
  ): void {
    const event: WorkflowEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'suggestion_clicked',
      sourceFeature,
      targetFeature,
      sourceId,
      targetId,
      context: 'suggestion_interaction',
      metadata: { suggestionType },
    };

    this.trackEvent(event);
  }

  /**
   * Track quick action usage
   */
  trackQuickAction(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    actionId: string
  ): void {
    const event: WorkflowEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'quick_action_used',
      sourceFeature,
      targetFeature,
      sourceId,
      context: 'quick_action',
      metadata: { actionId },
    };

    this.trackEvent(event);
  }

  /**
   * Complete the current workflow session
   */
  completeWorkflow(workflowId: string): void {
    if (!this.currentSession) return;

    this.currentSession.completed = true;
    this.currentSession.endTime = Date.now();

    const event: WorkflowEvent = {
      id: `event_${Date.now()}`,
      timestamp: Date.now(),
      type: 'workflow_completed',
      workflowId,
      sourceFeature: this.currentSession.events[0]?.sourceFeature || 'quests',
      sourceId: this.currentSession.events[0]?.sourceId || '',
      context: 'workflow_complete',
      metadata: {
        duration: this.currentSession.endTime - this.currentSession.startTime,
        stepCount: this.currentSession.events.filter(e => e.type === 'step_completed').length,
      },
    };

    this.trackEvent(event);
    this.persistSession(this.currentSession);
    this.currentSession = null;
  }

  /**
   * Abandon the current workflow
   */
  abandonWorkflow(): void {
    if (!this.currentSession) return;

    this.currentSession.abandonedAt = Date.now();
    this.persistSession(this.currentSession);
    this.currentSession = null;
  }

  /**
   * Get workflow metrics
   */
  async getMetrics(period: 'day' | 'week' | 'month' = 'week'): Promise<WorkflowMetrics> {
    const sessions = await this.getSessions(period);
    const events = sessions.flatMap(s => s.events);

    const totalWorkflows = sessions.length;
    const completedWorkflows = sessions.filter(s => s.completed).length;
    const abandonedWorkflows = sessions.filter(s => s.abandonedAt).length;

    const completionRate = totalWorkflows > 0 ? (completedWorkflows / totalWorkflows) * 100 : 0;

    const durations = sessions
      .filter(s => s.endTime)
      .map(s => s.endTime! - s.startTime);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const pathCounts = new Map<string, number>();
    sessions.forEach(session => {
      const path = session.events
        .filter(e => e.type === 'step_completed')
        .map(e => e.sourceFeature)
        .join(' → ');

      if (path) {
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }
    });

    const mostPopularPaths = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const suggestionClicks = events.filter(e => e.type === 'suggestion_clicked').length;
    const totalInteractions = events.length;
    const suggestionClickRate = totalInteractions > 0
      ? (suggestionClicks / totalInteractions) * 100
      : 0;

    const quickActionUses = events.filter(e => e.type === 'quick_action_used').length;
    const quickActionUsageRate = totalInteractions > 0
      ? (quickActionUses / totalInteractions) * 100
      : 0;

    return {
      totalWorkflows,
      completedWorkflows,
      abandonedWorkflows,
      completionRate,
      averageDuration,
      mostPopularPaths,
      suggestionClickRate,
      quickActionUsageRate,
    };
  }

  /**
   * Persist event to AsyncStorage
   */
  private async persistEvent(event: WorkflowEvent): Promise<void> {
    try {
      const key = `workflow_event_${event.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    } catch (error) {
      console.error('Failed to persist workflow event:', error);
    }
  }

  /**
   * Persist session to AsyncStorage
   */
  private async persistSession(session: WorkflowSession): Promise<void> {
    try {
      const key = `workflow_session_${session.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to persist workflow session:', error);
    }
  }

  /**
   * Get sessions from AsyncStorage
   */
  private async getSessions(period: 'day' | 'week' | 'month'): Promise<WorkflowSession[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(k => k.startsWith('workflow_session_'));
      const sessions = await AsyncStorage.multiGet(sessionKeys);

      const cutoffTime = Date.now() - this.getPeriodMs(period);

      return sessions
        .map(([_, value]) => (value ? JSON.parse(value) : null))
        .filter((session): session is WorkflowSession =>
          session !== null && session.startTime >= cutoffTime
        );
    } catch (error) {
      console.error('Failed to get workflow sessions:', error);
      return [];
    }
  }

  /**
   * Flush queued events (send to backend)
   */
  private async flushEvents(): Promise<void> {
    if (this.sessionQueue.length === 0) return;

    const eventsToSend = [...this.sessionQueue];
    this.sessionQueue = [];

    try {
      // TODO: Send to backend analytics API
      // await analyticsAPI.trackWorkflowEvents(eventsToSend);
      console.log('Flushed workflow events:', eventsToSend.length);
    } catch (error) {
      console.error('Failed to flush workflow events:', error);
      // Re-queue events on failure
      this.sessionQueue.push(...eventsToSend);
    }
  }

  /**
   * Get period in milliseconds
   */
  private getPeriodMs(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Clear all workflow data (for testing)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const workflowKeys = keys.filter(k =>
        k.startsWith('workflow_event_') || k.startsWith('workflow_session_')
      );
      await AsyncStorage.multiRemove(workflowKeys);
    } catch (error) {
      console.error('Failed to clear workflow data:', error);
    }
  }
}

// Export singleton instance
export const workflowAnalytics = WorkflowAnalytics.getInstance();

// Convenience hooks
export function useWorkflowAnalytics() {
  return {
    startWorkflow: workflowAnalytics.startWorkflow.bind(workflowAnalytics),
    trackStepCompleted: workflowAnalytics.trackStepCompleted.bind(workflowAnalytics),
    trackSuggestionClick: workflowAnalytics.trackSuggestionClick.bind(workflowAnalytics),
    trackQuickAction: workflowAnalytics.trackQuickAction.bind(workflowAnalytics),
    completeWorkflow: workflowAnalytics.completeWorkflow.bind(workflowAnalytics),
    abandonWorkflow: workflowAnalytics.abandonWorkflow.bind(workflowAnalytics),
    getMetrics: workflowAnalytics.getMetrics.bind(workflowAnalytics),
  };
}
