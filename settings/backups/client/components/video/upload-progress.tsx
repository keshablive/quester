/**
 * T566: Upload Progress Indicator Component
 *
 * Displays upload progress with percentage (0-100%)
 * Shows visual progress bar and current status
 */

import React from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import {
  CheckCircle,
  RotateCw,
  CloudUpload,
  FileText,
  Info,
  type LucideIcon,
} from 'lucide-react-native';

export interface UploadProgressProps {
  progress: number; // 0-100
  isUploading: boolean;
  fileName?: string;
  fileSize?: string;
  showPercentage?: boolean;
  showFileName?: boolean;
  retryAttempt?: number;
}

export function UploadProgress({
  progress,
  isUploading,
  fileName,
  fileSize,
  showPercentage = true,
  showFileName = true,
  retryAttempt = 0,
}: UploadProgressProps) {
  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  const getStatusText = () => {
    if (!isUploading && progress === 100) {
      return 'Upload Complete';
    }
    if (retryAttempt > 0) {
      return `Retrying... (Attempt ${retryAttempt + 1})`;
    }
    if (isUploading) {
      return 'Uploading...';
    }
    return 'Ready to upload';
  };

  const getStatusIcon = (): LucideIcon => {
    if (!isUploading && progress === 100) {
      return CheckCircle;
    }
    if (retryAttempt > 0) {
      return RotateCw;
    }
    if (isUploading) {
      return CloudUpload;
    }
    return FileText;
  };

  const getStatusColor = () => {
    if (!isUploading && progress === 100) {
      return '#10B981'; // Success green
    }
    if (retryAttempt > 0) {
      return '#F59E0B'; // Warning orange
    }
    if (isUploading) {
      return '#3B82F6'; // Primary blue
    }
    return '#6B7280'; // Gray
  };

  return (
    <View className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      {/* Header with icon and status */}
      <View className="mb-3 flex-row items-center">
        {(() => {
          const StatusIcon = getStatusIcon();
          return <StatusIcon size={24} color={getStatusColor()} />;
        })()}
        <View className="ml-3 flex-1">
          <Text variant="h4" className="mb-1 text-gray-900">
            {getStatusText()}
          </Text>
          {showFileName && fileName && (
            <Text variant="small" className="mb-0.5 text-gray-600" numberOfLines={1}>
              {fileName}
            </Text>
          )}
          {fileSize && (
            <Text variant="small" className="text-gray-400">
              {fileSize}
            </Text>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      {isUploading || progress > 0 ? (
        <View className="mb-2 flex-row items-center">
          <View className="mr-3 h-2 flex-1 overflow-hidden rounded bg-gray-200">
            <Animated.View
              className="h-full rounded"
              style={[
                useAnimatedStyle(() => ({
                  width: `${progressWidth.value}%`,
                })),
                { backgroundColor: getStatusColor() },
              ]}
            />
          </View>
          {showPercentage && (
            <Text variant="small" className="min-w-[45px] text-right font-semibold text-gray-900">
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      ) : null}

      {/* Retry Information */}
      {retryAttempt > 0 && (
        <View className="mt-2 flex-row items-center rounded-md bg-amber-100 p-2">
          <Info size={16} color="#F59E0B" />
          <Text variant="small" className="ml-1.5 flex-1 text-amber-900">
            Upload failed. Retrying with exponential backoff...
          </Text>
        </View>
      )}

      {/* Upload Speed (optional - can be enhanced later) */}
      {isUploading && progress > 0 && progress < 100 && (
        <Text variant="small" className="mt-1 italic text-gray-600">
          {progress < 50 ? 'Preparing upload...' : 'Finalizing upload...'}
        </Text>
      )}
    </View>
  );
}
