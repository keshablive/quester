/**
 * OfflineQueue Service
 * Phase 8, T128: Queue for offline actions
 * 
 * Manages a persistent queue of actions that failed due to network issues.
 * Actions are stored in AsyncStorage and automatically synced when online.
 * 
 * Usage:
 * ```typescript
 * const queue = new OfflineQueue();
 * await queue.initialize();
 * 
 * // Add action to queue
 * await queue.add({
 *   type: 'like',
 *   payload: { contentId: '123' }
 * });
 * 
 * // Process queue when online
 * await queue.processAll(async (action) => {
 *   await api.executeAction(action);
 * });
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_STORAGE_KEY = 'offline_queue';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
  error?: string;
}

export interface ActionToQueue {
  type: string;
  payload: any;
}

export interface ProcessOptions {
  maxRetries?: number;
  onProgress?: (current: number, total: number) => void;
}

type EventType = 'added' | 'removed' | 'cleared' | 'processed';
type EventListener = (data?: any) => void;

/**
 * OfflineQueue Service
 * 
 * Persistent FIFO queue for offline actions with retry logic.
 * 
 * Features:
 * - Persistent storage with AsyncStorage
 * - FIFO processing order
 * - Retry counting and max retry limits
 * - Event listeners for queue changes
 * - Batch processing
 * - Error handling
 */
export class OfflineQueue {
  private queue: QueuedAction[] = [];
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private isInitialized = false;
  private isProcessing = false;

  /**
   * Initialize queue by loading from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue from storage:', error);
      this.queue = [];
    }

    this.isInitialized = true;
  }

  /**
   * Add action to queue
   */
  async add(action: ActionToQueue): Promise<QueuedAction> {
    const queuedAction: QueuedAction = {
      id: this.generateId(),
      type: action.type,
      payload: action.payload,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedAction);
    await this.persist();
    this.emit('added', queuedAction);

    return queuedAction;
  }

  /**
   * Remove action from queue by ID
   */
  async remove(id: string): Promise<void> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((action) => action.id !== id);

    if (this.queue.length !== initialLength) {
      await this.persist();
      this.emit('removed', id);
    }
  }

  /**
   * Get all actions in queue
   */
  async getAll(): Promise<QueuedAction[]> {
    return [...this.queue];
  }

  /**
   * Get action by ID
   */
  async getById(id: string): Promise<QueuedAction | null> {
    return this.queue.find((action) => action.id === id) || null;
  }

  /**
   * Get queue count
   */
  async count(): Promise<number> {
    return this.queue.length;
  }

  /**
   * Clear all actions from queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
    this.emit('cleared');
  }

  /**
   * Increment retry count for action
   */
  async incrementRetry(id: string): Promise<void> {
    const action = this.queue.find((a) => a.id === id);
    if (action) {
      action.retries += 1;
      await this.persist();
    }
  }

  /**
   * Process all actions in queue
   */
  async processAll(
    processor: (action: QueuedAction) => Promise<void>,
    options: ProcessOptions = {}
  ): Promise<void> {
    const { maxRetries = 3, onProgress } = options;

    if (this.isProcessing) {
      console.warn('[OfflineQueue] Already processing queue');
      return;
    }

    this.isProcessing = true;

    try {
      const total = this.queue.length;
      let processed = 0;

      // Process in FIFO order
      for (let i = 0; i < this.queue.length; i++) {
        const action = this.queue[i];

        try {
          await processor(action);

          // Success - remove from queue
          this.queue.splice(i, 1);
          i--; // Adjust index after removal

          processed++;
          if (onProgress) {
            onProgress(processed, total);
          }

          this.emit('processed', action);
        } catch (error) {
          console.error('[OfflineQueue] Failed to process action:', error);

          // Increment retry count
          action.retries += 1;
          action.error = error instanceof Error ? error.message : String(error);

          // Remove if max retries exceeded
          if (action.retries > maxRetries) {
            console.warn(
              `[OfflineQueue] Removing action ${action.id} after ${action.retries} failed attempts`
            );
            this.queue.splice(i, 1);
            i--;
          }
        }
      }

      await this.persist();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Add event listener
   */
  on(event: EventType, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: EventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: EventType, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data));
    }
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Generate unique ID for action
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
