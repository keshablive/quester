import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { OfflineSyncService, OfflineOperation } from '@/lib/services/offline-sync-service';
import NetInfo from '@react-native-community/netinfo';

type OfflineContextValue = {
  queueLength: number;
  isOnline: boolean;
  queueOperation: (op: Omit<OfflineOperation, 'id' | 'createdAt'>) => Promise<OfflineOperation>;
  clearQueue: () => Promise<void>;
  flush: (processor: (op: OfflineOperation) => Promise<void>) => Promise<void>;
  peekQueue: () => Promise<OfflineOperation[]>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const useOffline = (): OfflineContextValue => {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
};

type Props = {
  children: React.ReactNode;
};

export const OfflineProvider = ({ children }: Props) => {
  const [service] = useState(() => new OfflineSyncService());
  const [queueLength, setQueueLength] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh queue length periodically
  useEffect(() => {
    const updateLength = async () => {
      const len = await service.getQueueLength();
      setQueueLength(len);
    };

    void updateLength();
    const interval = setInterval(updateLength, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [service]);

  const queueOperation = useCallback(
    async (op: Omit<OfflineOperation, 'id' | 'createdAt'>) => {
      const result = await service.queueOperation(op);
      setQueueLength(await service.getQueueLength());
      return result;
    },
    [service]
  );

  const clearQueue = useCallback(async () => {
    await service.clearQueue();
    setQueueLength(0);
  }, [service]);

  const flush = useCallback(
    async (processor: (op: OfflineOperation) => Promise<void>) => {
      await service.flush(processor);
      setQueueLength(await service.getQueueLength());
    },
    [service]
  );

  const peekQueue = useCallback(async () => {
    return service.peekQueue();
  }, [service]);

  const value: OfflineContextValue = {
    queueLength,
    isOnline,
    queueOperation,
    clearQueue,
    flush,
    peekQueue,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export default OfflineContext;
