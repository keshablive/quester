# UI Components Accessibility Documentation

This document describes the accessibility features implemented in all 32 UI components.

**Last Updated:** December 2024  
**WCAG Level:** AA (2.1)  
**Compliance:** FR-006 to FR-010, FR-031

---

## Overview

All components in `client/components/ui/` follow React Native Reusables patterns and implement WCAG 2.1 Level AA accessibility standards. This includes:

- **Explicit Accessibility Roles** (FR-006): All interactive components have `accessibilityRole`
- **Screen Reader Labels** (FR-007): Images and non-text content have `accessibilityLabel`
- **Form Input ARIA** (FR-008): Inputs support `aria-labelledby`, `aria-invalid`, `aria-describedby`, `aria-required`
- **Interaction Hints** (FR-009): Complex interactions have `accessibilityHint`
- **Navigation State** (FR-010): Navigation components announce state (selected, expanded, etc.)
- **Color Contrast** (FR-031): 4.5:1 for normal text, 3:1 for large text/UI components

---

## Interactive Components

### Accordion (`accordion.tsx`)

**Accessibility Features:**
- `accessibilityRole="button"` on `AccordionTrigger`
- `accessibilityState={{ expanded: isExpanded }}` announces open/closed state
- Chevron icon rotates to indicate state visually

**Screen Reader Announcement:**
- "Button, [trigger text], expanded/collapsed"

**Usage:**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger accessibilityLabel="Show more details">
      What is accessibility?
    </AccordionTrigger>
    <AccordionContent>
      Accessibility ensures all users can use your app.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### Avatar (`avatar.tsx`)

**Accessibility Features:**
- `accessibilityLabel` on `AvatarImage` with fallback to "Avatar image"
- Fallback text announced for `AvatarFallback`

**Screen Reader Announcement:**
- "Image, [user name]'s avatar" or "Avatar image"

**Usage:**
```tsx
<Avatar>
  <AvatarImage 
    source={{ uri: user.avatar }} 
    accessibilityLabel={`${user.name}'s avatar`} 
  />
  <AvatarFallback>
    <Text>JD</Text>
  </AvatarFallback>
</Avatar>
```

---

### Badge (`badge.tsx`)

**Accessibility Features:**
- Text wrapping via `TextClassContext` ensures text is announced
- Decorative badges can be marked with `accessibilityElementsHidden`

**Screen Reader Announcement:**
- "[badge text]" (e.g., "New", "3 unread")

**Usage:**
```tsx
<Badge variant="default">
  <Text>New</Text>
</Badge>
```

---

### Button (`button.tsx`)

**Accessibility Features:**
- `accessibilityRole="button"` inherited from @rn-primitives/slot
- `TextClassContext` ensures child Text is announced
- Disabled state via `accessibilityState={{ disabled: true }}`

**Screen Reader Announcement:**
- "Button, [button text], disabled" (if disabled)

**Usage:**
```tsx
<Button 
  onPress={handleSubmit} 
  disabled={isSubmitting}
  accessibilityHint="Submits the form"
>
  <Text>Submit</Text>
</Button>
```

---

### Card (`card.tsx`)

**Accessibility Features:**
- Composition pattern: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- CardTitle uses semantic heading role on web
- CardDescription uses descriptive text role

**Screen Reader Announcement:**
- "[title], [description], [content]"

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Course Name</CardTitle>
    <CardDescription>Learn React Native accessibility</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>Content here...</Text>
  </CardContent>
</Card>
```

---

### Checkbox (`checkbox.tsx`)

**Accessibility Features:**
- `accessibilityRole="checkbox"`
- `accessibilityState={{ checked: props.checked, disabled: props.disabled }}`
- `hitSlop={24}` ensures 44x44dp touch target (WCAG 2.5.5)

**Screen Reader Announcement:**
- "Checkbox, [label], checked/unchecked, disabled" (if applicable)

**Usage:**
```tsx
<View className="flex-row items-center gap-2">
  <Checkbox 
    checked={agreed} 
    onCheckedChange={setAgreed}
    nativeID="terms-checkbox"
  />
  <Label 
    nativeID="terms-label" 
    onPress={() => setAgreed(!agreed)}
  >
    I agree to the terms
  </Label>
</View>
```

