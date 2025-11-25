import { OfflineSyncService } from '@/lib/services/offline-sync-service';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(async () => {
    service = new OfflineSyncService();
    // ensure a clean start
    await service.clearQueue();
  });

  afterEach(async () => {
    await service.clearQueue();
  });

  it('initially has an empty queue', async () => {
    const len = await service.getQueueLength();
    expect(len).toBe(0);
  });

  it('queues an operation and reports correct length', async () => {
    await service.queueOperation({ type: 'test-op', payload: { value: 1 } });
    const len = await service.getQueueLength();
    expect(len).toBe(1);
    const items = await service.peekQueue();
    expect(items[0].type).toBe('test-op');
    expect(items[0].payload).toEqual({ value: 1 });
  });

  it('clears the queue', async () => {
    await service.queueOperation({ type: 'to-clear', payload: {} });
    expect(await service.getQueueLength()).toBe(1);
    await service.clearQueue();
    expect(await service.getQueueLength()).toBe(0);
  });

  it('flushes queued operations using a processor', async () => {
    const processed: string[] = [];
    await service.queueOperation({ type: 'p1', payload: { n: 1 } });
    await service.queueOperation({ type: 'p2', payload: { n: 2 } });

    await service.flush(async (op) => {
      // simulate async work
      processed.push(op.type);
      return Promise.resolve();
    });

    expect(processed).toEqual(['p1', 'p2']);
    expect(await service.getQueueLength()).toBe(0);
  });

  it('stops flush on processor failure and preserves remaining items', async () => {
    await service.queueOperation({ type: 'ok', payload: {} });
    await service.queueOperation({ type: 'fail', payload: {} });
    await service.queueOperation({ type: 'after', payload: {} });

    const processor = jest.fn(async (op: any) => {
      if (op.type === 'fail') throw new Error('processor failure');
      return Promise.resolve();
    });

    await expect(service.flush(processor)).rejects.toThrow('processor failure');

    // 'after' should remain in the queue because flush stops on error
    const remaining = await service.peekQueue();
    expect(remaining.some(r => r.type === 'after')).toBe(true);
  });
});
