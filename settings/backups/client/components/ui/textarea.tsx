import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';

/**
 * Textarea Component
 *
 * Implements FR-008: ARIA attributes (aria-labelledby, aria-invalid, aria-describedby, aria-required)
 * Implements WCAG 3.3.1 Error Identification, 3.3.2 Labels or Instructions
 */
function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }), // On web, numberOfLines also determines initial height. On native, it determines the maximum height.
  placeholderClassName,
  ...props
}: TextInputProps &
  React.RefAttributes<TextInput> & {
    'aria-labelledby'?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-required'?: boolean;
  }) {
  return (
    <TextInput
      className={cn(
        'flex min-h-16 w-full flex-row rounded-md border border-input bg-transparent px-3 py-2 text-base text-foreground shadow-sm shadow-black/5 dark:bg-input/30 md:text-sm',
        Platform.select({
          web: 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed',
        }),
        props.editable === false && 'opacity-50',
        className
      )}
      placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...(Platform.OS === 'web'
        ? {
            'aria-labelledby': props['aria-labelledby'],
            'aria-invalid': props['aria-invalid'],
            'aria-describedby': props['aria-describedby'],
            'aria-required': props['aria-required'],
          }
        : {
            accessibilityLabelledBy: props['aria-labelledby'],
          })}
      {...props}
    />
  );
}

export { Textarea };