---

### Collapsible (`collapsible.tsx`)

**Accessibility Features:**
- `accessibilityRole="button"` on `CollapsibleTrigger` (handled by @rn-primitives)
- `accessibilityState={{ expanded }}` announces state

**Screen Reader Announcement:**
- "Button, [trigger text], expanded/collapsed"

---

### Context Menu (`context-menu.tsx`)

**Accessibility Features:**
- `accessibilityRole="menu"` on content (handled by @rn-primitives)
- Keyboard navigation: Arrow keys, Enter, Escape
- Focus management on open/close

**Screen Reader Announcement:**
- "Menu, [item text], menu item"

**Usage:**
```tsx
<ContextMenu>
  <ContextMenuTrigger>
    <Text>Long press me</Text>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onSelect={handleEdit}>
      <Text>Edit</Text>
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

### Dialog (`dialog.tsx`)

**Accessibility Features:**
- `accessibilityRole="dialog"` on content (handled by @rn-primitives)
- Focus trap within dialog (WCAG 2.4.3)
- `aria-modal` on web
- Close button with `accessibilityLabel="Close"`

**Screen Reader Announcement:**
- "Dialog, [title], [description]"

**Usage:**
```tsx
<Dialog>
  <DialogTrigger>
    <Button>
      <Text>Open Dialog</Text>
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogDescription>Are you sure you want to proceed?</DialogDescription>
    <DialogFooter>
      <Button variant="outline">
        <Text>Cancel</Text>
      </Button>
      <Button>
        <Text>Confirm</Text>
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Dropdown Menu (`dropdown-menu.tsx`)

**Accessibility Features:**
- `accessibilityRole="menu"` on content (handled by @rn-primitives)
- Keyboard navigation: Arrow keys, Enter, Escape
- `aria-haspopup`, `aria-expanded` on trigger

**Screen Reader Announcement:**
- "Button, [trigger text], has popup, expanded/collapsed"

---

### Hover Card (`hover-card.tsx`)

**Accessibility Features:**
- `accessibilityHint` for hover interactions (FR-009)
- `aria-haspopup`, `aria-expanded` on trigger (handled by @rn-primitives)

**Usage:**
```tsx
<HoverCard>
  <HoverCardTrigger 
    accessibilityHint="Shows user profile on hover"
  >
    <Text>@username</Text>
  </HoverCardTrigger>
  <HoverCardContent>
    <Text>User profile details...</Text>
  </HoverCardContent>
</HoverCard>
```

---

### Icon (`icon.tsx`)

**Accessibility Features:**
- `accessibilityLabel` for decorative vs informative icons
- `aria-hidden={true}` for decorative icons

**Screen Reader Announcement:**
- "[icon description]" or silent (if decorative)

**Usage:**
```tsx
{/* Decorative icon (silent) */}
<Icon as={ChevronRight} aria-hidden={true} />

{/* Informative icon (announced) */}
<Icon 
  as={AlertCircle} 
  accessibilityLabel="Error" 
  className="text-destructive" 
/>
```

---

### Input (`input.tsx`)

**Accessibility Features:**
- `aria-labelledby`: Links to Label via `nativeID` (FR-008)
- `aria-invalid`: Indicates validation error (WCAG 3.3.1)
- `aria-describedby`: Links to error/help text (WCAG 3.3.2)
- `aria-required`: Indicates required field
- Platform-specific handling (web uses ARIA, native uses accessibilityLabelledBy)

**Screen Reader Announcement:**
- "[label], text field, [value], invalid" (if error)

**Usage:**
```tsx
<View>
  <Label nativeID="email-label">Email</Label>
  <Input
    aria-labelledby="email-label"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
    aria-required
    value={email}
    onChangeText={setEmail}
  />
  {errors.email && (
    <Text nativeID="email-error" className="text-destructive">
      {errors.email}
    </Text>
  )}
</View>
```

---

### Label (`label.tsx`)

**Accessibility Features:**
- `nativeID` prop links to Input's `aria-labelledby` (FR-005)
- Pressable to trigger associated input focus

