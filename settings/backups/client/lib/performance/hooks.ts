import { useEffect, useRef } from 'react';
import { telemetry } from './telemetry';

/**
 * Hook to measure component render/mount time
 * @param componentName - The name of the component being measured
 * @returns An object with the current duration (if available)
 */
export function usePerformanceTiming(componentName: string) {
  const timerName = useRef(`${componentName}-render`);

  useEffect(() => {
    telemetry.startTimer(timerName.current);

    return () => {
      const duration = telemetry.stopTimer(timerName.current);
      if (duration > 0) {
        console.debug(`${componentName} render time: ${duration}ms`);
      }
    };
  }, [componentName]);

  return {
    getDuration: () => telemetry.getMetric(timerName.current),
  };
}
