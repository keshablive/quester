import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  unlockedFeatures: string[];
  onClose: () => void;
}

/**
 * LevelUpModal Component - Optimized with React.memo (Phase 7, T111)
 *
 * Prevents unnecessary re-renders when parent components update.
 * Only re-renders when props change (visible, level, unlockedFeatures, onClose).
 */
const LevelUpModal = React.memo(function LevelUpModal({
  visible,
  level,
  unlockedFeatures,
  onClose,
}: LevelUpModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
      testID="level-up-modal">
      <View
        className="flex-1 items-center justify-center bg-black/80 p-5"
        role="dialog"
        accessibilityRole="alert"
        accessibilityLabel={`Congratulations! You reached level ${level}`}
        testID="level-up-overlay">
        {/* Confetti Animation - retain absolute positioning for z-index */}
        <LottieView
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
          testID="confetti-animation"
        />

        <View className="z-[2] w-full max-w-[400px] items-center rounded-2xl bg-[#1a1a2e] p-8">
          {/* Close Button */}
          <Pressable
            testID="dismiss-button"
            className="absolute right-4 top-4 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 p-2"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close level up modal"
            accessibilityHint="Dismiss this celebration screen">
            <X size={24} color="#fff" />
          </Pressable>

          {/* Level Display */}
          <View className="mb-8 items-center">
            <Text variant="h2" className="mb-2 text-white">
              Congratulations!
            </Text>
            <Text className="text-5xl font-extrabold text-yellow-400">Level {level}</Text>
          </View>

          {/* Unlocked Features */}
          <View className="w-full">
            <Text variant="h3" className="mb-4 text-white">
              Unlocked Features:
            </Text>
            {unlockedFeatures.length > 0 ? (
              unlockedFeatures.map((feature, index) => (
                <View key={index} className="py-2">
                  <Text variant="p" className="text-gray-300">
                    ✨ {feature}
                  </Text>
                </View>
              ))
            ) : (
              <Text variant="small" className="text-gray-400">
                No new features at this level
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default LevelUpModal;