**Usage:**
```tsx
<Label nativeID="password-label" onPress={() => inputRef.current?.focus()}>
  Password
</Label>
<Input 
  ref={inputRef}
  aria-labelledby="password-label" 
  secureTextEntry 
/>
```

---

### Menubar (`menubar.tsx`)

**Accessibility Features:**
- `accessibilityRole="menubar"` on root (FR-010)
- Keyboard navigation: Arrow keys, Enter, Escape
- Roving tabindex for focus management

**Screen Reader Announcement:**
- "Menubar, [menu item], has popup"

---

### Popover (`popover.tsx`)

**Accessibility Features:**
- `aria-hidden` management for overlay (FR-009)
- `aria-haspopup`, `aria-expanded` on trigger
- Focus trap within popover

**Screen Reader Announcement:**
- "Button, [trigger text], has popup, expanded/collapsed"

---

### Progress (`progress.tsx`)

**Accessibility Features:**
- `accessibilityRole="progressbar"` (FR-006)
- `accessibilityValue={{ now, min, max }}` announces progress percentage

**Screen Reader Announcement:**
- "Progress bar, 50 percent complete"

**Usage:**
```tsx
<Progress 
  value={uploadProgress} 
  accessibilityLabel="Upload progress" 
/>
```

---

### Radio Group (`radio-group.tsx`)

**Accessibility Features:**
- `accessibilityRole="radio"` on `RadioGroupItem` (FR-006)
- Group managed by @rn-primitives

**Screen Reader Announcement:**
- "Radio button, [label], selected/not selected"

**Usage:**
```tsx
<RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
  <View className="flex-row items-center gap-2">
    <RadioGroupItem value="option1" nativeID="option1" />
    <Label nativeID="option1-label">Option 1</Label>
  </View>
</RadioGroup>
```

---

### Select (`select.tsx`)

**Accessibility Features:**
- `accessibilityRole="combobox"` on `SelectTrigger` (FR-006)
- `aria-expanded`, `aria-haspopup` handled by @rn-primitives

**Screen Reader Announcement:**
- "Combobox, [selected value], has popup, expanded/collapsed"

---

### Separator (`separator.tsx`)

**Accessibility Features:**
- `accessibilityRole="separator"` (handled by @rn-primitives)
- `decorative` prop determines if announced (default: true)

**Screen Reader Announcement:**
- Silent (if decorative) or "Separator"

---

### Skeleton (`skeleton.tsx`)

**Accessibility Features:**
- `accessibilityElementsHidden` hides from screen readers
- `importantForAccessibility="no-hide-descendants"` (Android)
- Decorative loading placeholder (WCAG 4.1.2)

**Screen Reader Announcement:**
- Silent (skeleton is decorative)

---

### Switch (`switch.tsx`)

**Accessibility Features:**
- `accessibilityRole="switch"` (FR-006)
- `accessibilityState={{ checked, disabled }}`

**Screen Reader Announcement:**
- "Switch, [label], on/off, disabled" (if applicable)

**Usage:**
```tsx
<View className="flex-row items-center justify-between">
  <Label>Enable notifications</Label>
  <Switch checked={enabled} onCheckedChange={setEnabled} />
</View>
```

---

### Tabs (`tabs.tsx`)

**Accessibility Features:**
- `accessibilityRole="tab"` on `TabsTrigger` (FR-006, FR-010)
- `accessibilityState={{ selected, disabled }}` announces active tab

**Screen Reader Announcement:**
- "Tab, [tab label], selected/not selected"

**Usage:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">
      <Text>Tab 1</Text>
    </TabsTrigger>
    <TabsTrigger value="tab2">
      <Text>Tab 2</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <Text>Tab 1 content</Text>
  </TabsContent>
