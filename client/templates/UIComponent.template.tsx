/**
 * UI Component Template
 *
 * Use this template when creating new reusable UI components.
 *
 * Steps:
 * 1. Copy this file to components/ui/[component-name].tsx
 * 2. Rename the component
 * 3. Implement your component logic
 * 4. Add to components/ui/index.ts
 *
 * @example
 * components/ui/custom-button.tsx
 */

import * as React from 'react';
import { Pressable, type PressableProps, type PressableStateCallbackType } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/core';

/**
 * Component variants using class-variance-authority
 *
 * Define your component's visual variants here.
 */
const componentVariants = cva(
  // Base classes (always applied)
  'flex-row items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        outline: 'border border-border bg-transparent',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

/**
 * Component props interface
 *
 * Combine PressableProps with variant props and custom props.
 */
interface UIComponentProps
  extends Omit<PressableProps, 'children'>,
    VariantProps<typeof componentVariants> {
  /** Additional className for customization */
  className?: string;
  /** Whether component is loading */
  loading?: boolean;
  /** Icon to display (optional) */
  icon?: React.ReactNode;
  /** Children elements - can be ReactNode or function receiving press state */
  children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
}

/**
 * UI Component
 *
 * Brief description of what this component does.
 *
 * @example
 * ```tsx
 * <UIComponent variant="default" size="md">
 *   <Text>Click me</Text>
 * </UIComponent>
 * ```
 */
export const UIComponent = React.forwardRef<React.ElementRef<typeof Pressable>, UIComponentProps>(
  ({ variant, size, className, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        disabled={disabled || loading}
        className={cn(componentVariants({ variant, size }), disabled && 'opacity-50', className)}
        {...props}>
        {(state) => (
          <>
            {icon && <>{icon}</>}
            {typeof children === 'function' ? children(state) : children}
          </>
        )}
      </Pressable>
    );
  }
);

UIComponent.displayName = 'UIComponent';
