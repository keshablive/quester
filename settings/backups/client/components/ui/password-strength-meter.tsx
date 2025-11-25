/**
 * Password Strength Meter Component
 *
 * Displays a visual indicator of password strength based on multiple criteria:
 * - Length (min 8 characters)
 * - Uppercase letters
 * - Lowercase letters
 * - Numbers
 * - Special characters
 *
 * Accessibility:
 * Implements FR-007: accessibilityLabel for screen reader announcements
 * Implements WCAG 3.3.2: Labels or Instructions for password requirements
 */

import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import * as React from 'react';

export interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | '';
  color: string;
  criteria: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface PasswordStrengthMeterProps {
  password: string;
  showCriteria?: boolean;
}

/**
 * Calculate password strength
 */
const calculateStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: 'transparent',
      criteria: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    };
  }

  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // Calculate score (0-5)
  const score = Object.values(criteria).filter(Boolean).length;

  // Determine label and color
  let label: PasswordStrength['label'];
  let color: string;

  if (score === 0) {
    label = '';
    color = 'transparent';
  } else if (score === 1) {
    label = 'Very Weak';
    color = '#ef4444'; // red-500
  } else if (score === 2) {
    label = 'Weak';
    color = '#f97316'; // orange-500
  } else if (score === 3) {
    label = 'Fair';
    color = '#eab308'; // yellow-500
  } else if (score === 4) {
    label = 'Good';
    color = '#84cc16'; // lime-500
  } else {
    label = 'Strong';
    color = '#22c55e'; // green-500
  }

  return { score, label, color, criteria };
};

export function PasswordStrengthMeter({
  password,
  showCriteria = true,
}: PasswordStrengthMeterProps) {
  const strength = calculateStrength(password);

  if (!password) {
    return null;
  }

  const accessibilityLabel = `Password strength: ${strength.label}. ${strength.score} out of 5 criteria met.`;

  return (
    <View className="gap-2" accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar">
      {/* Strength Bars */}
      <View className="flex-row gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            className="h-1.5 flex-1 rounded-full bg-muted"
            style={{
              backgroundColor: level <= strength.score ? strength.color : undefined,
            }}
          />
        ))}
      </View>

      {/* Strength Label */}
      {strength.label && (
        <Text variant="small" className="font-medium" style={{ color: strength.color }}>
          {strength.label}
        </Text>
      )}

      {/* Criteria Checklist */}
      {showCriteria && (
        <View className="gap-1">
          <CriteriaItem met={strength.criteria.length} label="At least 8 characters" />
          <CriteriaItem met={strength.criteria.uppercase} label="One uppercase letter" />
          <CriteriaItem met={strength.criteria.lowercase} label="One lowercase letter" />
          <CriteriaItem met={strength.criteria.number} label="One number" />
          <CriteriaItem met={strength.criteria.special} label="One special character" />
        </View>
      )}
    </View>
  );
}

interface CriteriaItemProps {
  met: boolean;
  label: string;
}

function CriteriaItem({ met, label }: CriteriaItemProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="h-3.5 w-3.5 items-center justify-center rounded-full"
        style={{
          backgroundColor: met ? '#22c55e' : '#e5e7eb', // green-500 or gray-200
        }}>
        {met && <Text className="text-[10px] font-bold text-white">✓</Text>}
      </View>
      <Text
        variant="small"
        style={{
          color: met ? '#22c55e' : '#6b7280', // green-500 or gray-500
        }}>
        {label}
      </Text>
    </View>
  );
}
