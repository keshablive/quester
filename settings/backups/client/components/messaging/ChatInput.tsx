import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, FileText, XCircle, PlusCircle, Smile, X, Send } from 'lucide-react-native';

interface Attachment {
  uri: string;
  type: 'image' | 'video' | 'file';
  name?: string;
  size?: number;
  mimeType?: string;
}

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowAttachments?: boolean;
  allowEmoji?: boolean;
}

export function ChatInput({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 2000,
  allowAttachments = true,
  allowEmoji = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Request permissions
  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photos to send images.'
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your camera.');
      return false;
    }
    return true;
  };

  // Handle text input change
  const handleTextChange = (text: string) => {
    setMessage(text);

    // Trigger typing indicator
    if (onTyping) {
      onTyping(text.length > 0);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  // Handle image picker
  const handleImagePicker = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newAttachments: Attachment[] = result.assets.map(
          (asset: ImagePicker.ImagePickerAsset) => ({
            uri: asset.uri,
            type: 'image' as const,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            size: asset.fileSize,
            mimeType: asset.mimeType || 'image/jpeg',
          })
        );

        setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Handle camera
  const handleCamera = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
        };

        setAttachments((prev) => [...prev, newAttachment].slice(0, 5));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Handle video picker
  const handleVideoPicker = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (max 100MB)
        if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Video size should not exceed 100MB.');
          return;
        }

        const newAttachment: Attachment = {
          uri: asset.uri,
          type: 'video',
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'video/mp4',
        };

        setAttachments((prev) => [...prev, newAttachment].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  // Handle document picker
  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newAttachments: Attachment[] = result.assets
          .map((asset: DocumentPicker.DocumentPickerAsset): Attachment | null => {
            // Check file size (max 50MB)
            if (asset.size && asset.size > 50 * 1024 * 1024) {
              Alert.alert('File Too Large', `${asset.name} exceeds 50MB limit.`);
              return null;
            }

            return {
              uri: asset.uri,
              type: 'file' as const,
              name: asset.name,
              size: asset.size,
              mimeType: asset.mimeType || 'application/octet-stream',
            };
          })
          .filter((att): att is Attachment => att !== null);

        setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // Show attachment options
  const showAttachmentOptions = () => {
    Alert.alert(
      'Add Attachment',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleCamera },
        { text: 'Choose Image', onPress: handleImagePicker },
        { text: 'Choose Video', onPress: handleVideoPicker },
        { text: 'Choose File', onPress: handleDocumentPicker },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle send message
  const handleSend = async () => {
    if (isSending || disabled) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;

    setIsSending(true);

    try {
      await onSendMessage(trimmedMessage, attachments.length > 0 ? attachments : undefined);

      // Clear input and attachments on success
      setMessage('');
      setAttachments([]);
      inputRef.current?.clear();

      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Emoji picker (simplified - you can integrate a proper emoji picker library)
  const commonEmojis = ['👍', '❤️', '😂', '😊', '🎉', '🔥', '👏', '✨', '💯', '🙌'];

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="border-t border-gray-300 bg-white">
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <View className="flex-row border-b border-gray-300 p-2">
          {attachments.map((attachment, index) => (
            <View key={index} className="w-15 h-15 relative mr-2 overflow-hidden rounded-lg">
              {attachment.type === 'image' && (
                <Image source={{ uri: attachment.uri }} className="h-full w-full" />
              )}
              {attachment.type === 'video' && (
                <View className="h-full w-full items-center justify-center bg-black">
                  <Video size={24} color="#FFF" />
                </View>
              )}
              {attachment.type === 'file' && (
                <View className="h-full w-full items-center justify-center bg-gray-200">
                  <FileText size={24} color="#007AFF" />
                </View>
              )}
              <Pressable
                className="absolute -right-1 -top-1 rounded-full bg-white"
                onPress={() => removeAttachment(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${attachment.type} attachment`}
                accessibilityHint="Remove this attachment from message">
                <XCircle size={20} color="#FF3B30" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <View className="flex-row flex-wrap border-b border-gray-300 bg-gray-100 p-2">
          {commonEmojis.map((emoji, index) => (
            <Pressable
              key={index}
              className="p-2"
              onPress={() => insertEmoji(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${emoji} emoji`}
              accessibilityHint="Add emoji to message">
              <Text className="text-2xl">{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input container */}
      <View className="flex-row items-end p-2">
        {/* Attachment button */}
        {allowAttachments && (
          <Pressable
            className="px-2 pb-2"
            onPress={showAttachmentOptions}
            disabled={disabled || isSending}>
            <PlusCircle size={28} color={disabled ? '#CCC' : '#007AFF'} />
          </Pressable>
        )}

        {/* Text input */}
        <View className="mx-2 flex-1 flex-row items-end rounded-full bg-gray-200 px-3 py-2">
          <TextInput
            ref={inputRef}
            className="max-h-[100px] flex-1 py-1 text-base text-black"
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={maxLength}
            editable={!disabled && !isSending}
            returnKeyType="default"
          />

          {/* Emoji button */}
          {allowEmoji && (
            <Pressable
              className="pb-1 pl-2"
              onPress={() => setShowEmojiPicker((prev) => !prev)}
              disabled={disabled || isSending}>
              {showEmojiPicker ? (
                <X size={24} color={disabled ? '#CCC' : '#007AFF'} />
              ) : (
                <Smile size={24} color={disabled ? '#CCC' : '#007AFF'} />
              )}
            </Pressable>
          )}
        </View>

        {/* Send button */}
        <Pressable
          className={`mb-1 h-10 w-10 items-center justify-center rounded-full ${(!message.trim() && attachments.length === 0) || disabled || isSending ? 'bg-gray-400' : 'bg-blue-500'}`}
          onPress={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled || isSending}>
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={20} color="#FFF" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
