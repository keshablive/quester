import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { WebSocketService } from '@/lib/services/websocket-service';

type RealTimeContextValue = {
  status: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
};

const RealTimeContext = createContext<RealTimeContextValue | undefined>(undefined);

export const useRealTime = (): RealTimeContextValue => {
  const ctx = useContext(RealTimeContext);
  if (!ctx) throw new Error('useRealTime must be used within RealTimeProvider');
  return ctx;
};

type Props = {
  wsUrl: string;
  autoConnect?: boolean;
  children: React.ReactNode;
};

export const RealTimeProvider = ({ wsUrl, autoConnect = true, children }: Props) => {
  const [service] = useState(() => new WebSocketService(wsUrl));
  const [status, setStatus] = useState<string>('disconnected');

  useEffect(() => {
    // Update status when service changes
    const updateStatus = () => {
      setStatus(service.getStatus());
    };

    // Poll status or listen to internal events if available
    const interval = setInterval(updateStatus, 500);
    updateStatus();

    if (autoConnect) {
      void service.connect();
    }

    return () => {
      clearInterval(interval);
      service.disconnect();
    };
  }, [service, autoConnect]);

  const connect = useCallback(async () => {
    await service.connect();
    setStatus(service.getStatus());
  }, [service]);

  const disconnect = useCallback(() => {
    service.disconnect();
    setStatus(service.getStatus());
  }, [service]);

  const on = useCallback(
    (event: string, callback: (data: any) => void) => {
      service.on(event, callback);
    },
    [service]
  );

  const off = useCallback(
    (event: string, callback: (data: any) => void) => {
      service.off(event, callback);
    },
    [service]
  );

  const emit = useCallback(
    (event: string, data: any) => {
      service.emit(event, data);
    },
    [service]
  );

  /**
   * Subscribe helper that returns an unsubscribe function
   * Useful for useEffect cleanup
   *
   * Supported gamification events:
   * - 'xp_gain': { userId, amount, source, newXP, newLevel }
   * - 'level_up': { userId, level, unlockedFeatures }
   * - 'badge_earned': { userId, badgeId, badgeName, rarity }
   * - 'leaderboard_update': { userId, rank, xp, level }
   */
  const subscribe = useCallback(
    (event: string, callback: (data: any) => void) => {
      service.on(event, callback);
      return () => service.off(event, callback);
    },
    [service]
  );

  const value: RealTimeContextValue = {
    status,
    connect,
    disconnect,
    on,
    off,
    emit,
    subscribe,
  };

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>;
};

export default RealTimeContext;
