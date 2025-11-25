// Feature 003: Component Props Types

import { AccessibilityProps as RNAccessibilityProps } from 'react-native';

export interface BaseComponentProps extends RNAccessibilityProps {
  testID?: string;
  className?: string;
  style?: any;
}

export interface CardComponentProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: {
    text: string;
    variant: 'default' | 'success' | 'warning' | 'error';
  };
  onPress?: () => void;
}

export interface ButtonComponentProps extends BaseComponentProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface ModalComponentProps extends BaseComponentProps {
  visible: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface SkeletonProps extends BaseComponentProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  animated?: boolean;
}

export interface BadgeProps extends BaseComponentProps {
  count: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  showZero?: boolean;
  max?: number;
}
