/**
 * ABRVideoPlayer - React Native video player with adaptive bitrate streaming
 *
 * Features:
 * - Automatic quality adjustment based on network conditions
 * - Manual quality selection
 * - Buffer level monitoring
 * - Network quality indicator
 * - DVR timeline integration
 * - Debug metrics overlay
 *
 * @example
 * <ABRVideoPlayer
 *   hlsUrl="https://example.com/stream/master.m3u8"
 *   enableABR={true}
 *   enableDVR={true}
 *   showControls={true}
 *   onQualityChange={(quality) => console.log('New quality:', quality)}
 * />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  VideoStreamManager,
  StreamState,
  StreamEvent,
  StreamMetrics,
  QualityLevel,
} from '@/lib/services/video-stream-manager';
import { SwitchingAlgorithm } from '@/lib/services/quality-switcher';
import { NetworkQuality } from '@/lib/services/bandwidth-monitor';
import { BufferState } from '@/lib/services/buffer-manager';

export interface ABRVideoPlayerProps {
  // Stream source
  hlsUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;

  // Features
  enableABR?: boolean;
  enableDVR?: boolean;
  enableS3Upload?: boolean;
  abrAlgorithm?: SwitchingAlgorithm;

  // UI
  showControls?: boolean;
  showQualitySelector?: boolean;
  showNetworkIndicator?: boolean;
  showBufferIndicator?: boolean;
  showDebugMetrics?: boolean;

  // Callbacks
  onReady?: (qualities: QualityLevel[]) => void;
  onQualityChange?: (quality: QualityLevel) => void;
  onBufferChange?: (state: BufferState, level: number) => void;
  onNetworkChange?: (quality: NetworkQuality, bandwidth: number) => void;
  onError?: (error: Error) => void;

  // Style
  style?: any;
}

export const ABRVideoPlayer: React.FC<ABRVideoPlayerProps> = ({
  hlsUrl,
  rtmpUrl,
  streamKey,
  enableABR = true,
  enableDVR = true,
  enableS3Upload = false,
  abrAlgorithm = SwitchingAlgorithm.HYBRID,
  showControls = true,
  showQualitySelector = true,
  showNetworkIndicator = true,
  showBufferIndicator = true,
  showDebugMetrics = false,
  onReady,
  onQualityChange,
  onBufferChange,
  onNetworkChange,
  onError,
  style,
}) => {
  const streamManager = useRef<VideoStreamManager | null>(null);

  // State
  const [streamState, setStreamState] = useState<StreamState>(StreamState.IDLE);
  const [currentQuality, setCurrentQuality] = useState<QualityLevel | null>(null);
  const [availableQualities, setAvailableQualities] = useState<QualityLevel[]>([]);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(NetworkQuality.FAIR);
  const [bufferState, setBufferState] = useState<BufferState>(BufferState.HEALTHY);
  const [bufferLevel, setBufferLevel] = useState<number>(0);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize stream manager
  useEffect(() => {
    const initializeStream = async () => {
      try {
        const manager = new VideoStreamManager({
          hlsUrl,
          rtmpUrl,
          streamKey,
          enableABR,
          enableDVR,
          enableS3Upload,
          abrAlgorithm,
        });

        // Set up event listeners
        manager.on(StreamEvent.STATE_CHANGE, (state) => {
          setStreamState(state);
        });

        manager.on(StreamEvent.READY, ({ qualities }) => {
          setAvailableQualities(qualities);
          onReady?.(qualities);
        });

        manager.on(StreamEvent.QUALITY_CHANGE, ({ to, reason }) => {
          setCurrentQuality(to);
          onQualityChange?.(to);
          console.log(`Quality changed to ${to.label}: ${reason}`);
        });

        manager.on(StreamEvent.BUFFER_CHANGE, ({ state, level }) => {
          setBufferState(state);
          setBufferLevel(level);
          onBufferChange?.(state, level);
        });

        manager.on(StreamEvent.NETWORK_CHANGE, ({ quality, bandwidth }) => {
          setNetworkQuality(quality);
          onNetworkChange?.(quality, bandwidth);
        });

        manager.on(StreamEvent.METRICS, (metricsData) => {
          setMetrics(metricsData);
        });

        manager.on(StreamEvent.ERROR, (err) => {
          setError(err.message);
          onError?.(err);
        });

        streamManager.current = manager;

        // Initialize and start
        await manager.initialize();
        await manager.start();
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        onError?.(error);
      }
    };

    initializeStream();

    // Cleanup
    return () => {
      if (streamManager.current) {
        streamManager.current.destroy();
        streamManager.current = null;
      }
    };
  }, [hlsUrl, rtmpUrl, streamKey, enableABR, enableDVR, enableS3Upload, abrAlgorithm]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!streamManager.current) return;

    if (streamState === StreamState.PLAYING) {
      streamManager.current.pause();
    } else if (streamState === StreamState.PAUSED) {
      streamManager.current.resume();
    }
  }, [streamState]);

  // Handle quality selection
  const handleQualitySelect = useCallback((quality: QualityLevel) => {
    if (!streamManager.current) return;

    try {
      streamManager.current.setQuality(quality);
      setShowQualityMenu(false);
    } catch (err) {
      console.error('Failed to set quality:', err);
    }
  }, []);

  // Get network quality color
  const getNetworkColor = useCallback((quality: NetworkQuality): string => {
    switch (quality) {
      case NetworkQuality.EXCELLENT:
        return '#22c55e'; // green
      case NetworkQuality.GOOD:
        return '#84cc16'; // lime
      case NetworkQuality.FAIR:
        return '#eab308'; // yellow
      case NetworkQuality.POOR:
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }, []);

  // Get buffer state color
  const getBufferColor = useCallback((state: BufferState): string => {
    switch (state) {
      case BufferState.CRITICAL:
        return '#ef4444'; // red
      case BufferState.LOW:
        return '#f97316'; // orange
      case BufferState.HEALTHY:
        return '#22c55e'; // green
      case BufferState.EXCESS:
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  }, []);

  // Format bandwidth
  const formatBandwidth = (bps: number): string => {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`;
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
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Render loading state
  if (streamState === StreamState.INITIALIZING) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing stream...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID="abr-video-player">
      {/* Video player placeholder */}
      <View style={styles.videoContainer} testID="video-container">
        <Text style={styles.videoPlaceholder}>
          {streamState === StreamState.PLAYING ? '▶ LIVE' : '⏸ PAUSED'}
        </Text>

        {/* Network indicator */}
        {showNetworkIndicator && (
          <View
            testID="network-indicator"
            style={[styles.networkIndicator, { backgroundColor: getNetworkColor(networkQuality) }]}>
            <Text style={styles.networkText}>{networkQuality}</Text>
          </View>
        )}

        {/* Buffer indicator */}
        {showBufferIndicator && (
          <View style={styles.bufferIndicator} testID="buffer-indicator">
            <View style={styles.bufferBar}>
              <View
                style={[
                  styles.bufferFill,
                  {
                    width: `${Math.min((bufferLevel / 30) * 100, 100)}%`,
                    backgroundColor: getBufferColor(bufferState),
                  },
                ]}
              />
            </View>
            <Text style={styles.bufferText}>{bufferLevel.toFixed(1)}s</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      {showControls && (
        <View style={styles.controls} testID="control-bar">
          {/* Play/Pause */}
          <Pressable
            style={styles.controlButton}
            onPress={handlePlayPause}
            testID="play-pause-button"
            accessibilityRole="button"
            accessibilityLabel={streamState === StreamState.PLAYING ? 'Pause video' : 'Play video'}
            accessibilityHint="Toggles video playback">
            <Text style={styles.controlButtonText}>
              {streamState === StreamState.PLAYING ? '⏸' : '▶'}
            </Text>
          </Pressable>

          {/* Current quality */}
          <View style={styles.qualityInfo}>
            <Text style={styles.qualityLabel}>Quality:</Text>
            <Text style={styles.qualityValue}>{currentQuality?.label || 'Auto'}</Text>
          </View>

          {/* Quality selector */}
          {showQualitySelector && enableABR && (
            <Pressable
              style={styles.qualityButton}
              onPress={() => setShowQualityMenu(!showQualityMenu)}
              testID="quality-selector-button"
              accessibilityRole="button"
              accessibilityLabel="Quality settings"
              accessibilityHint="Opens video quality selector menu">
              <Text style={styles.qualityButtonText}>⚙</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Quality menu */}
      {showQualityMenu && (
        <View style={styles.qualityMenu}>
          <Text style={styles.qualityMenuTitle}>Select Quality</Text>
          {availableQualities.map((quality) => (
            <Pressable
              key={quality.label}
              style={[
                styles.qualityMenuItem,
                currentQuality?.label === quality.label && styles.qualityMenuItemActive,
              ]}
              onPress={() => handleQualitySelect(quality)}
              accessibilityRole="button"
              accessibilityLabel={`${quality.label} quality, ${formatBandwidth(quality.bitrate)}`}>
              <Text style={styles.qualityMenuItemText}>{quality.label}</Text>
              <Text style={styles.qualityMenuItemBitrate}>{formatBandwidth(quality.bitrate)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Debug metrics */}
      {showDebugMetrics && metrics && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Debug Metrics</Text>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>State:</Text>
            <Text style={styles.debugValue}>{metrics.state}</Text>
          </View>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Network:</Text>
            <Text style={styles.debugValue}>
              {formatBandwidth(metrics.bandwidth)} ({metrics.latency}ms)
            </Text>
          </View>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Buffer:</Text>
            <Text style={styles.debugValue}>
              {metrics.bufferLevel.toFixed(1)}s ({metrics.bufferState})
            </Text>
          </View>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Quality Switches:</Text>
            <Text style={styles.debugValue}>{metrics.qualitySwitchCount}</Text>
          </View>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Stalls:</Text>
            <Text style={styles.debugValue}>{metrics.stallCount}</Text>
          </View>

          {enableDVR && (
            <>
              <View style={styles.debugSection}>
                <Text style={styles.debugLabel}>DVR Window:</Text>
                <Text style={styles.debugValue}>
                  {formatDuration(metrics.dvrWindowDuration)} ({metrics.dvrSegmentCount} segments)
                </Text>
              </View>

              <View style={styles.debugSection}>
                <Text style={styles.debugLabel}>DVR Storage:</Text>
                <Text style={styles.debugValue}>{formatBytes(metrics.dvrStorageSize)}</Text>
              </View>
            </>
          )}

          {enableS3Upload && (
            <>
              <View style={styles.debugSection}>
                <Text style={styles.debugLabel}>S3 Uploads:</Text>
                <Text style={styles.debugValue}>
                  {metrics.uploadCount} ({metrics.uploadFailureCount} failed,{' '}
                  {metrics.uploadRetryCount} retried)
                </Text>
              </View>
            </>
          )}

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Uptime:</Text>
            <Text style={styles.debugValue}>{formatDuration(metrics.uptime)}</Text>
          </View>

          <View style={styles.debugSection}>
            <Text style={styles.debugLabel}>Avg Quality:</Text>
            <Text style={styles.debugValue}>{(metrics.averageQuality * 100).toFixed(0)}%</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },

  // Video
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoPlaceholder: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Network indicator
  networkIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  networkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Buffer indicator
  bufferIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bufferBar: {
    width: 120,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bufferFill: {
    height: '100%',
  },
  bufferText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 24,
  },
  controlButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  qualityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityLabel: {
    color: '#999',
    fontSize: 14,
  },
  qualityValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qualityButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 24,
  },
  qualityButtonText: {
    fontSize: 24,
    color: '#fff',
  },

  // Quality menu
  qualityMenu: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#333',
  },
  qualityMenuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 4,
  },
  qualityMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  qualityMenuItemActive: {
    backgroundColor: '#3b82f6',
  },
  qualityMenuItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  qualityMenuItemBitrate: {
    color: '#999',
    fontSize: 12,
  },

  // Debug panel
  debugPanel: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    padding: 12,
    minWidth: 300,
    maxHeight: 400,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  debugSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  debugLabel: {
    color: '#999',
    fontSize: 11,
  },
  debugValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Loading
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },

  // Error
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
});
