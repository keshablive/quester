/**
 * Offline Mutation Queue
 *
 * Queues mutations when offline and automatically retries
 * when connectivity is restored.
 *
 * Edge Case: "What happens when user goes offline mid-mutation?"
 * → Queue mutation for retry when online, show pending indicator
 *
 * @module core/query/offlineQueue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { OFFLINE_QUEUE_LIMITS } from './constants';

/**
 * Queued mutation for offline retry
 */
export interface QueuedMutation<TVariables = unknown> {
  id: string;
  mutationKey: string;
  variables: TVariables;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'retrying' | 'failed';
}

/**
 * Offline mutation queue configuration
 */
export interface OfflineQueueConfig {
  /** Maximum queued mutations (default: 50) */
  maxQueueSize: number;
  /** Per-mutation retry limit (default: 3) */
  maxRetries: number;
  /** Persist to AsyncStorage (default: true) */
  persistQueue: boolean;
  /** Callback when connectivity restored */
  onOnline?: () => void;
  /** Callback when mutation succeeds */
  onMutationSuccess?: (mutation: QueuedMutation) => void;
  /** Callback when mutation fails */
  onMutationFailure?: (mutation: QueuedMutation, error: Error) => void;
}

/**
 * Mutation executor function type
 */
type MutationExecutor<TVariables, TResult> = (
  variables: TVariables
) => Promise<TResult>;

/**
 * Registered mutation executors
 */
const mutationExecutors = new Map<string, MutationExecutor<unknown, unknown>>();

/**
 * Storage key for persisted queue
 */
const QUEUE_STORAGE_KEY = 'quester-offline-mutation-queue';

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG: OfflineQueueConfig = {
  maxQueueSize: OFFLINE_QUEUE_LIMITS.MAX_QUEUE_SIZE,
  maxRetries: OFFLINE_QUEUE_LIMITS.MAX_RETRIES,
  persistQueue: true,
};

/**
 * Generate unique mutation ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Offline Mutation Queue class
 */
class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
  private config: OfflineQueueConfig;
  private isProcessing = false;
  private unsubscribeOnline: (() => void) | null = null;

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the queue and start listening for connectivity changes
   */
  async initialize(): Promise<void> {
    // Load persisted queue
    if (this.config.persistQueue) {
      await this.loadFromStorage();
    }

    // Subscribe to online status changes
    this.unsubscribeOnline = onlineManager.subscribe((isOnline) => {
      if (isOnline) {
        this.config.onOnline?.();
        this.processQueue();
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.unsubscribeOnline) {
      this.unsubscribeOnline();
      this.unsubscribeOnline = null;
    }
  }

  /**
   * Register a mutation executor
   *
   * @param mutationKey - Unique key for this mutation type
   * @param executor - Function to execute the mutation
   */
  registerMutation<TVariables, TResult>(
    mutationKey: string,
    executor: MutationExecutor<TVariables, TResult>
  ): void {
    mutationExecutors.set(
      mutationKey,
      executor as MutationExecutor<unknown, unknown>
    );
  }

  /**
   * Add a mutation to the queue
   *
   * @param mutationKey - Key of the registered mutation
   * @param variables - Mutation variables
   * @returns The queued mutation or null if queue is full
   */
  async enqueue<TVariables>(
    mutationKey: string,
    variables: TVariables
  ): Promise<QueuedMutation<TVariables> | null> {
    // Check if online - if so, don't queue
    if (onlineManager.isOnline()) {
      return null;
    }

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      console.warn('[OfflineQueue] Queue is full, mutation not queued');
      return null;
    }

    const mutation: QueuedMutation<TVariables> = {
      id: generateId(),
      mutationKey,
      variables,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(mutation as QueuedMutation);
    await this.persistToStorage();

    console.log(`[OfflineQueue] Queued mutation: ${mutationKey}`);
    return mutation;
  }

  /**
   * Get all queued mutations
   */
  getQueue(): QueuedMutation[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if there are pending mutations
   */
  hasPendingMutations(): boolean {
    return this.queue.some((m) => m.status === 'pending');
  }

  /**
   * Process the queue when online
   */
  async processQueue(): Promise<void> {
    if (!onlineManager.isOnline()) {
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process mutations in order
      while (this.queue.length > 0) {
        const mutation = this.queue[0];

        // Skip failed mutations
        if (mutation.status === 'failed') {
          this.queue.shift();
          continue;
        }

        // Get the executor
        const executor = mutationExecutors.get(mutation.mutationKey);
        if (!executor) {
          console.error(
            `[OfflineQueue] No executor for mutation: ${mutation.mutationKey}`
          );
          mutation.status = 'failed';
          this.queue.shift();
          continue;
        }

        // Update status
        mutation.status = 'retrying';
        await this.persistToStorage();

        try {
          await executor(mutation.variables);
          
          // Success - remove from queue
          this.queue.shift();
          await this.persistToStorage();
          
          console.log(`[OfflineQueue] Mutation succeeded: ${mutation.mutationKey}`);
          this.config.onMutationSuccess?.(mutation);
        } catch (error) {
          mutation.retryCount++;

          if (mutation.retryCount >= this.config.maxRetries) {
            // Max retries exceeded
            mutation.status = 'failed';
            this.queue.shift();
            await this.persistToStorage();
            
            console.error(
              `[OfflineQueue] Mutation failed after ${mutation.retryCount} retries: ${mutation.mutationKey}`
            );
            this.config.onMutationFailure?.(mutation, error as Error);
          } else {
            // Reset status for retry
            mutation.status = 'pending';
            await this.persistToStorage();
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, mutation.retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        // Check if still online
        if (!onlineManager.isOnline()) {
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistToStorage();
  }

  /**
   * Remove a specific mutation from the queue
   */
  async removeMutation(id: string): Promise<boolean> {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index === -1) {
      return false;
    }

    this.queue.splice(index, 1);
    await this.persistToStorage();
    return true;
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persistToStorage(): Promise<void> {
    if (!this.config.persistQueue) {
      return;
    }

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Reset any "retrying" mutations to "pending"
        for (const mutation of this.queue) {
          if (mutation.status === 'retrying') {
            mutation.status = 'pending';
          }
        }
      }
    } catch (error) {
      console.warn('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OfflineQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Singleton offline mutation queue instance
 */
export const offlineMutationQueue = new OfflineMutationQueue();

export default offlineMutationQueue;
