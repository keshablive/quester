/**
 * OfflineQueue Service Tests
 * Phase 8, T128: Tests for offline action queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineQueue, QueuedAction } from '@/lib/services/offline-queue';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

describe('OfflineQueue Service', () => {
  let queue: OfflineQueue;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    
    queue = new OfflineQueue();
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.clear();
  });

  describe('Initialization', () => {
    it('should initialize with empty queue', async () => {
      const actions = await queue.getAll();
      expect(actions).toEqual([]);
    });

    it('should load existing queue from storage', async () => {
      const existingActions: QueuedAction[] = [
        {
          id: '1',
          type: 'like',
          payload: { contentId: '123' },
          timestamp: Date.now(),
          retries: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingActions)
      );

      const newQueue = new OfflineQueue();
      await newQueue.initialize();

      const actions = await newQueue.getAll();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('like');
    });

    it('should handle corrupted storage gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const newQueue = new OfflineQueue();
      await newQueue.initialize();

      const actions = await newQueue.getAll();
      expect(actions).toEqual([]);
    });
  });

  describe('Adding Actions', () => {
    it('should add action to queue', async () => {
      await queue.add({
        type: 'like',
        payload: { contentId: '123' },
      });

      const actions = await queue.getAll();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('like');
      expect(actions[0].id).toBeDefined();
      expect(actions[0].timestamp).toBeDefined();
    });

    it('should generate unique IDs for actions', async () => {
      await queue.add({ type: 'like', payload: { contentId: '1' } });
      await queue.add({ type: 'comment', payload: { contentId: '2' } });

      const actions = await queue.getAll();
      expect(actions[0].id).not.toBe(actions[1].id);
    });

    it('should persist queue to storage', async () => {
      await queue.add({ type: 'like', payload: { contentId: '123' } });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.any(String)
      );
    });

    it('should maintain FIFO order', async () => {
      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });
      await queue.add({ type: 'action3', payload: {} });

      const actions = await queue.getAll();
      expect(actions[0].type).toBe('action1');
      expect(actions[1].type).toBe('action2');
      expect(actions[2].type).toBe('action3');
    });

    it('should initialize retry count to 0', async () => {
      await queue.add({ type: 'like', payload: {} });

      const actions = await queue.getAll();
      expect(actions[0].retries).toBe(0);
    });
  });

  describe('Removing Actions', () => {
    it('should remove action by ID', async () => {
      await queue.add({ type: 'like', payload: { contentId: '123' } });
      const actions = await queue.getAll();
      const actionId = actions[0].id;

      await queue.remove(actionId);

      const remainingActions = await queue.getAll();
      expect(remainingActions).toHaveLength(0);
    });

    it('should not throw when removing non-existent action', async () => {
      await expect(queue.remove('non-existent-id')).resolves.not.toThrow();
    });

    it('should persist after removal', async () => {
      await queue.add({ type: 'like', payload: {} });
      const actions = await queue.getAll();
      
      await queue.remove(actions[0].id);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2); // Once for add, once for remove
    });
  });

  describe('Getting Actions', () => {
    it('should return all actions', async () => {
      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });

      const actions = await queue.getAll();
      expect(actions).toHaveLength(2);
    });

    it('should return action by ID', async () => {
      await queue.add({ type: 'like', payload: { contentId: '123' } });
      const actions = await queue.getAll();
      const actionId = actions[0].id;

      const action = await queue.getById(actionId);
      expect(action).toBeDefined();
      expect(action?.type).toBe('like');
    });

    it('should return null for non-existent ID', async () => {
      const action = await queue.getById('non-existent');
      expect(action).toBeNull();
    });

    it('should return queue count', async () => {
      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });

      const count = await queue.count();
      expect(count).toBe(2);
    });
  });

  describe('Clearing Queue', () => {
    it('should clear all actions', async () => {
      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });

      await queue.clear();

      const actions = await queue.getAll();
      expect(actions).toHaveLength(0);
    });

    it('should persist empty queue to storage', async () => {
      await queue.add({ type: 'action1', payload: {} });
      await queue.clear();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([])
      );
    });
  });

  describe('Retry Management', () => {
    it('should increment retry count', async () => {
      await queue.add({ type: 'like', payload: {} });
      const actions = await queue.getAll();
      const actionId = actions[0].id;

      await queue.incrementRetry(actionId);

      const action = await queue.getById(actionId);
      expect(action?.retries).toBe(1);
    });

    it('should handle multiple retry increments', async () => {
      await queue.add({ type: 'like', payload: {} });
      const actions = await queue.getAll();
      const actionId = actions[0].id;

      await queue.incrementRetry(actionId);
      await queue.incrementRetry(actionId);
      await queue.incrementRetry(actionId);

      const action = await queue.getById(actionId);
      expect(action?.retries).toBe(3);
    });

    it('should not throw when incrementing non-existent action', async () => {
      await expect(queue.incrementRetry('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Processing Queue', () => {
    it('should process all actions in order', async () => {
      const processedActions: string[] = [];
      const processor = jest.fn((action: QueuedAction) => {
        processedActions.push(action.type);
        return Promise.resolve();
      });

      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });
      await queue.add({ type: 'action3', payload: {} });

      await queue.processAll(processor);

      expect(processedActions).toEqual(['action1', 'action2', 'action3']);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should remove successfully processed actions', async () => {
      const processor = jest.fn(() => Promise.resolve());

      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });

      await queue.processAll(processor);

      const actions = await queue.getAll();
      expect(actions).toHaveLength(0);
    });

    it('should keep failed actions in queue', async () => {
      const processor = jest.fn(() => Promise.reject(new Error('Failed')));

      await queue.add({ type: 'action1', payload: {} });

      await queue.processAll(processor);

      const actions = await queue.getAll();
      expect(actions).toHaveLength(1);
    });

    it('should increment retry count on failure', async () => {
      const processor = jest.fn(() => Promise.reject(new Error('Failed')));

      await queue.add({ type: 'action1', payload: {} });
      const initialActions = await queue.getAll();
      const actionId = initialActions[0].id;

      await queue.processAll(processor);

      const action = await queue.getById(actionId);
      expect(action?.retries).toBe(1);
    });

    it('should remove actions after max retries', async () => {
      const processor = jest.fn(() => Promise.reject(new Error('Failed')));

      await queue.add({ type: 'action1', payload: {} });

      // Process multiple times to exceed max retries
      await queue.processAll(processor, { maxRetries: 3 });
      await queue.processAll(processor, { maxRetries: 3 });
      await queue.processAll(processor, { maxRetries: 3 });
      await queue.processAll(processor, { maxRetries: 3 });

      const actions = await queue.getAll();
      expect(actions).toHaveLength(0);
    });

    it('should continue processing after single failure', async () => {
      let callCount = 0;
      const processor = jest.fn((action: QueuedAction) => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve();
      });

      await queue.add({ type: 'action1', payload: {} });
      await queue.add({ type: 'action2', payload: {} });
      await queue.add({ type: 'action3', payload: {} });

      await queue.processAll(processor);

      const actions = await queue.getAll();
      expect(actions).toHaveLength(1); // Only action2 should remain
      expect(actions[0].type).toBe('action2');
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners when action is added', async () => {
      const listener = jest.fn();
      queue.on('added', listener);

      await queue.add({ type: 'like', payload: {} });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'like' })
      );
    });

    it('should notify listeners when action is removed', async () => {
      const listener = jest.fn();
      queue.on('removed', listener);

      await queue.add({ type: 'like', payload: {} });
      const actions = await queue.getAll();
      await queue.remove(actions[0].id);

      expect(listener).toHaveBeenCalledWith(actions[0].id);
    });

    it('should notify listeners when queue is cleared', async () => {
      const listener = jest.fn();
      queue.on('cleared', listener);

      await queue.add({ type: 'action1', payload: {} });
      await queue.clear();

      expect(listener).toHaveBeenCalled();
    });

    it('should allow removing listeners', async () => {
      const listener = jest.fn();
      queue.on('added', listener);
      queue.off('added', listener);

      await queue.add({ type: 'like', payload: {} });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