</Tabs>
```

---

### Text (`text.tsx`)

**Accessibility Features:**
- Semantic variants: `h1`, `h2`, `h3`, `h4`, `p`, `lead`, `large`, `small`, `muted`, `code`, `blockquote`
- `accessibilityRole="header"` for heading variants (FR-003)
- Proper text hierarchy for screen readers

**Screen Reader Announcement:**
- "Heading level 1, [text]" (for h1)
- "[text]" (for p, span)

---

### Textarea (`textarea.tsx`)

**Accessibility Features:**
- Same ARIA support as `Input` (FR-008)
- `aria-labelledby`, `aria-invalid`, `aria-describedby`, `aria-required`
- Platform-specific handling

**Screen Reader Announcement:**
- "[label], text area, multiline, [value], invalid" (if error)

---

### Toggle (`toggle.tsx`)

**Accessibility Features:**
- `accessibilityRole="button"` (FR-006)
- `accessibilityState={{ checked: pressed, disabled }}`

**Screen Reader Announcement:**
- "Toggle button, [label], pressed/not pressed, disabled" (if applicable)

---

### Toggle Group (`toggle-group.tsx`)

**Accessibility Features:**
- `accessibilityRole="radiogroup"` on root (FR-006)
- Individual toggles use `accessibilityRole="button"`

**Screen Reader Announcement:**
- "Radio group, [item], selected/not selected"

---

### Tooltip (`tooltip.tsx`)

**Accessibility Features:**
- `accessibilityHint` for complex interactions (FR-009)
- Content auto-announces on trigger hover/focus

**Screen Reader Announcement:**
- "[trigger], [tooltip content]"

**Usage:**
```tsx
<Tooltip>
  <TooltipTrigger accessibilityHint="Shows help text">
    <Icon as={HelpCircle} />
  </TooltipTrigger>
  <TooltipContent>
    <Text>This is helpful information</Text>
  </TooltipContent>
</Tooltip>
```

---

### Password Strength Meter (`password-strength-meter.tsx`)

**Accessibility Features:**
- `accessibilityRole="progressbar"` (FR-006)
- `accessibilityLabel` announces strength level (FR-007)
- Live region updates on password change

**Screen Reader Announcement:**
- "Password strength: Strong. 5 out of 5 criteria met."

**Usage:**
```tsx
<PasswordStrengthMeter 
  password={password} 
  showCriteria 
/>
```

---

### Native Only Animated View (`native-only-animated-view.tsx`)

**Accessibility Features:**
- Accessibility props inherited from `Animated.View`
- Platform-specific animation (native only, static on web)

---

## Testing Accessibility

### Screen Reader Testing

**iOS (VoiceOver):**
1. Settings → Accessibility → VoiceOver → Enable
2. Triple-click home button to toggle
3. Swipe right/left to navigate
4. Double-tap to activate

**Android (TalkBack):**
1. Settings → Accessibility → TalkBack → Enable
2. Volume keys shortcut to toggle
3. Swipe right/left to navigate
4. Double-tap to activate

### Automated Testing

```bash
# Run accessibility linting
npm run lint:a11y

# Fix auto-fixable violations
npm run lint:a11y:fix

# Validate color contrast
npm run validate:contrast

