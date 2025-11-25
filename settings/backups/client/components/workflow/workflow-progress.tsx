import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Trophy, BookOpen, ShoppingBag, Users, CheckCircle, Award } from 'lucide-react-native';
import { useAccessibility, formatAccessibleNumber } from '@/lib/hooks/use-accessibility';

interface WorkflowStep {
  id: string;
  label: string;
  featureType: 'quests' | 'learning' | 'marketplace' | 'social' | 'certificates';
  status: 'completed' | 'current' | 'upcoming';
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  layout?: 'horizontal' | 'vertical';
  variant?: 'default' | 'compact';
  showProgressBar?: boolean;
  showPercentage?: boolean;
  showFeatureIcons?: boolean;
  showConnectors?: boolean;
}

const FEATURE_ICONS = {
  quests: Trophy,
  learning: BookOpen,
  marketplace: ShoppingBag,
  social: Users,
  certificates: Award,
};

export default function WorkflowProgress({
  steps = [],
  layout = 'horizontal',
  variant = 'default',
  showProgressBar = false,
  showPercentage = false,
  showFeatureIcons = false,
  showConnectors = true,
}: WorkflowProgressProps) {
  // Accessibility hook
  const { isScreenReaderEnabled } = useAccessibility();

  if (steps.length === 0) {
    return (
      <View className="items-center justify-center p-6">
        <Text variant="small" className="text-gray-500">
          No workflow steps available
        </Text>
      </View>
    );
  }

  const completedSteps = steps.filter((step) => step.status === 'completed').length;
  const percentComplete = Math.round((completedSteps / steps.length) * 100);

  // Build accessible description for screen readers
  const accessibleDescription = isScreenReaderEnabled
    ? `${formatAccessibleNumber(completedSteps)} of ${formatAccessibleNumber(steps.length)} steps completed. ${percentComplete} percent complete`
    : `${completedSteps} of ${steps.length} steps completed`;

  return (
    <View
      testID="workflow-progress-container"
      accessibilityRole="progressbar"
      accessibilityLabel={accessibleDescription}
      accessibilityValue={{ now: percentComplete, min: 0, max: 100 }}>
      {/* Progress Bar */}
      {showProgressBar && (
        <View className="mb-4" testID="workflow-progress-bar">
          <View className="h-2 overflow-hidden rounded bg-gray-600">
            <View className="h-full bg-blue-500" style={{ width: `${percentComplete}%` }} />
          </View>
        </View>
      )}

      {/* Percentage Text */}
      {showPercentage && (
        <Text variant="small" className="mb-4 text-center font-semibold text-blue-500">
          {percentComplete}% Complete
        </Text>
      )}

      {/* Steps Container */}
      <View
        testID="workflow-steps-container"
        className={`items-center ${
          layout === 'horizontal' ? 'flex-row justify-between' : 'flex-col items-start'
        }`}
        style={[
          {
            flexDirection: layout === 'horizontal' ? 'row' : 'column',
          },
        ]}>
        {steps.map((step, index) => {
          const IconComponent = FEATURE_ICONS[step.featureType];
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <React.Fragment key={step.id}>
              {/* Step Item */}
              <View
                className={`items-center ${
                  layout === 'horizontal' ? 'flex-1' : 'w-full flex-row items-center'
                }`}>
                {/* Step Indicator */}
                <View
                  testID={`step-indicator-${step.id}`}
                  className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? 'border-green-500 bg-green-500'
                      : isCurrent
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-600 bg-gray-600'
                  }`}
                  accessibilityState={{ selected: isCurrent }}
                  accessibilityLabel={`${step.label} - ${step.status === 'completed' ? 'Completed' : step.status === 'current' ? 'Current' : 'Upcoming'}`}>
                  {isCompleted ? (
                    <CheckCircle size={20} color="#ffffff" />
                  ) : showFeatureIcons ? (
                    <IconComponent size={20} color={isCurrent ? '#ffffff' : '#718096'} />
                  ) : (
                    <Text
                      className={`text-base font-semibold ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Step Label */}
                {variant === 'default' && (
                  <View className="mt-2 items-center">
                    <Text
                      className={`text-center text-xs ${
                        isCurrent
                          ? 'font-semibold text-blue-500'
                          : isCompleted
                            ? 'text-green-500'
                            : 'text-gray-500'
                      }`}>
                      {step.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Connector */}
              {showConnectors && index < steps.length - 1 && (
                <View
                  testID={`step-connector-${index}`}
                  className={`${
                    layout === 'horizontal' ? 'mx-2 h-0.5 flex-1' : 'ml-[19px] h-6 w-0.5'
                  } ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
