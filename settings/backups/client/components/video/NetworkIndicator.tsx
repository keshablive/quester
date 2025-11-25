/**
 * NetworkIndicator - Visual indicator for current network quality
 *
 * Features:
 * - Color-coded quality badge (Excellent/Good/Fair/Poor)
 * - Real-time bandwidth display
 * - Latency indicator
 * - Signal strength animation
 * - Expandable details panel
 *
 * @example
 * <NetworkIndicator
 *   quality={NetworkQuality.GOOD}
 *   bandwidth={3.5 * 1000000} // 3.5 Mbps
 *   latency={45} // ms
 *   showDetails={true}
 * />
 */

import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { NetworkQuality } from '@/lib/services/bandwidth-monitor';

export interface NetworkIndicatorProps {
  // Network metrics
  quality: NetworkQuality;
  bandwidth: number; // bits per second
  latency?: number; // milliseconds

  // Display options
  showBandwidth?: boolean;
  showLatency?: boolean;
  showDetails?: boolean;
  compact?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  // Callbacks
  onPress?: () => void;
  onExpand?: (expanded: boolean) => void;

  // Style
  style?: any;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  quality,
  bandwidth,
  latency,
  showBandwidth = true,
  showLatency = true,
  showDetails = false,
  compact = false,
  position = 'top-right',
  onPress,
  onExpand,
  style,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Get quality configuration
  const getQualityConfig = (): {
    color: string;
    label: string;
    icon: string;
    description: string;
  } => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return {
          color: '#22c55e',
          label: 'Excellent',
          icon: '📶',
          description: 'Perfect for highest quality streaming',
        };
      case NetworkQuality.GOOD:
        return {
          color: '#84cc16',
          label: 'Good',
          icon: '📶',
          description: 'Suitable for HD streaming',
        };
      case NetworkQuality.FAIR:
        return {
          color: '#eab308',
          label: 'Fair',
          icon: '📶',
          description: 'May experience quality adjustments',
        };
      case NetworkQuality.POOR:
        return {
          color: '#ef4444',
          label: 'Poor',
          icon: '📶',
          description: 'Buffering may occur',
        };
      default:
        return {
          color: '#6b7280',
          label: 'Unknown',
          icon: '📶',
          description: 'Network quality unknown',
        };
    }
  };

  const config = getQualityConfig();

  // Format bandwidth
  const formatBandwidth = (bps: number): string => {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`;
    }
    return `${(bps / 1000).toFixed(0)} Kbps`;
  };

  // Get signal strength (1-4 bars)
  const getSignalStrength = (): number => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return 4;
      case NetworkQuality.GOOD:
        return 3;
      case NetworkQuality.FAIR:
        return 2;
      case NetworkQuality.POOR:
        return 1;
      default:
        return 0;
    }
  };

  // Get latency status
  const getLatencyStatus = (): { color: string; label: string } => {
    if (!latency) return { color: '#6b7280', label: 'N/A' };

    if (latency < 30) {
      return { color: '#22c55e', label: 'Low' };
    } else if (latency < 80) {
      return { color: '#84cc16', label: 'Normal' };
    } else if (latency < 150) {
      return { color: '#eab308', label: 'High' };
    } else {
      return { color: '#ef4444', label: 'Very High' };
    }
  };

  const latencyStatus = getLatencyStatus();
  const signalStrength = getSignalStrength();

  // Handle press
  const handlePress = () => {
    if (showDetails) {
      const newExpanded = !expanded;
      setExpanded(newExpanded);
      onExpand?.(newExpanded);
    }
    onPress?.();
  };

  // Get position styles
  const getPositionStyle = (): any => {
    switch (position) {
      case 'top-left':
        return { top: 16, left: 16 };
      case 'top-right':
        return { top: 16, right: 16 };
      case 'bottom-left':
        return { bottom: 16, left: 16 };
      case 'bottom-right':
        return { bottom: 16, right: 16 };
      default:
        return { top: 16, right: 16 };
    }
  };

  // Render compact view
  if (compact) {
    return (
      <Pressable
        testID="network-indicator"
        className="absolute h-10 w-10 items-center justify-center rounded-full shadow-md"
        style={[{ backgroundColor: config.color }, getPositionStyle(), style]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Network quality: ${config.label}. Bandwidth: ${formatBandwidth(bandwidth)}`}
        accessibilityHint="Tap to toggle network details">
        <Text className="text-xl">{config.icon}</Text>
      </Pressable>
    );
  }

  // Render full view
  return (
    <Pressable
      testID="network-indicator"
      className="absolute"
      style={[getPositionStyle(), style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Network quality: ${config.label}. Bandwidth: ${formatBandwidth(bandwidth)}${latency ? `, Latency: ${latency}ms` : ''}`}
      accessibilityHint={
        showDetails ? 'Tap to toggle network details' : 'Network quality indicator'
      }
      accessibilityState={{ expanded: showDetails ? expanded : undefined }}>
      {/* Main badge */}
      <View
        testID="quality-badge"
        className="flex-row items-center gap-2 rounded-md px-3 py-1.5 shadow-md"
        style={{ backgroundColor: config.color }}>
        {/* Signal bars */}
        <View testID="signal-bars" className="h-3.5 flex-row items-end gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              testID={`signal-bar-${bar}`}
              className="w-0.75 rounded-sm bg-white"
              style={{
                height: bar * 3 + 2,
                opacity: bar <= signalStrength ? 1 : 0.3,
              }}
            />
          ))}
        </View>

        {/* Quality label */}
        <Text variant="small" testID="quality-label" className="font-bold text-white">
          {config.label}
        </Text>
      </View>

      {/* Metrics */}
      {(showBandwidth || showLatency) && (
        <View testID="metrics-container" className="mt-1 flex-row gap-3 px-3">
          {showBandwidth && (
            <View testID="bandwidth-metric" className="items-start">
              <Text className="mb-0.5 text-[10px] text-gray-400">Speed</Text>
              <Text testID="bandwidth-value" className="text-[11px] font-bold text-white">
                {formatBandwidth(bandwidth)}
              </Text>
            </View>
          )}

          {showLatency && latency !== undefined && (
            <View testID="latency-metric" className="items-start">
              <Text className="mb-0.5 text-[10px] text-gray-400">Latency</Text>
              <Text
                testID="latency-value"
                className="text-[11px] font-bold"
                style={{ color: latencyStatus.color }}>
                {latency}ms
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Details panel (expandable) */}
      {showDetails && expanded && (
        <View testID="details-panel" className="mt-2 min-w-[200px] rounded-lg bg-black/90 p-3">
          <Text testID="quality-description" className="mb-3 text-[11px] leading-4 text-gray-400">
            {config.description}
          </Text>

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-[11px] text-gray-400">Quality:</Text>
            <Text className="text-[11px] font-bold" style={{ color: config.color }}>
              {config.label}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-[11px] text-gray-400">Bandwidth:</Text>
            <Text className="text-[11px] font-bold text-white">{formatBandwidth(bandwidth)}</Text>
          </View>

          {latency !== undefined && (
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-[11px] text-gray-400">Latency:</Text>
              <Text className="text-[11px] font-bold" style={{ color: latencyStatus.color }}>
                {latency}ms ({latencyStatus.label})
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between py-1">
            <Text className="text-[11px] text-gray-400">Signal:</Text>
            <Text className="text-[11px] font-bold text-white">{signalStrength}/4 bars</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
};
