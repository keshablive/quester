import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Server,
  Copy,
  Key,
  Monitor,
  Smartphone,
  Terminal,
  Wifi,
  Settings,
  Video,
  Mic,
  Clock,
  ArrowRight,
  ArrowLeft,
  Info,
  AlertCircle,
} from 'lucide-react-native';
import { useCreateStream } from '@/lib/hooks/useStream';

export default function StreamSetupScreen() {
  const router = useRouter();
  const { createStream, isCreating, error } = useCreateStream();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dvrEnabled, setDvrEnabled] = useState(true);
  const [streamType, setStreamType] = useState<'live' | 'vod'>('live');
  const [createdStream, setCreatedStream] = useState<{
    id: string;
    rtmpUrl: string;
    streamKey: string;
  } | null>(null);

  const handleCreateStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    try {
      const stream = await createStream({
        title: title.trim(),
        description: description.trim() || undefined,
        streamType,
        dvrEnabled,
      });

      setCreatedStream({
        id: stream.id,
        rtmpUrl: stream.rtmpUrl,
        streamKey: stream.streamKey,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stream';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const handleGoToStream = () => {
    if (createdStream) {
      router.replace(`/live-stream/${createdStream.id}`);
    }
  };

  if (createdStream) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={64} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Stream Created!</Text>
          <Text style={styles.successSubtitle}>
            Your stream is ready. Use the details below to start broadcasting.
          </Text>
        </View>

        {/* RTMP Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Details</Text>

          {/* RTMP Server URL */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Server size={20} color="#3b82f6" />
              <Text style={styles.detailLabel}>RTMP Server URL</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailValue} selectable>
                {createdStream.rtmpUrl}
              </Text>
              <Pressable
                style={styles.copyButton}
                onPress={() => handleCopyToClipboard(createdStream.rtmpUrl, 'Server URL')}>
                <Copy size={20} color="#3b82f6" />
              </Pressable>
            </View>
          </View>

          {/* Stream Key */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Key size={20} color="#3b82f6" />
              <Text style={styles.detailLabel}>Stream Key</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailValue} selectable>
                {createdStream.streamKey}
              </Text>
              <Pressable
                style={styles.copyButton}
                onPress={() => handleCopyToClipboard(createdStream.streamKey, 'Stream Key')}>
                <Copy size={20} color="#3b82f6" />
              </Pressable>
            </View>
            <Text style={styles.detailHint}>
              ⚠️ Keep your stream key private! Anyone with it can stream to your channel.
            </Text>
          </View>
        </View>

        {/* Setup Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Instructions</Text>

          {/* OBS Studio */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Monitor size={24} color="#6b7280" />
              <Text style={styles.instructionTitle}>OBS Studio</Text>
            </View>
            <View style={styles.instructionSteps}>
              <Text style={styles.stepText}>1. Open OBS Studio and go to Settings</Text>
              <Text style={styles.stepText}>2. Select the "Stream" tab</Text>
              <Text style={styles.stepText}>3. Choose "Custom..." as the service</Text>
              <Text style={styles.stepText}>4. Paste the Server URL and Stream Key</Text>
              <Text style={styles.stepText}>5. Click "Apply" and "OK"</Text>
              <Text style={styles.stepText}>6. Click "Start Streaming" in OBS</Text>
            </View>
          </View>

          {/* Streamlabs */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Smartphone size={24} color="#6b7280" />
              <Text style={styles.instructionTitle}>Streamlabs Mobile</Text>
            </View>
            <View style={styles.instructionSteps}>
              <Text style={styles.stepText}>1. Open Streamlabs and tap Settings</Text>
              <Text style={styles.stepText}>2. Go to "Stream Settings"</Text>
              <Text style={styles.stepText}>3. Select "Custom RTMP"</Text>
              <Text style={styles.stepText}>4. Enter the Server URL and Stream Key</Text>
              <Text style={styles.stepText}>5. Save and start streaming</Text>
            </View>
          </View>

          {/* FFmpeg */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Terminal size={24} color="#6b7280" />
              <Text style={styles.instructionTitle}>FFmpeg (Command Line)</Text>
            </View>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText} selectable>
                ffmpeg -re -i input.mp4 -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k
                -pix_fmt yuv420p -g 50 -c:a aac -b:a 160k -ar 44100 -f flv {createdStream.rtmpUrl}/
                {createdStream.streamKey}
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Tips</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Wifi size={20} color="#3b82f6" />
              <Text style={styles.tipText}>Use a stable internet connection (5+ Mbps upload)</Text>
            </View>
            <View style={styles.tipItem}>
              <Settings size={20} color="#3b82f6" />
              <Text style={styles.tipText}>Recommended bitrate: 2500-4000 kbps for 1080p</Text>
            </View>
            <View style={styles.tipItem}>
              <Video size={20} color="#3b82f6" />
              <Text style={styles.tipText}>Resolution: 1920x1080 @ 30fps or 1280x720 @ 60fps</Text>
            </View>
            <View style={styles.tipItem}>
              <Mic size={20} color="#3b82f6" />
              <Text style={styles.tipText}>Audio: AAC codec, 160 kbps, 44.1 kHz</Text>
            </View>
            {dvrEnabled && (
              <View style={styles.tipItem}>
                <Clock size={20} color="#10b981" />
                <Text style={styles.tipText}>DVR enabled: Viewers can rewind up to 2 hours</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.primaryButton} onPress={handleGoToStream}>
            <Text style={styles.primaryButtonText}>Go to Stream</Text>
            <ArrowRight size={20} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back to Videos</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Setup Stream</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Stream Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Stream Type</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[styles.segmentButton, streamType === 'live' && styles.segmentButtonActive]}
              onPress={() => setStreamType('live')}>
              <Text style={[styles.segmentText, streamType === 'live' && styles.segmentTextActive]}>
                Live Stream
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, streamType === 'vod' && styles.segmentButtonActive]}
              onPress={() => setStreamType('vod')}>
              <Text style={[styles.segmentText, streamType === 'vod' && styles.segmentTextActive]}>
                VOD
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter stream title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.hint}>{title.length}/100 characters</Text>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell viewers what your stream is about..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.hint}>{description.length}/500 characters</Text>
        </View>

        {/* DVR Option */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Enable DVR</Text>
              <Text style={styles.switchDescription}>
                Allow viewers to rewind up to 2 hours during live streams
              </Text>
            </View>
            <Switch
              value={dvrEnabled}
              onValueChange={setDvrEnabled}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={dvrEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            After creating the stream, you'll receive RTMP credentials to use with OBS Studio,
            Streamlabs, or any RTMP-compatible broadcasting software.
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : 'Failed to create stream'}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
          onPress={handleCreateStream}
          disabled={isCreating}>
          {isCreating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Video size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Create Stream</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  segmentTextActive: {
    color: '#3b82f6',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 12,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    marginLeft: 12,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#15803d',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  detailContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  copyButton: {
    padding: 8,
  },
  detailHint: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 8,
  },
  instructionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  instructionSteps: {
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  codeText: {
    fontSize: 12,
    color: '#f3f4f6',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  tipsContainer: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    lineHeight: 20,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
