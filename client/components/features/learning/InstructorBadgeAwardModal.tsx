/**
 * Instructor Badge Award Modal Component
 *
 * Modal dialog for instructors to award badges to students with
 * badge selection, message input, and confirmation.
 * 006-course-gamification T087
 */
import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui';
import {
  Award,
  X,
  Search,
  Check,
  Gift,
  MessageSquare,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react-native';
import { cn, OptimizedImage } from '@/core';
import { useInstructorBadgeAward } from '@/core/hooks/useInstructorBadgeAward';

/**
 * Badge definition for selection
 */
interface BadgeOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category?: string;
}

/**
 * Student for badge awarding
 */
interface StudentOption {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  courseProgress?: number;
}

/**
 * Props for InstructorBadgeAwardModal
 */
interface InstructorBadgeAwardModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when badge is successfully awarded */
  onSuccess?: (studentId: string, badgeId: string) => void;
  /** Available badges to choose from */
  availableBadges: BadgeOption[];
  /** Students in the course */
  students: StudentOption[];
  /** Pre-selected student (optional) */
  preSelectedStudent?: StudentOption;
  /** Pre-selected badge (optional) */
  preSelectedBadge?: BadgeOption;
}

/**
 * Get rarity styling
 */
function getRarityStyling(rarity: string): { color: string; bgColor: string } {
  switch (rarity) {
    case 'legendary':
      return { color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'epic':
      return { color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' };
    case 'rare':
      return { color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    default:
      return { color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' };
  }
}

/**
 * Badge selection card
 */
function BadgeCard({
  badge,
  selected,
  onSelect,
}: {
  badge: BadgeOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { color, bgColor } = getRarityStyling(badge.rarity);

  return (
    <Pressable
      onPress={onSelect}
      className={cn(
        'flex-row items-center gap-3 rounded-xl border-2 p-3',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      )}>
      <View className={cn('h-12 w-12 items-center justify-center rounded-full', bgColor)}>
        {badge.icon ? (
          <Text className="text-2xl">{badge.icon}</Text>
        ) : (
          <Award size={24} className={color} />
        )}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-foreground">{badge.name}</Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {badge.description}
        </Text>
        <Text className={cn('mt-0.5 text-xs font-medium capitalize', color)}>{badge.rarity}</Text>
      </View>
      {selected && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Student selection card
 */
function StudentCard({
  student,
  selected,
  onSelect,
}: {
  student: StudentOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      className={cn(
        'flex-row items-center gap-3 rounded-xl border-2 p-3',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      )}>
      {student.avatar ? (
        <OptimizedImage
          source={student.avatar}
          className="h-10 w-10 rounded-full"
          placeholder="avatar"
          contentFit="cover"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
          <User size={20} className="text-muted-foreground" />
        </View>
      )}
      <View className="flex-1">
        <Text className="font-medium text-foreground">{student.name}</Text>
        <Text className="text-xs text-muted-foreground">@{student.username}</Text>
      </View>
      {student.courseProgress !== undefined && (
        <View className="items-end">
          <Text className="text-xs text-muted-foreground">Progress</Text>
          <Text className="text-sm font-medium text-foreground">
            {Math.round(student.courseProgress)}%
          </Text>
        </View>
      )}
      {selected && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check size={14} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Instructor Badge Award Modal
 *
 * Multi-step modal for instructors to award badges to their students.
 *
 * @example
 * ```tsx
 * <InstructorBadgeAwardModal
 *   visible={showAwardModal}
 *   onClose={() => setShowAwardModal(false)}
 *   onSuccess={(studentId, badgeId) => console.log('Awarded!')}
 *   availableBadges={badges}
 *   students={courseStudents}
 * />
 * ```
 */
export function InstructorBadgeAwardModal({
  visible,
  onClose,
  onSuccess,
  availableBadges,
  students,
  preSelectedStudent,
  preSelectedBadge,
}: InstructorBadgeAwardModalProps) {
  // Award hook
  const { awardBadge, loading, error, success, clearError, clearSuccess, reset } =
    useInstructorBadgeAward();

  // Local state
  const [step, setStep] = useState<'student' | 'badge' | 'message' | 'confirm'>('student');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    preSelectedStudent || null
  );
  const [selectedBadge, setSelectedBadge] = useState<BadgeOption | null>(preSelectedBadge || null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      reset();
      setStep(preSelectedStudent ? 'badge' : 'student');
      setSelectedStudent(preSelectedStudent || null);
      setSelectedBadge(preSelectedBadge || null);
      setMessage('');
      setSearchQuery('');
    }
  }, [visible, preSelectedStudent, preSelectedBadge, reset]);

  // Handle success
  useEffect(() => {
    if (success && selectedStudent && selectedBadge) {
      onSuccess?.(selectedStudent.id, selectedBadge.id);
    }
  }, [success, selectedStudent, selectedBadge, onSuccess]);

  // Filter students
  const filteredStudents = searchQuery
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students;

  // Filter badges
  const filteredBadges = searchQuery
    ? availableBadges.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableBadges;

  // Handle award
  const handleAward = async () => {
    if (!selectedStudent || !selectedBadge) return;

    const awarded = await awardBadge({
      studentId: selectedStudent.id,
      badgeId: selectedBadge.id,
      message: message.trim() || undefined,
    });

    if (awarded) {
      // Stay on confirm step to show success
    }
  };

  // Navigate between steps
  const goToStep = (newStep: typeof step) => {
    clearError();
    clearSuccess();
    setSearchQuery('');
    setStep(newStep);
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'student':
        return (
          <View className="flex-1">
            <View className="px-4 py-2">
              <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
                <Search size={18} className="text-muted-foreground" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search students..."
                  className="ml-2 flex-1 text-foreground"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <ScrollView className="flex-1 px-4">
              <View className="gap-2 pb-4">
                {filteredStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    selected={selectedStudent?.id === student.id}
                    onSelect={() => setSelectedStudent(student)}
                  />
                ))}
                {filteredStudents.length === 0 && (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground">No students found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        );

      case 'badge':
        return (
          <View className="flex-1">
            <View className="px-4 py-2">
              <View className="flex-row items-center rounded-lg bg-muted px-3 py-2">
                <Search size={18} className="text-muted-foreground" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search badges..."
                  className="ml-2 flex-1 text-foreground"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <ScrollView className="flex-1 px-4">
              <View className="gap-2 pb-4">
                {filteredBadges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    selected={selectedBadge?.id === badge.id}
                    onSelect={() => setSelectedBadge(badge)}
                  />
                ))}
                {filteredBadges.length === 0 && (
                  <View className="items-center py-8">
                    <Text className="text-muted-foreground">No badges found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        );

      case 'message':
        return (
          <View className="flex-1 px-4">
            <View className="mb-4 flex-row items-center gap-2">
              <MessageSquare size={18} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                Add a personalized message (optional)
              </Text>
            </View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Great work on completing the project! Your dedication really shows..."
              multiline
              numberOfLines={4}
              maxLength={500}
              className="min-h-[120px] rounded-xl bg-muted p-4 text-foreground"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/500
            </Text>
          </View>
        );

      case 'confirm':
        if (success) {
          return (
            <View className="flex-1 items-center justify-center px-4">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle size={40} color="#22c55e" />
              </View>
              <Text className="mb-2 text-xl font-bold text-foreground">Badge Awarded!</Text>
              <Text className="mb-6 text-center text-muted-foreground">
                {selectedStudent?.name} has been awarded the {selectedBadge?.name} badge.
              </Text>
              <Pressable onPress={onClose} className="rounded-xl bg-primary px-6 py-3">
                <Text className="font-medium text-primary-foreground">Done</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View className="flex-1 px-4">
            {/* Summary */}
            <View className="mb-4 rounded-xl bg-muted/50 p-4">
              <Text className="mb-3 text-sm font-medium text-muted-foreground">Award Summary</Text>

              {/* Student */}
              <View className="mb-3 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User size={20} className="text-muted-foreground" />
                </View>
                <View>
                  <Text className="text-xs text-muted-foreground">Student</Text>
                  <Text className="font-medium text-foreground">{selectedStudent?.name}</Text>
                </View>
              </View>

              {/* Badge */}
              {selectedBadge && (
                <View className="mb-3 flex-row items-center gap-3">
                  <View
                    className={cn(
                      'h-10 w-10 items-center justify-center rounded-full',
                      getRarityStyling(selectedBadge.rarity).bgColor
                    )}>
                    <Award size={20} className={getRarityStyling(selectedBadge.rarity).color} />
                  </View>
                  <View>
                    <Text className="text-xs text-muted-foreground">Badge</Text>
                    <Text className="font-medium text-foreground">{selectedBadge.name}</Text>
                  </View>
                </View>
              )}

              {/* Message */}
              {message && (
                <View className="border-t border-border pt-3">
                  <Text className="mb-1 text-xs text-muted-foreground">Message</Text>
                  <Text className="text-sm text-foreground">{message}</Text>
                </View>
              )}
            </View>

            {/* Error */}
            {error && (
              <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-destructive/10 p-3">
                <AlertCircle size={18} color="#ef4444" />
                <Text className="flex-1 text-destructive">{error}</Text>
              </View>
            )}

            {/* Award button */}
            <Pressable
              onPress={handleAward}
              disabled={loading}
              className={cn(
                'flex-row items-center justify-center gap-2 rounded-xl py-4',
                loading ? 'bg-primary/50' : 'bg-primary'
              )}>
              {loading ? (
                <Loader2 size={20} color="#fff" className="animate-spin" />
              ) : (
                <Gift size={20} color="#fff" />
              )}
              <Text className="font-semibold text-primary-foreground">
                {loading ? 'Awarding...' : 'Award Badge'}
              </Text>
            </Pressable>
          </View>
        );
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case 'student':
        return 'Select Student';
      case 'badge':
        return 'Select Badge';
      case 'message':
        return 'Add Message';
      case 'confirm':
        return success ? 'Success' : 'Confirm Award';
    }
  };

  // Can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 'student':
        return !!selectedStudent;
      case 'badge':
        return !!selectedBadge;
      case 'message':
        return true;
      case 'confirm':
        return false;
    }
  };

  // Go to next step
  const nextStep = () => {
    switch (step) {
      case 'student':
        goToStep('badge');
        break;
      case 'badge':
        goToStep('message');
        break;
      case 'message':
        goToStep('confirm');
        break;
    }
  };

  // Go to previous step
  const prevStep = () => {
    switch (step) {
      case 'badge':
        if (!preSelectedStudent) goToStep('student');
        break;
      case 'message':
        goToStep('badge');
        break;
      case 'confirm':
        if (!success) goToStep('message');
        break;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[90%] min-h-[60%] rounded-t-3xl bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
            <Pressable onPress={step === 'student' || success ? onClose : prevStep} className="p-2">
              {step === 'student' || success ? (
                <X size={24} className="text-foreground" />
              ) : (
                <Text className="text-primary">Back</Text>
              )}
            </Pressable>
            <Text className="text-lg font-semibold text-foreground">{getStepTitle()}</Text>
            {step !== 'confirm' ? (
              <Pressable onPress={nextStep} disabled={!canProceed()} className="p-2">
                <Text
                  className={cn(
                    'font-medium',
                    canProceed() ? 'text-primary' : 'text-muted-foreground'
                  )}>
                  Next
                </Text>
              </Pressable>
            ) : (
              <View className="w-12" />
            )}
          </View>

          {/* Progress dots */}
          {!success && (
            <View className="flex-row items-center justify-center gap-2 py-3">
              {(['student', 'badge', 'message', 'confirm'] as const).map((s, i) => (
                <View
                  key={s}
                  className={cn(
                    'h-2 w-2 rounded-full',
                    step === s
                      ? 'bg-primary'
                      : ['student', 'badge', 'message', 'confirm'].indexOf(step) > i
                        ? 'bg-primary/50'
                        : 'bg-muted'
                  )}
                />
              ))}
            </View>
          )}

          {/* Content */}
          {renderStepContent()}
        </View>
      </View>
    </Modal>
  );
}

export default InstructorBadgeAwardModal;
