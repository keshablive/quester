import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import { Platform } from 'react-native';

/**
 * Label Component with nativeID support for accessibility
 *
 * Implements FR-005: Proper Label components with nativeID linking
 * Links to form inputs via aria-labelledby
 */
function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  nativeID,
  ...props
}: LabelPrimitive.TextProps &
  React.RefAttributes<LabelPrimitive.TextRef> & {
    nativeID?: string;
  }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex select-none flex-row items-center gap-2',
        Platform.select({
          web: 'cursor-default leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        }),
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}>
      <LabelPrimitive.Text
        className={cn(
          'text-sm font-medium text-foreground',
          Platform.select({ web: 'leading-none' }),
          className
        )}
        nativeID={nativeID}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