# Visual regression tests
npm run visual:test -- --mode=both --platform=both
```

---

## Component Showcase (Phase 6, T182)

### Accessing the Showcase

The Component Showcase is a developer tool for browsing all 28 UI components with live examples, code snippets, and accessibility documentation.

**Activation:**
1. Open the app and navigate to **Settings**
2. Scroll to **About** section
3. Tap the **App Version** number **10 times rapidly** (within 3 seconds)
4. Developer mode will activate (green indicator appears)
5. Navigate to **Developer Tools → Component Showcase**

**Alternative Access (Development Only):**
- Developer mode is automatically enabled in `__DEV__` mode
- Go to Settings → Developer Tools → Component Showcase

### Showcase Features

**Live Preview Tab:**
- Interactive component examples with all variants
- Variant selector for exploring different states
- Real-time rendering in your app's theme

**Code Tab:**
- Copy-paste ready TypeScript/TSX code snippets
- Import statements included
- Shows proper component usage with props

**Accessibility Tab:**
- 8 accessibility notes per component
- WCAG 2.1 Level AA compliance badge
- Screen reader usage examples
- Keyboard navigation guidance
- Touch target size requirements
- Color contrast information

**Component Coverage:**
- ✅ 28 UI components documented
- ✅ 5-12 variants per component
- ✅ 100% accessibility documentation
- ✅ All code snippets tested and validated

### Showcase Navigation

**Category Filter:**
- **All**: Show all 28 components
- **Form**: Input, Select, Checkbox, Radio, Switch, etc.
- **Navigation**: Tabs, Menubar, etc.
- **Feedback**: Dialog, Alert, Toast, Progress, etc.
- **Display**: Card, Badge, Avatar, Separator, etc.
- **Overlay**: Popover, Tooltip, HoverCard, etc.

**Search:**
- Type component name to filter (e.g., "button", "card", "input")
- Search is case-insensitive and matches partial names

### Using Showcase Code Snippets

All code snippets in the showcase are production-ready. Copy them directly into your components:

```tsx
// Example: Button from showcase
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function MyComponent() {
  return (
    <Button variant="default" size="default">
      <Text>Click Me</Text>
    </Button>
  );
}
```

**Imports are always included** in the Code tab, so you can copy the entire snippet.

### Developer Tools Integration

The Component Showcase is part of the Developer Tools menu:

- **Component Showcase** (T159-T171): Browse UI components
- **Performance Metrics** (T172): View render times and FPS
- **Accessibility Audit** (T173): Scan for accessibility violations
- **Error Logs** (T175): View application errors with stack traces

**Developer Settings** (T174):
- **Verbose Logging**: Detailed console output
- **Component Lifecycle Logging**: Track mount/update/unmount
- **Performance Overlay**: Real-time FPS display
- **Accessibility Overlay**: Highlight violations

### Platform Support

**Web:**
- All 28 components render correctly
- Platform-specific fallbacks for native-only features
- Examples: maps, secure-store, etc.

**iOS/Android:**
- Full native component functionality
- Additional native-only components visible (12 components)
- Total: 28 components (16 web-safe + 12 native-only)

### Data Structure

Showcase data is defined in `client/lib/data/showcase/*.tsx`:

```tsx
// Example: button.tsx
export const buttonShowcaseData: ShowcaseComponentData = {
  id: 'button',
  name: 'Button',
  description: 'Versatile button component with multiple variants',
  category: 'form',
  imports: ['@/components/ui/button', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Properly implements accessibilityRole="button"',
    'Has accessible touch target size (minimum 44x44 pixels)',
    // ... 6 more notes
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Primary button for main actions',
      preview: <Button><Text>Default Button</Text></Button>,
      code: `import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

<Button>
  <Text>Default Button</Text>
</Button>`,
    },
    // ... 11 more variants
  ],
};
```

### Adding New Components to Showcase

1. **Create showcase data file:**
   - Location: `client/lib/data/showcase/my-component.tsx`
   - Export: `myComponentShowcaseData`

2. **Add to showcase-data.ts:**
   ```tsx
   import { myComponentShowcaseData } from './showcase/my-component';
   
   export const showcaseComponents = [
     // ... existing components
     myComponentShowcaseData,
   ];
   ```

3. **Test in showcase:**
   - Enable developer mode
   - Navigate to Component Showcase
   - Search for your component
   - Verify all variants render
   - Check code snippets are valid
   - Review accessibility notes

### Manual Testing Checklist

- [ ] All interactive elements are reachable with screen reader
- [ ] All images have descriptive labels
- [ ] Form errors are announced
- [ ] Focus order is logical
- [ ] Color contrast meets 4.5:1 (normal text) or 3:1 (large text/UI)
- [ ] Touch targets are at least 44x44dp
- [ ] Navigation state changes are announced
- [ ] Modal focus is trapped
- [ ] Tooltips and hints are announced

---

## References

- **WCAG 2.1 Level AA:** https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aa
- **React Native Accessibility:** https://reactnative.dev/docs/accessibility
- **React Native Reusables:** https://rnr-docs.vercel.app/
- **ESLint Plugin JSX A11y:** https://github.com/jsx-eslint/eslint-plugin-jsx-a11y

---

**Last Reviewed:** December 2024  
**Compliance Status:** ✅ WCAG 2.1 Level AA  
**Next Review:** After Phase 4 screen migrations
