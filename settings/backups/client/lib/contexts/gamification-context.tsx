import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GamificationService, GamificationMetrics } from '@/lib/services/gamification-service';

type GamificationContextValue = {
  metrics: GamificationMetrics | null;
  incrementPoints: (points: number) => Promise<void>;
  awardBadge: (badgeId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export const useGamification = (): GamificationContextValue => {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
};

type Props = {
  userId: string;
  children: React.ReactNode;
};

export const GamificationProvider = ({ userId, children }: Props) => {
  const svc = new GamificationService();
  const [metrics, setMetrics] = useState<GamificationMetrics | null>(null);

  const refresh = useCallback(async () => {
    const m = await svc.getMetrics(userId);
    setMetrics(m);
  }, [svc, userId]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const incrementPoints = useCallback(
    async (points: number) => {
      await svc.incrementPoints(userId, points);
      await refresh();
    },
    [svc, userId, refresh]
  );

  const awardBadge = useCallback(
    async (badgeId: string) => {
      await svc.awardBadge(userId, badgeId);
      await refresh();
    },
    [svc, userId, refresh]
  );

  const value: GamificationContextValue = {
    metrics,
    incrementPoints,
    awardBadge,
    refresh,
  };

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
};

export default GamificationContext;
