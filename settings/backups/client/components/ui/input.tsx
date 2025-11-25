import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  /**
   * aria-labelledby: ID of element that labels this input
   * Links to Label component via nativeID (FR-008)
   */
  'aria-labelledby'?: string;

  /**
   * aria-invalid: Indicates validation error state
   * Required for error states (FR-008, WCAG 3.3.1)
   */
  'aria-invalid'?: boolean;

  /**
   * aria-describedby: ID of element describing this input
   * Links to error/help text (FR-008, WCAG 3.3.1, 3.3.2)
   */
  'aria-describedby'?: string;

  /**
   * aria-required: Indicates required field
   */
  'aria-required'?: boolean;
}

/**
 * Input Component with ARIA attributes
 *
 * Implements FR-008: Form inputs with aria-labelledby, aria-invalid, aria-describedby
 * Supports WCAG 3.3.1 (Error Identification) and 3.3.2 (Labels or Instructions)
 */
function Input({
  className,
  placeholderClassName,
  ...props
}: InputProps & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'flex h-10 w-full min-w-0 flex-row items-center rounded-md border border-input bg-background px-3 py-1 text-base leading-5 text-foreground shadow-sm shadow-black/5 dark:bg-input/30 sm:h-9',
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
          ),
        Platform.select({
          web: cn(
            'outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground md:text-sm',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className
      )}
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

export { Input };
