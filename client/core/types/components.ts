/**
 * Component Type Definitions
 * 
 * Base types and interfaces for React components.
 * 
 * @example
 * ```tsx
 * import { BaseComponentProps, IconProps } from '@/core/types';
 * 
 * interface MyComponentProps extends BaseComponentProps {
 *   title: string;
 * }
 * ```
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ViewProps, TextProps as RNTextProps } from 'react-native';

/**
 * Base props shared by all components
 */
export interface BaseComponentProps extends ViewProps {
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testID?: string;
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * Icon component props
 */
export interface IconProps extends BaseComponentProps {
  /** Lucide icon component */
  as: LucideIcon;
  /** Icon size in pixels */
  size?: number;
  /** Icon color (CSS color or Tailwind class) */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
}

/**
 * Button variant types
 */
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

/**
 * Button size types
 */
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'elevated' | 'outline';

/**
 * Badge variant types
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Alert variant types
 */
export type AlertVariant = 'default' | 'destructive';

/**
 * Input size types
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Component with children
 */
export interface WithChildren {
  children?: React.ReactNode;
}

/**
 * Component with className
 */
export interface WithClassName {
  className?: string;
}

/**
 * Component with optional loading state
 */
export interface WithLoading {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Component with optional disabled state
 */
export interface WithDisabled {
  disabled?: boolean;
}

/**
 * Component with optional error state
 */
export interface WithError {
  error?: string | boolean;
  errorMessage?: string;
}

/**
 * Polymorphic component props
 * Allows component to be rendered as different element types
 */
export type PolymorphicProps<T extends React.ElementType> = {
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as'>;

/**
 * Render prop pattern
 */
export type RenderProp<T> = (props: T) => React.ReactNode;

/**
 * Component ref types
 */
export type ComponentRef<T> = React.RefObject<T> | React.MutableRefObject<T> | null;

/**
 * Form field props
 */
export interface FormFieldProps extends BaseComponentProps {
  /** Field name */
  name: string;
  /** Field label */
  label?: string;
  /** Field placeholder */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Field value */
  value?: any;
  /** Change handler */
  onChange?: (value: any) => void;
  /** Blur handler */
  onBlur?: () => void;
}

/**
 * Modal/Dialog props
 */
export interface ModalProps extends BaseComponentProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Dropdown/Select option
 */
export interface SelectOption<T = any> {
  /** Option value */
  value: T;
  /** Option label */
  label: string;
  /** Option icon */
  icon?: LucideIcon;
  /** Whether option is disabled */
  disabled?: boolean;
  /** Additional option data */
  data?: any;
}

/**
 * Tab item
 */
export interface TabItem {
  /** Tab value/id */
  value: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: LucideIcon;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Tab badge content */
  badge?: string | number;
}

/**
 * List item data
 */
export interface ListItem<T = any> {
  /** Item ID */
  id: string | number;
  /** Item data */
  data: T;
  /** Whether item is selected */
  selected?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
}

/**
 * Avatar props
 */
export interface AvatarData {
  /** User/entity name */
  name: string;
  /** Avatar image URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Fallback text (initials) */
  fallback?: string;
}
