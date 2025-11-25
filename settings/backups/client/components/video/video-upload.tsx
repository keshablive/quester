import React, { useState, useRef } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import * as DocumentPicker from 'expo-document-picker';
import { CloudUpload, Video, XCircle } from 'lucide-react-native';
import { videosApi } from '@/lib/api/videos';

export interface VideoUploadProps {
  onUploadComplete?: (videoUrl: string) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  maxSizeInMB?: number;
  allowedFormats?: string[];
  maxRetries?: number; // T568: Configure retry attempts
  retryDelay?: number; // T568: Configure initial retry delay
}

export function VideoUpload({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  maxSizeInMB = 500, // 500 MB default max size
  allowedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  maxRetries = 3, // T568: Default 3 retries
  retryDelay = 1000, // T568: Default 1s initial delay
}: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [_retryAttempt, _setRetryAttempt] = useState(0); // T568: Track retry attempts

  // T565: AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // Validate file type
      if (file.mimeType && !allowedFormats.includes(file.mimeType)) {
        Alert.alert(
          'Invalid Format',
          `Please select a valid video file. Supported formats: ${allowedFormats.join(', ')}`
        );
        return;
      }

      // Validate file size
      if (file.size && file.size > maxSizeInMB * 1024 * 1024) {
        Alert.alert(
          'File Too Large',
          `Please select a video smaller than ${maxSizeInMB} MB. Selected file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`
        );
        return;
      }

      setSelectedFile(file);
    } catch (err) {
      console.error('Error picking video:', err);
      Alert.alert('Error', 'Failed to select video file');
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      _setRetryAttempt(0);

      // T565: Create AbortController for cancellation
      abortControllerRef.current = new AbortController();

      // Prepare file object for upload
      const fileData = {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'video/mp4',
      };

      // T564: Upload with authentication (handled in videosApi)
      // T565: Pass abort signal for cancellation
      // T567: RFC 7807 error parsing (handled in videosApi)
      // T568: Retry logic with exponential backoff (handled in videosApi)
      const response = await videosApi.uploadVideo(fileData, {
        signal: abortControllerRef.current.signal, // T565
        maxRetries, // T568
        retryDelay, // T568
        onProgress: (progress) => {
          setUploadProgress(progress);
          onUploadProgress?.(progress);
        },
      });

      // Upload successful
      setIsUploading(false);
      setUploadProgress(100);
      onUploadComplete?.(response.videoUrl);

      Alert.alert('Success', 'Video uploaded successfully!');

      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
      _setRetryAttempt(0);
      abortControllerRef.current = null;
    } catch (err: any) {
      // Handle errors
      setIsUploading(false);

      // T565: Check if error was due to cancellation
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        const errorMessage = 'Upload cancelled by user';
        onUploadError?.(errorMessage);
        Alert.alert('Upload Cancelled', errorMessage);
        return;
      }

      // T567: Error message from RFC 7807 parsing or generic
      const errorMessage = err.message || 'Failed to upload video';
      onUploadError?.(errorMessage);

      // T568: Show retry information if applicable
      if (err.status && err.status >= 500) {
        Alert.alert(
          'Upload Failed',
          `${errorMessage}\n\nThe upload was retried ${maxRetries} times but failed. Please try again later.`
        );
      } else {
        Alert.alert('Upload Failed', errorMessage);
      }

      // Reset state
      abortControllerRef.current = null;
    }
  };

  // T565: Implement upload cancellation with AbortController
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsUploading(false);
    setUploadProgress(0);
    _setRetryAttempt(0);

    Alert.alert('Upload Cancelled', 'Video upload was cancelled');
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <View className="p-4">
      {!selectedFile ? (
        // File Picker
        <Pressable
          className="items-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-50 p-8"
          onPress={pickVideo}
          disabled={isUploading}>
          <CloudUpload size={48} color="#3b82f6" />
          <Text variant="h3" className="mt-3 text-gray-800">
            Select Video to Upload
          </Text>
          <Text variant="small" className="mt-1 text-gray-600">
            Max size: {maxSizeInMB} MB
          </Text>
          <Text variant="small" className="mt-2 text-gray-400">
            Supported: MP4, MOV, AVI
          </Text>
        </Pressable>
      ) : (
        // Selected File Info
        <View className="flex-row items-center gap-3 rounded-xl bg-gray-100 p-4">
          <View className="h-14 w-14 items-center justify-center rounded-lg bg-blue-50">
            <Video size={32} color="#3b82f6" />
          </View>

          <View className="flex-1">
            <Text variant="h4" className="mb-1 text-gray-800" numberOfLines={2}>
              {selectedFile.name}
            </Text>
            {selectedFile.size && (
              <Text variant="small" className="text-gray-600">
                {formatFileSize(selectedFile.size)}
              </Text>
            )}
          </View>

          {!isUploading && (
            <Pressable className="p-1" onPress={removeFile}>
              <XCircle size={24} color="#ef4444" />
            </Pressable>
          )}
        </View>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <View className="mt-4">
          <View className="h-2 overflow-hidden rounded bg-gray-200">
            <View className="h-full bg-blue-500" style={{ width: `${uploadProgress}%` }} />
          </View>
          <Text variant="small" className="mt-2 text-center text-gray-600">
            Uploading... {uploadProgress}%
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {selectedFile && (
        <View className="mt-4 flex-row gap-3">
          {!isUploading ? (
            <>
              <Pressable
                className="flex-1 items-center rounded-lg border border-gray-300 bg-white px-5 py-3.5"
                onPress={pickVideo}>
                <Text variant="p" className="font-semibold text-gray-700">
                  Change Video
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 items-center rounded-lg bg-blue-500 px-5 py-3.5"
                onPress={uploadVideo}>
                <Text variant="p" className="font-semibold text-white">
                  Upload Video
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              className="flex-1 items-center rounded-lg bg-red-500 px-5 py-3.5"
              onPress={cancelUpload}>
              <Text className="text-base font-semibold text-white">Cancel Upload</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Upload Tips */}
      {!selectedFile && !isUploading && (
        <View className="mt-6 rounded-lg bg-gray-50 p-4">
          <Text variant="small" className="mb-2 font-semibold text-gray-700">
            Upload Tips:
          </Text>
          <Text variant="small" className="mb-1 leading-5 text-gray-600">
            • Use high quality videos (1080p or higher)
          </Text>
          <Text variant="small" className="mb-1 leading-5 text-gray-600">
            • Keep file size under {maxSizeInMB} MB for faster uploads
          </Text>
          <Text variant="small" className="mb-1 leading-5 text-gray-600">
            • MP4 format is recommended for best compatibility
          </Text>
          <Text variant="small" className="mb-1 leading-5 text-gray-600">
            • Ensure stable internet connection during upload
          </Text>
        </View>
      )}
    </View>
  );
}
