import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Gauge, AlertCircle, type LucideIcon } from 'lucide-react-native';

interface LatencyIndicatorProps {
  /** Current latency in milliseconds */
  latency: number;
  /** Whether to show the indicator (default: show when >2s) */
  visible?: boolean;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom threshold for showing indicator (default: 2000ms) */
  threshold?: number;
  /** Whether to show the numeric latency value */
  showNumeric?: boolean;
}

/**
 * Latency Indicator Component
 *
 * Displays a visual indicator when stream latency exceeds threshold (default 2s).
 * Color coding:
 * - <1s: Green (excellent)
 * - 1-2s: Yellow (good)
 * - >2s: Red (poor) - badge shows
 *
 * @example
 * ```tsx
 * <LatencyIndicator latency={2500} position="top-right" />
 * ```
 */
export const LatencyIndicator: React.FC<LatencyIndicatorProps> = ({
  latency,
  visible,
  position = 'top-right',
  threshold = 2000,
  showNumeric = true,
}) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [latencyLevel, setLatencyLevel] = useState<'excellent' | 'good' | 'poor'>('excellent');

  useEffect(() => {
    // Determine if indicator should be visible
    const isVisible = visible !== undefined ? visible : latency > threshold;
    setShouldShow(isVisible);

    // Determine latency level
    if (latency < 1000) {
      setLatencyLevel('excellent');
    } else if (latency < 2000) {
      setLatencyLevel('good');
    } else {
      setLatencyLevel('poor');
    }
  }, [latency, visible, threshold]);

  if (!shouldShow) {
    return null;
  }

  const getColor = () => {
    switch (latencyLevel) {
      case 'excellent':
        return '#10b981'; // Green
      case 'good':
        return '#f59e0b'; // Yellow/Orange
      case 'poor':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getIcon = (): LucideIcon => {
    // All latency levels use Gauge icon (Lucide equivalent of speedometer)
    return Gauge;
  };

  const getLabel = () => {
    switch (latencyLevel) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'poor':
        return 'High Latency';
      default:
        return 'Unknown';
    }
  };

  const formatLatency = (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  return (
    <View
      className={`absolute flex-row items-center gap-1.5 rounded-lg px-2 py-1.5 shadow-md ${positionClasses}`}
      style={{ backgroundColor: `${getColor()}20` }}>
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: getColor() }}>
        {(() => {
          const Icon = getIcon();
          return <Icon size={16} color="white" />;
        })()}
      </View>

      <View className="flex-col">
        <Text className="text-[11px] font-semibold" style={{ color: getColor() }}>
          {getLabel()}
        </Text>
        {showNumeric && (
          <Text className="text-[10px] font-medium" style={{ color: getColor() }}>
            {formatLatency(latency)}
          </Text>
        )}
      </View>

      {latencyLevel === 'poor' && <AlertCircle size={16} color={getColor()} className="ml-1" />}
    </View>
  );
};

/**
 * Simple Latency Badge (minimal version)
 *
 * Shows only when latency is poor (>2s) as a small badge
 */
export const LatencyBadge: React.FC<{ latency: number }> = ({ latency }) => {
  if (latency < 2000) {
    return null;
  }

  const formatLatency = (ms: number): string => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-xl bg-red-500 px-2 py-1">
      <Gauge size={12} color="white" />
      <Text className="text-[11px] font-semibold text-white">{formatLatency(latency)}</Text>
    </View>
  );
};

/**
 * Hook to calculate client-side latency estimation
 *
 * Estimates latency based on:
 * - Time between video segments
 * - Buffer health
 * - Network quality
 *
 * @example
 * ```tsx
 * const latency = useLatencyEstimation(videoRef, bufferHealth);
 * ```
 */
export const useLatencyEstimation = (
  currentTime: number,
  bufferEnd: number,
  segmentDuration: number = 6
): number => {
  const [estimatedLatency, setEstimatedLatency] = useState(0);

  useEffect(() => {
    // Estimate latency based on buffer ahead
    // More buffer = higher latency but smoother playback
    const bufferAhead = bufferEnd - currentTime;

    // If we have minimal buffer, latency is close to segment duration
    // If we have lots of buffer, latency increases
    const latencyMs = Math.max(
      segmentDuration * 1000, // Minimum latency = segment duration
      bufferAhead * 1000 // Current buffer ahead
    );

    setEstimatedLatency(latencyMs);
  }, [currentTime, bufferEnd, segmentDuration]);

  return estimatedLatency;
};

/**
 * Detailed Latency Stats Component
 *
 * Shows comprehensive latency information for debugging
 */
export const LatencyStats: React.FC<{
  latency: number;
  bufferHealth: number;
  networkQuality: 'excellent' | 'good' | 'poor';
  droppedFrames: number;
}> = ({ latency, bufferHealth, networkQuality, droppedFrames }) => {
  const getNetworkColor = () => {
    switch (networkQuality) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <View className="gap-2 rounded-lg bg-black/70 p-3">
      <Text variant="small" className="mb-1 font-semibold text-white">
        Streaming Stats
      </Text>

      <View className="flex-row items-center justify-between">
        <Text variant="small" className="text-gray-300">
          Latency:
        </Text>
        <Text
          variant="small"
          className="font-semibold"
          style={{
            color: latency > 2000 ? '#ef4444' : latency > 1000 ? '#f59e0b' : '#10b981',
          }}>
          {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="small" className="text-gray-300">
          Buffer:
        </Text>
        <Text
          variant="small"
          className="font-semibold"
          style={{
            color: bufferHealth > 70 ? '#10b981' : bufferHealth > 30 ? '#f59e0b' : '#ef4444',
          }}>
          {bufferHealth.toFixed(0)}%
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="small" className="text-gray-300">
          Network:
        </Text>
        <Text variant="small" className="font-semibold" style={{ color: getNetworkColor() }}>
          {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
        </Text>
      </View>

      {droppedFrames > 0 && (
        <View className="flex-row items-center justify-between">
          <Text variant="small" className="text-gray-300">
            Dropped Frames:
          </Text>
          <Text variant="small" className="font-semibold text-red-500">
            {droppedFrames}
          </Text>
        </View>
      )}
    </View>
  );
};

export default LatencyIndicator;
