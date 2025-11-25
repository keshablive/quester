/**
 * DebugMetricsPanel - Developer-friendly overlay showing real-time stream metrics
 *
 * Features:
 * - ABR algorithm metrics
 * - Buffer health monitoring
 * - Network statistics
 * - Quality switch history
 * - DVR window information
 * - S3 upload statistics
 * - Performance metrics
 * - Expandable/collapsible sections
 *
 * @example
 * <DebugMetricsPanel
 *   metrics={streamManager.getMetrics()}
 *   position="top-left"
 *   collapsed={false}
 * />
 */

import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { StreamMetrics, StreamState } from '@/lib/services/video-stream-manager';

export interface DebugMetricsPanelProps {
  // Metrics
  metrics: StreamMetrics;

  // Display options
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  initialCollapsed?: boolean;
  maxHeight?: number;

  // Callbacks
  onClose?: () => void;

  // Style
  style?: any;
}

export const DebugMetricsPanel: React.FC<DebugMetricsPanelProps> = ({
  metrics,
  position = 'top-left',
  initialCollapsed = false,
  maxHeight = 500,
  onClose,
  style,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['stream', 'network', 'buffer', 'abr'])
  );

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
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
        return { top: 16, left: 16 };
    }
  };

  // Format bandwidth
  const formatBandwidth = (bps: number): string => {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(2)} Mbps`;
    }
    return `${(bps / 1000).toFixed(0)} Kbps`;
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Get state color
  const getStateColor = (state: StreamState): string => {
    switch (state) {
      case StreamState.PLAYING:
        return '#22c55e';
      case StreamState.PAUSED:
        return '#eab308';
      case StreamState.BUFFERING:
        return '#f97316';
      case StreamState.ERROR:
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Render section header
  const renderSectionHeader = (title: string, section: string, valueCount: number) => {
    const isExpanded = expandedSections.has(section);

    return (
      <Pressable
        className="flex-row items-center justify-between border-b border-[#333] bg-[#1a1a1a] p-3"
        onPress={() => toggleSection(section)}
        accessibilityRole="button">
        <Text variant="small" className="font-bold text-white">
          {isExpanded ? '▼' : '▶'} {title}
        </Text>
        <Text className="rounded-full bg-[#333] px-2 py-0.5 text-[11px] text-gray-500">
          {valueCount}
        </Text>
      </Pressable>
    );
  };

  // Render metric row
  const renderMetric = (label: string, value: string, valueColor?: string) => (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 text-[11px] text-gray-500">{label}</Text>
      <Text
        className="font-mono text-[11px] font-bold text-white"
        style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
    </View>
  );

  // Collapsed view
  if (collapsed) {
    return (
      <Pressable
        onPress={() => setCollapsed(false)}
        accessibilityRole="button"
        accessibilityLabel="Expand debug metrics panel">
        <Text variant="small" className="font-bold text-white">
          📈 Debug
        </Text>
      </Pressable>
    );
  }

  // Full view
  return (
    <View
      className="absolute min-w-[300px] max-w-[400px] overflow-hidden rounded-lg border border-[#333] bg-black/95"
      style={[getPositionStyle(), { maxHeight }, style]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-[#333] p-3">
        <Text variant="small" className="font-bold text-white">
          📈 Debug Metrics
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            className="h-6 w-6 items-center justify-center rounded bg-[#333]"
            onPress={() => setCollapsed(true)}
            accessibilityRole="button"
            accessibilityLabel="Collapse panel">
            <Text variant="small" className="font-bold text-white">
              ─
            </Text>
          </Pressable>
          {onClose && (
            <Pressable
              className="h-6 w-6 items-center justify-center rounded bg-[#333]"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close panel">
              <Text variant="small" className="font-bold text-white">
                ✕
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={true}>
        {/* Stream Section */}
        {renderSectionHeader('Stream', 'stream', 3)}
        {expandedSections.has('stream') && (
          <View className="gap-2 p-3">
            {renderMetric('State', metrics.state, getStateColor(metrics.state))}
            {renderMetric('Quality', metrics.currentQuality?.label || 'Auto')}
            {renderMetric('Uptime', formatDuration(metrics.uptime))}
          </View>
        )}

        {/* Network Section */}
        {renderSectionHeader('Network', 'network', 3)}
        {expandedSections.has('network') && (
          <View className="gap-2 p-3">
            {renderMetric('Quality', metrics.networkQuality)}
            {renderMetric('Bandwidth', formatBandwidth(metrics.bandwidth))}
            {renderMetric('Latency', `${metrics.latency}ms`)}
          </View>
        )}

        {/* Buffer Section */}
        {renderSectionHeader('Buffer', 'buffer', 5)}
        {expandedSections.has('buffer') && (
          <View className="gap-2 p-3">
            {renderMetric('State', metrics.bufferState)}
            {renderMetric('Level', `${metrics.bufferLevel.toFixed(1)}s`)}
            {renderMetric('Download Rate', formatBandwidth(metrics.downloadRate))}
            {renderMetric('Playback Rate', formatBandwidth(metrics.playbackRate))}
            {renderMetric('Stalls', metrics.stallCount.toString())}
          </View>
        )}

        {/* ABR Section */}
        {renderSectionHeader('ABR', 'abr', 2)}
        {expandedSections.has('abr') && (
          <View className="gap-2 p-3">
            {renderMetric('Quality Switches', metrics.qualitySwitchCount.toString())}
            {renderMetric('Avg Quality', `${(metrics.averageQuality * 100).toFixed(0)}%`)}
          </View>
        )}

        {/* DVR Section */}
        {metrics.dvrSegmentCount > 0 && (
          <>
            {renderSectionHeader('DVR', 'dvr', 3)}
            {expandedSections.has('dvr') && (
              <View className="gap-2 p-3">
                {renderMetric('Window', formatDuration(metrics.dvrWindowDuration))}
                {renderMetric('Segments', metrics.dvrSegmentCount.toString())}
                {renderMetric('Storage', formatBytes(metrics.dvrStorageSize))}
              </View>
            )}
          </>
        )}

        {/* S3 Section */}
        {metrics.uploadCount > 0 && (
          <>
            {renderSectionHeader('S3 Storage', 's3', 3)}
            {expandedSections.has('s3') && (
              <View className="gap-2 p-3">
                {renderMetric('Uploads', metrics.uploadCount.toString())}
                {renderMetric('Failures', metrics.uploadFailureCount.toString())}
                {renderMetric('Retries', metrics.uploadRetryCount.toString())}
              </View>
            )}
          </>
        )}

        {/* Performance Section */}
        {renderSectionHeader('Performance', 'performance', 4)}
        {expandedSections.has('performance') && (
          <View className="gap-2 p-3">
            {renderMetric('Current Quality', metrics.currentQuality?.label || 'N/A')}
            {renderMetric('Target Bitrate', formatBandwidth(metrics.currentQuality?.bitrate || 0))}
            {renderMetric('Buffer Health', metrics.bufferState)}
            {renderMetric('Network Health', metrics.networkQuality)}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View className="items-center border-t border-[#333] p-2">
        <Text className="text-[10px] text-gray-600">
          Updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
};
