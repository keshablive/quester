import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineOperation = {
  id: string;
  type: string;
  payload?: any;
  createdAt: number;
};

const STORAGE_KEY = 'offline_sync_queue_v1';

export class OfflineSyncService {
  private queue: OfflineOperation[] = [];
  private initialized = false;

  constructor() {
    // start loading persisted queue asynchronously
    void this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw) as OfflineOperation[];
      } else {
        this.queue = [];
      }
    } catch (e) {
      // If storage read fails, start with empty queue
      this.queue = [];
    }
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      // Best-effort; swallow errors to avoid crashing app
    }
  }

  private ensureInitialized(): Promise<void> {
    if (this.initialized) return Promise.resolve();
    return this.loadFromStorage();
  }

  async queueOperation(op: Omit<OfflineOperation, 'id' | 'createdAt'>): Promise<OfflineOperation> {
    await this.ensureInitialized();
    const operation: OfflineOperation = {
      id: op.type + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      type: op.type,
      payload: op.payload,
      createdAt: Date.now(),
    };
    this.queue.push(operation);
    await this.persist();
    return operation;
  }

  async getQueueLength(): Promise<number> {
    await this.ensureInitialized();
    return this.queue.length;
  }

  async peekQueue(): Promise<OfflineOperation[]> {
    await this.ensureInitialized();
    return [...this.queue];
  }

  async clearQueue(): Promise<void> {
    await this.ensureInitialized();
    this.queue = [];
    await this.persist();
  }

  /**
   * Flush queue by applying processor to each operation in order.
   * Stops on first failure and preserves remaining items.
   */
  async flush(processor: (op: OfflineOperation) => Promise<void>): Promise<void> {
    await this.ensureInitialized();
    const items = [...this.queue];
    for (const op of items) {
      try {
        await processor(op);
        // remove successful op
        this.queue = this.queue.filter(q => q.id !== op.id);
        await this.persist();
      } catch (e) {
        // stop processing to preserve ordering
        throw e;
      }
    }
  }
}
