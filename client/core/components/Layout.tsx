/**
 * Layout Components
 *
 * Reusable layout primitives to reduce className duplication
 * and provide consistent spacing throughout the application.
 *
 * These components wrap React Native's View with common layout patterns.
 *
 * @example
 * ```tsx
 * import { Row, Stack, Center, Container } from '@/core';
 *
 * <Stack gap={4}>
 *   <Row gap={2} justify="between">
 *     <Text>Left</Text>
 *     <Text>Right</Text>
 *   </Row>
 * </Stack>
 * ```
 */

import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../utils';

/**
 * Common layout component props
 */
interface LayoutProps extends ViewProps {
  /** Gap between children (Tailwind spacing scale) */
  gap?: number | string;
  /** Additional className for customization */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
}

/**
 * Row Component - Horizontal flex layout
 *
 * Arranges children in a horizontal row with optional gap and alignment.
 *
 * @param gap - Space between children (default: 2)
 * @param justify - Justify content ('start' | 'end' | 'center' | 'between' | 'around')
 * @param align - Align items ('start' | 'end' | 'center' | 'stretch')
 * @param wrap - Enable flex-wrap
 *
 * @example
 * ```tsx
 * <Row gap={3} justify="between" align="center">
 *   <Icon as={StarIcon} />
 *   <Text>Content</Text>
 *   <Button>Action</Button>
 * </Row>
 * ```
 */
export const Row = React.forwardRef<
  View,
  LayoutProps & {
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'end' | 'center' | 'stretch' | 'baseline';
    wrap?: boolean;
  }
>(({ gap = 2, justify = 'start', align = 'center', wrap = false, className, ...props }, ref) => {
  const justifyClass = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }[justify];

  const alignClass = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  }[align];

  return (
    <View
      ref={ref}
      className={cn(
        'flex-row',
        `gap-${gap}`,
        justifyClass,
        alignClass,
        wrap && 'flex-wrap',
        className
      )}
      {...props}
    />
  );
});

Row.displayName = 'Row';

/**
 * Stack Component - Vertical flex layout
 *
 * Arranges children in a vertical stack with optional gap and alignment.
 *
 * @param gap - Space between children (default: 4)
 * @param align - Align items ('start' | 'end' | 'center' | 'stretch')
 *
 * @example
 * ```tsx
 * <Stack gap={4} align="center">
 *   <Text>Title</Text>
 *   <Text>Description</Text>
 *   <Button>Action</Button>
 * </Stack>
 * ```
 */
export const Stack = React.forwardRef<
  View,
  LayoutProps & {
    align?: 'start' | 'end' | 'center' | 'stretch';
  }
>(({ gap = 4, align = 'stretch', className, ...props }, ref) => {
  const alignClass = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    stretch: 'items-stretch',
  }[align];

  return (
    <View ref={ref} className={cn('flex-col', `gap-${gap}`, alignClass, className)} {...props} />
  );
});

Stack.displayName = 'Stack';

/**
 * Center Component - Center content both horizontally and vertically
 *
 * Useful for full-screen centered content, empty states, loading indicators.
 *
 * @param flex - Use flex-1 (default: true)
 *
 * @example
 * ```tsx
 * <Center>
 *   <Spinner />
 *   <Text>Loading...</Text>
 * </Center>
 * ```
 */
export const Center = React.forwardRef<
  View,
  LayoutProps & {
    flex?: boolean;
  }
>(({ flex = true, className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('items-center justify-center', flex && 'flex-1', className)}
    {...props}
  />
));

Center.displayName = 'Center';

/**
 * Container Component - Constrained width container
 *
 * Provides consistent max-width containers for content.
 *
 * @param size - Container size ('sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full')
 * @param centered - Center the container horizontally
 * @param padding - Add horizontal padding
 *
 * @example
 * ```tsx
 * <Container size="md" centered padding>
 *   <Text>Constrained content</Text>
 * </Container>
 * ```
 */
export const Container = React.forwardRef<
  View,
  LayoutProps & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    centered?: boolean;
    padding?: boolean;
  }
>(({ size = 'md', centered = false, padding = false, className, ...props }, ref) => {
  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'w-full',
  }[size];

  return (
    <View
      ref={ref}
      className={cn('w-full', sizeClass, centered && 'mx-auto', padding && 'px-4', className)}
      {...props}
    />
  );
});

Container.displayName = 'Container';

/**
 * Grid Component - CSS Grid layout
 *
 * Creates a responsive grid layout with specified columns.
 *
 * @param cols - Number of columns (1-12)
 * @param gap - Gap between grid items
 *
 * @example
 * ```tsx
 * <Grid cols={3} gap={4}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * ```
 */
export const Grid = React.forwardRef<
  View,
  LayoutProps & {
    cols?: 1 | 2 | 3 | 4 | 6 | 12;
  }
>(({ cols = 2, gap = 4, className, ...props }, ref) => {
  const colClass = `grid-cols-${cols}`;

  return <View ref={ref} className={cn('grid', colClass, `gap-${gap}`, className)} {...props} />;
});

Grid.displayName = 'Grid';

/**
 * Spacer Component - Flexible spacing element
 *
 * Takes up available space between elements.
 *
 * @example
 * ```tsx
 * <Row>
 *   <Text>Left</Text>
 *   <Spacer />
 *   <Button>Right</Button>
 * </Row>
 * ```
 */
export const Spacer = React.forwardRef<View, Omit<LayoutProps, 'gap'>>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('flex-1', className)} {...props} />
  )
);

Spacer.displayName = 'Spacer';

/**
 * Divider Component - Visual separator with optional text
 *
 * Creates a horizontal line with optional centered text.
 *
 * @param label - Optional text label
 * @param orientation - 'horizontal' or 'vertical'
 *
 * @example
 * ```tsx
 * <Divider />
 * <Divider label="OR" />
 * ```
 */
export const Divider = React.forwardRef<
  View,
  LayoutProps & {
    label?: string;
    orientation?: 'horizontal' | 'vertical';
  }
>(({ label, orientation = 'horizontal', className, ...props }, ref) => {
  if (label) {
    return (
      <Row ref={ref} gap={2} align="center" className={cn('my-4', className)} {...props}>
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <View className="h-px flex-1 bg-border" />
      </Row>
    );
  }

  return (
    <View
      ref={ref}
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  );
});

Divider.displayName = 'Divider';

/**
 * Box Component - Generic container with common styles
 *
 * Flexible container with optional padding, border, and background.
 *
 * @param p - Padding (Tailwind scale)
 * @param rounded - Border radius
 * @param bordered - Add border
 *
 * @example
 * ```tsx
 * <Box p={4} rounded bordered>
 *   <Text>Boxed content</Text>
 * </Box>
 * ```
 */
export const Box = React.forwardRef<
  View,
  LayoutProps & {
    p?: number | string;
    rounded?: boolean | string;
    bordered?: boolean;
  }
>(({ p, rounded = false, bordered = false, className, ...props }, ref) => {
  const paddingClass = p ? `p-${p}` : undefined;
  const roundedClass = rounded === true ? 'rounded-lg' : rounded || undefined;

  return (
    <View
      ref={ref}
      className={cn(paddingClass, roundedClass, bordered && 'border border-border', className)}
      {...props}
    />
  );
});

Box.displayName = 'Box';

// Prevent Text import error by using a simple helper
const Text = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const RNText = require('react-native').Text;
  return <RNText className={className}>{children}</RNText>;
};
