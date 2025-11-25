/**
 * Skeleton Component
 *
 * Decorative loading placeholder - uses aria-hidden pattern
 * Implements WCAG 4.1.2 for assistive technology (skeleton not announced)
 */
import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View
      className={cn('animate-pulse rounded-md bg-accent', className)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
    />
  );
}

export { Skeleton };
