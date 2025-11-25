/**
 * DVRTimeline - Interactive timeline for DVR (Digital Video Recording) playback
 *
 * Features:
 * - Visual timeline showing recorded window
 * - Current playback position indicator
 * - Drag-to-seek functionality
 * - Live edge indicator
 * - Time labels with formatting
 * - Segment visualization
 *
 * @example
 * <DVRTimeline
 *   windowStart={Date.now() / 1000 - 7200} // 2 hours ago
 *   windowEnd={Date.now() / 1000}          // now
 *   currentPosition={Date.now() / 1000 - 600} // 10 minutes ago
 *   onSeek={(timestamp) => player.seek(timestamp)}
 * />
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, PanResponder, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';

export interface DVRTimelineProps {
  // DVR window (Unix timestamps in seconds)
  windowStart: number;
  windowEnd: number;
  currentPosition: number;

  // Callbacks
  onSeek?: (timestamp: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;

  // Styling
  height?: number;
  thumbSize?: number;
  showLabels?: boolean;
  showSegments?: boolean;
  segments?: DVRSegmentInfo[];

  // Style
  style?: any;
}

export interface DVRSegmentInfo {
  timestamp: number;
  duration: number;
  quality: string;
}

export const DVRTimeline: React.FC<DVRTimelineProps> = ({
  windowStart,
  windowEnd,
  currentPosition,
  onSeek,
  onSeekStart,
  onSeekEnd,
  height = 60,
  thumbSize = 20,
  showLabels = true,
  showSegments = false,
  segments = [],
  style,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState<number | null>(null);
  const timelineRef = useRef<View>(null);
  const timelineLayout = useRef<{ x: number; width: number } | null>(null);

  // Calculate dimensions
  const windowDuration = windowEnd - windowStart;

  // Convert timestamp to X position (0-1 scale)
  const timestampToPosition = useCallback(
    (timestamp: number): number => {
      if (windowDuration === 0) return 0;
      return Math.max(0, Math.min(1, (timestamp - windowStart) / windowDuration));
    },
    [windowStart, windowEnd, windowDuration]
  );

  // Convert X position to timestamp
  const positionToTimestamp = useCallback(
    (position: number): number => {
      return windowStart + position * windowDuration;
    },
    [windowStart, windowDuration]
  );

  // Format timestamp as HH:MM:SS
  const formatTimestamp = useCallback((timestamp: number): string => {
    const seconds = Math.floor(timestamp % 60);
    const minutes = Math.floor((timestamp / 60) % 60);
    const hours = Math.floor(timestamp / 3600);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Format relative time (e.g., "10m ago", "Live")
  const formatRelativeTime = useCallback(
    (timestamp: number): string => {
      const diff = windowEnd - timestamp;

      if (diff < 10) {
        return 'Live';
      }

      if (diff < 60) {
        return `${Math.floor(diff)}s ago`;
      }

      if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
      }

      return `${Math.floor(diff / 3600)}h ago`;
    },
    [windowEnd]
  );

  // Handle layout measurement
  const handleLayout = useCallback((_event: any) => {
    timelineRef.current?.measureInWindow((x, _y, width, _height) => {
      timelineLayout.current = { x, width };
    });
  }, []);

  // Create pan responder for drag-to-seek
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt, _gestureState) => {
        setIsSeeking(true);
        onSeekStart?.();

        // Calculate initial position
        if (timelineLayout.current) {
          const relativeX = evt.nativeEvent.pageX - timelineLayout.current.x;
          const position = relativeX / timelineLayout.current.width;
          const timestamp = positionToTimestamp(Math.max(0, Math.min(1, position)));
          setSeekPosition(timestamp);
        }
      },

      onPanResponderMove: (evt, _gestureState) => {
        if (timelineLayout.current) {
          const relativeX = evt.nativeEvent.pageX - timelineLayout.current.x;
          const position = relativeX / timelineLayout.current.width;
          const timestamp = positionToTimestamp(Math.max(0, Math.min(1, position)));
          setSeekPosition(timestamp);
        }
      },

      onPanResponderRelease: (_evt, _gestureState) => {
        if (seekPosition !== null) {
          onSeek?.(seekPosition);
        }
        setIsSeeking(false);
        setSeekPosition(null);
        onSeekEnd?.();
      },
    })
  ).current;

  // Calculate current thumb position
  const displayPosition = isSeeking && seekPosition !== null ? seekPosition : currentPosition;
  const thumbPosition = timestampToPosition(displayPosition);

  // Calculate if we're at live edge (within 10 seconds)
  const isAtLiveEdge = windowEnd - displayPosition < 10;

  // Get quality color
  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case '1080p':
        return '#3b82f6'; // blue
      case '720p':
        return '#22c55e'; // green
      case '480p':
        return '#eab308'; // yellow
      case '360p':
        return '#f97316'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <View
      testID="dvr-timeline"
      className="py-2"
      style={style}
      onLayout={handleLayout}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel="DVR timeline"
      accessibilityHint="Drag the timeline to seek to a different time position">
      {/* Time labels */}
      {showLabels && (
        <View testID="time-labels" className="mb-2 flex-row items-center justify-between px-3">
          <Text
            variant="small"
            testID="start-time-label"
            className="font-medium text-gray-600"
            accessibilityRole="text">
            {formatTimestamp(windowStart)}
          </Text>
          <Text
            variant="small"
            testID="current-time-label"
            className="font-bold text-gray-900"
            accessibilityRole="text">
            {isSeeking && seekPosition !== null
              ? formatRelativeTime(seekPosition)
              : formatRelativeTime(displayPosition)}
          </Text>
          <Text
            variant="small"
            testID="live-label"
            className="font-medium text-gray-600"
            accessibilityRole="text">
            Live
          </Text>
        </View>
      )}

      {/* Timeline track */}
      <View
        ref={timelineRef}
        testID="timeline-track"
        className="relative mx-3 overflow-hidden rounded-full bg-gray-200"
        style={{ height }}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel="Timeline track"
        accessibilityHint="Drag to seek through recorded content"
        {...panResponder.panHandlers}>
        {/* Background */}
        <View testID="track-background" className="absolute inset-0 bg-gray-200" />

        {/* Segments visualization */}
        {showSegments &&
          segments.map((segment, index) => {
            const segmentStart = timestampToPosition(segment.timestamp);
            const segmentEnd = timestampToPosition(segment.timestamp + segment.duration);
            const segmentWidth = (segmentEnd - segmentStart) * 100;

            return (
              <View
                key={index}
                testID={`segment-${index}`}
                className="absolute h-full"
                style={{
                  left: `${segmentStart * 100}%`,
                  width: `${segmentWidth}%`,
                  backgroundColor: getQualityColor(segment.quality),
                }}
              />
            );
          })}

        {/* Buffered/Played region */}
        <View
          testID="played-track"
          className="absolute left-0 h-full bg-blue-500"
          style={{ width: `${thumbPosition * 100}%` }}
        />

        {/* Live edge indicator */}
        <Pressable
          testID="live-edge"
          className="absolute bottom-0 right-0 top-0 w-1 items-center justify-center"
          onPress={() => onSeek?.(windowEnd)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Jump to live"
          accessibilityHint="Double tap to seek to live position">
          <View className="h-full w-0.5 bg-red-500" />
          <View className="absolute h-2 w-2 rounded-full bg-red-500" />
        </Pressable>

        {/* Thumb (current position) */}
        <View
          testID="playhead"
          accessible={true}
          accessibilityLabel={`Playhead at ${formatRelativeTime(displayPosition)}`}
          accessibilityRole="adjustable"
          accessibilityState={{ disabled: isSeeking }}
          className="absolute top-1/2 border-white shadow-lg"
          style={{
            left: `${thumbPosition * 100}%`,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            marginLeft: -thumbSize / 2,
            marginTop: -thumbSize / 2,
            backgroundColor: isAtLiveEdge ? '#ef4444' : '#3b82f6',
            borderWidth: isSeeking ? 3 : 2,
          }}>
          {isSeeking && (
            <View
              testID="seek-tooltip"
              className="absolute bottom-[30px] left-1/2 min-w-[80px] -translate-x-1/2 items-center rounded bg-black/90 px-3 py-1.5">
              <Text variant="small" className="font-bold text-white">
                {formatRelativeTime(seekPosition || displayPosition)}
              </Text>
            </View>
          )}
        </View>

        {/* Seek indicator line */}
        {isSeeking && (
          <View
            testID="seek-line"
            className="absolute bottom-0 top-0 w-0.5 bg-blue-500 opacity-50"
            style={{ left: `${thumbPosition * 100}%` }}
          />
        )}
      </View>

      {/* Info text */}
      <View className="mt-2 flex-row items-center justify-between px-3">
        <Text variant="small" className="font-medium text-gray-600">
          {isAtLiveEdge ? '🔴 LIVE' : `⏸ Paused (${formatRelativeTime(displayPosition)})`}
        </Text>
        <Text variant="small" className="font-medium text-gray-600">
          Window: {formatTimestamp(windowDuration)}
        </Text>
      </View>
    </View>
  );
};
