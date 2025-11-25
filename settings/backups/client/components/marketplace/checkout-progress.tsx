import React from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { CheckoutState } from '@/lib/types/marketplace';

interface CheckoutProgressProps {
  currentStep: CheckoutState['step'];
  className?: string;
}

const steps = [
  { key: 'review', label: 'Review', number: 1 },
  { key: 'payment', label: 'Payment', number: 2 },
  { key: 'confirm', label: 'Confirm', number: 3 },
] as const;

export const CheckoutProgress = React.memo<CheckoutProgressProps>(({ currentStep, className }) => {
  // Don't show progress for processing/success steps
  if (currentStep === 'processing' || currentStep === 'success') {
    return null;
  }

  const currentStepNumber = steps.findIndex((s) => s.key === currentStep) + 1;

  return (
    <View
      className={cn('py-4', className)}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStepNumber} of ${steps.length}`}
      accessibilityValue={{ min: 0, max: steps.length, now: currentStepNumber }}>
      {/* Step Indicators */}
      <View className="mb-2 flex-row items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStepNumber > step.number;
          const isCurrent = currentStepNumber === step.number;
          const isUpcoming = currentStepNumber < step.number;

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <View className="items-center gap-2">
                <View
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full border-2',
                    isCompleted && 'border-primary bg-primary',
                    isCurrent && 'border-primary bg-primary/10',
                    isUpcoming && 'border-muted bg-background'
                  )}
                  testID={`step-indicator-${step.key}`}
                  accessibilityLabel={
                    isCompleted
                      ? `Step ${step.number}: ${step.label}, completed`
                      : isCurrent
                        ? `Step ${step.number}: ${step.label}, current step`
                        : `Step ${step.number}: ${step.label}, upcoming`
                  }>
                  {isCompleted ? (
                    <Check size={20} color="white" />
                  ) : (
                    <Text
                      className={cn(
                        'text-lg font-bold',
                        isCurrent && 'text-primary',
                        isUpcoming && 'text-muted-foreground'
                      )}>
                      {step.number}
                    </Text>
                  )}
                </View>

                {/* Step Label */}
                <Text
                  className={cn(
                    'text-center text-xs',
                    (isCompleted || isCurrent) && 'font-semibold',
                    isUpcoming && 'text-muted-foreground'
                  )}>
                  {step.label}
                </Text>
              </View>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <View
                  className={cn('mx-2 h-0.5 flex-1', isCompleted ? 'bg-primary' : 'bg-muted')}
                  testID={`connector-${index}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Progress Text */}
      <Text
        className="mt-2 text-center text-sm text-muted-foreground"
        accessibilityLiveRegion="polite">
        Step {currentStepNumber} of {steps.length}
      </Text>
    </View>
  );
});

CheckoutProgress.displayName = 'CheckoutProgress';
