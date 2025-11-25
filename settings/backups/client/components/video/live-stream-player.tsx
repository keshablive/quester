import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { AlertCircle, Pause, Play, Radio } from 'lucide-react-native';

export interface LiveStreamPlayerProps {
  streamUrl: string;
  isLive?: boolean;
  dvrEnabled?: boolean;
  onViewerCountUpdate?: (count: number) => void;
  onError?: (error: string) => void;
}

export function LiveStreamPlayer({
  streamUrl,
  isLive = true,
  dvrEnabled = false,
  onViewerCountUpdate: _onViewerCountUpdate,
  onError,
}: LiveStreamPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    loadVideo();

    // Cleanup on unmount
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [streamUrl]);

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (videoRef.current) {
        await videoRef.current.loadAsync(
          { uri: streamUrl },
          {
            shouldPlay: true,
            isLooping: false,
            isMuted: false,
            volume: 1.0,
          }
        );
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stream';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        const errorMessage = `Playback error: ${status.error}`;
        setError(errorMessage);
        onError?.(errorMessage);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
    }

    if (status.positionMillis) {
      setPosition(status.positionMillis);
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      console.error('Failed to toggle play/pause:', err);
    }
  };

  const goLive = async () => {
    if (!videoRef.current || !isLive) return;

    try {
      // For live streams, seek to the end (latest position)
      await videoRef.current.setPositionAsync(duration);
    } catch (err) {
      console.error('Failed to go live:', err);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isNearLive = duration > 0 && position >= duration - 10000; // Within 10 seconds of live

  if (error) {
    return (
      <View className="relative flex-1 bg-black">
        <View className="flex-1 items-center justify-center bg-gray-800 p-6">
          <AlertCircle size={48} color="#ef4444" />
          <Text variant="p" className="mb-6 mt-4 text-center text-red-500">
            {error}
          </Text>
          <Pressable className="rounded-lg bg-blue-500 px-6 py-3" onPress={loadVideo}>
            <Text variant="h4" className="text-white">
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable className="relative flex-1 bg-black" onPress={() => setShowControls(!showControls)}>
      <Video
        ref={videoRef}
        className="h-full w-full flex-1"
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/70">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text variant="p" className="mt-3 font-medium text-white">
            Loading stream...
          </Text>
        </View>
      )}

      {isBuffering && !isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {isLive && (
        <View className="absolute left-4 top-4 flex-row items-center rounded bg-red-500/90 px-3 py-1.5">
          <View className="mr-1.5 h-2 w-2 rounded-full bg-white" />
          <Text variant="small" className="font-bold tracking-wide text-white">
            LIVE
          </Text>
        </View>
      )}

      {showControls && (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          {/* Play/Pause Button */}
          <Pressable
            className="w-18 h-18 items-center justify-center rounded-full border-2 border-white bg-black/60"
            onPress={togglePlayPause}>
            {isPlaying ? <Pause size={48} color="#ffffff" /> : <Play size={48} color="#ffffff" />}
          </Pressable>

          {/* Bottom Controls */}
          <View className="absolute bottom-0 left-0 right-0 p-4">
            {/* DVR Seek Bar */}
            {dvrEnabled && duration > 0 && (
              <View className="flex-row items-center gap-3">
                <Text variant="small" className="font-medium text-white">
                  {formatTime(position)}
                </Text>
                <View className="h-1 flex-1 overflow-hidden rounded bg-white/30">
                  <View
                    className="h-full bg-blue-500"
                    style={{ width: `${(position / duration) * 100}%` }}
                  />
                </View>
                <Text variant="small" className="font-medium text-white">
                  {formatTime(duration)}
                </Text>
              </View>
            )}

            {/* Go Live Button (for DVR) */}
            {dvrEnabled && isLive && !isNearLive && (
              <Pressable
                className="mt-3 flex-row items-center gap-1.5 self-center rounded bg-red-500 px-4 py-2"
                onPress={goLive}>
                <Radio size={16} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">Go Live</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}
