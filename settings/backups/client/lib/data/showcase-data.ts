/**
 * Showcase Data Aggregator (Phase 6, T157)
 * 
 * Aggregates all component showcase data for the showcase route
 * 
 * Note: Some imports are conditional to avoid web compatibility issues
 * with native-only primitives
 */

import { Platform } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

// Safe imports (work on all platforms)
import { avatarShowcaseData } from './showcase/avatar';
import { badgeShowcaseData } from './showcase/badge';
import { buttonShowcaseData } from './showcase/button';
import { cardShowcaseData } from './showcase/card';
import { checkboxShowcaseData } from './showcase/checkbox';
import { inputShowcaseData } from './showcase/input';
import { labelShowcaseData } from './showcase/label';
import { progressShowcaseData } from './showcase/progress';
import { radioGroupShowcaseData } from './showcase/radio-group';
import { textareaShowcaseData } from './showcase/textarea';
import { toggleShowcaseData } from './showcase/toggle';
import { separatorShowcaseData } from './showcase/separator';
import { skeletonShowcaseData } from './showcase/skeleton';
import { switchShowcaseData } from './showcase/switch';
import { textShowcaseData } from './showcase/text';
import { aspectRatioShowcaseData } from './showcase/aspect-ratio';

// Build showcase components array based on platform
const baseComponents: ShowcaseComponentData[] = [
  avatarShowcaseData,
  badgeShowcaseData,
  buttonShowcaseData,
  cardShowcaseData,
  checkboxShowcaseData,
  inputShowcaseData,
  labelShowcaseData,
  progressShowcaseData,
  radioGroupShowcaseData,
  textareaShowcaseData,
  toggleShowcaseData,
  separatorShowcaseData,
  skeletonShowcaseData,
  switchShowcaseData,
  textShowcaseData,
  aspectRatioShowcaseData,
];

// Components that use native-only primitives (only load on native platforms)
const nativeOnlyComponents: ShowcaseComponentData[] = [];

if (Platform.OS !== 'web') {
  nativeOnlyComponents.push(
    require('./showcase/accordion').accordionShowcaseData,
    require('./showcase/context-menu').contextMenuShowcaseData,
    require('./showcase/dialog').dialogShowcaseData,
    require('./showcase/dropdown-menu').dropdownMenuShowcaseData,
    require('./showcase/hover-card').hoverCardShowcaseData,
    require('./showcase/popover').popoverShowcaseData,
    require('./showcase/select').selectShowcaseData,
    require('./showcase/collapsible').collapsibleShowcaseData,
    require('./showcase/tabs').tabsShowcaseData,
    require('./showcase/tooltip').tooltipShowcaseData,
    require('./showcase/toggle-group').toggleGroupShowcaseData,
    require('./showcase/menubar').menubarShowcaseData
  );
}

// Export all showcase data as an array
export const allShowcaseComponents: ShowcaseComponentData[] = [
  ...baseComponents,
  ...nativeOnlyComponents,
];

// Export grouped by category
export const showcaseByCategory = {
  form: allShowcaseComponents.filter((c) => c.category === 'form'),
  layout: allShowcaseComponents.filter((c) => c.category === 'layout'),
  feedback: allShowcaseComponents.filter((c) => c.category === 'feedback'),
  display: allShowcaseComponents.filter((c) => c.category === 'display'),
  navigation: allShowcaseComponents.filter((c) => c.category === 'navigation'),
};

// Export by ID for quick lookup
export const showcaseById = allShowcaseComponents.reduce(
  (acc, component) => {
    acc[component.id] = component;
    return acc;
  },
  {} as Record<string, ShowcaseComponentData>
);

/** @deprecated - Legacy structure, use allShowcaseComponents instead */
export const ALL_COMPONENTS: any[] = [
  {
    id: 'accordion',
    name: 'Accordion',
    category: 'data-display',
    description: 'Collapsible content sections with expand/collapse functionality',
    importPath: '@/components/ui/accordion',
    variants: [
      {
        name: 'Single',
        description: 'Only one section can be open at a time',
        props: { type: 'single', collapsible: true },
      },
      {
        name: 'Multiple',
        description: 'Multiple sections can be open simultaneously',
        props: { type: 'multiple' },
      },
    ],
    codeSnippet: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger><Text>Section 1</Text></AccordionTrigger>
    <AccordionContent><Text>Content for section 1</Text></AccordionContent>
  </AccordionItem>
</Accordion>`,
    accessibilityNotes: [
      'Use AccordionTrigger with proper accessibilityRole="button"',
      'Announce expanded/collapsed state to screen readers',
    ],
    wcagCriteria: ['2.1.1 - Keyboard', '4.1.2 - Name, Role, Value'],
  },
  {
    id: 'avatar',
    name: 'Avatar',
    category: 'data-display',
    description: 'User profile image with fallback to initials',
    importPath: '@/components/ui/avatar',
    variants: [
      {
        name: 'Image',
        description: 'Avatar with image',
        props: { alt: 'User avatar' },
      },
      {
        name: 'Fallback',
        description: 'Avatar with initials fallback',
        props: { alt: 'User avatar' },
      },
    ],
    codeSnippet: `import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar alt="John Doe">
  <AvatarImage source={{ uri: 'https://...' }} />
  <AvatarFallback><Text>JD</Text></AvatarFallback>
</Avatar>`,
    accessibilityNotes: [
      'Always provide alt prop for screen readers',
      'Fallback text should be meaningful (initials, not decorative)',
    ],
    wcagCriteria: ['1.1.1 - Non-text Content'],
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'data-display',
    description: 'Small label for status or count indicators',
    importPath: '@/components/ui/badge',
    variants: [
      {
        name: 'Default',
        description: 'Default badge style',
        props: { variant: 'default' },
      },
      {
        name: 'Secondary',
        description: 'Secondary badge style',
        props: { variant: 'secondary' },
      },
      {
        name: 'Destructive',
        description: 'Error or destructive badge',
        props: { variant: 'destructive' },
      },
      {
        name: 'Outline',
        description: 'Outlined badge',
        props: { variant: 'outline' },
      },
    ],
    codeSnippet: `import { Badge } from '@/components/ui/badge';

<Badge variant="default">
  <Text>Badge Text</Text>
</Badge>`,
    accessibilityNotes: [
      'Badge text must be wrapped in Text component',
      'Use aria-label if badge content is icon-only',
    ],
    wcagCriteria: ['1.4.3 - Contrast (Minimum)'],
  },
  {
    id: 'button',
    name: 'Button',
    category: 'input',
    description: 'Touchable button with multiple variants',
    importPath: '@/components/ui/button',
    variants: [
      {
        name: 'Default',
        description: 'Primary button style',
        props: { variant: 'default' },
      },
      {
        name: 'Outline',
        description: 'Outlined button',
        props: { variant: 'outline' },
      },
      {
        name: 'Ghost',
        description: 'Minimal button',
        props: { variant: 'ghost' },
      },
      {
        name: 'Destructive',
        description: 'Destructive action button',
        props: { variant: 'destructive' },
      },
      {
        name: 'Link',
        description: 'Link-styled button',
        props: { variant: 'link' },
      },
    ],
    codeSnippet: `import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

<Button variant="default" onPress={() => {}}>
  <Text>Click Me</Text>
</Button>`,
    accessibilityNotes: [
      'Button text MUST be wrapped in Text component (FR-001)',
      'Use accessibilityLabel if button has icon only',
      'Include accessibilityHint for complex actions',
    ],
    wcagCriteria: ['2.5.5 - Target Size', '4.1.2 - Name, Role, Value'],
    relatedComponents: ['link', 'toggle'],
  },
  {
    id: 'card',
    name: 'Card',
    category: 'layout',
    description: 'Container for grouping related content',
    importPath: '@/components/ui/card',
    variants: [
      {
        name: 'Default',
        description: 'Standard card with shadow',
        props: {},
      },
    ],
    codeSnippet: `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle><Text variant="h3">Card Title</Text></CardTitle>
    <CardDescription><Text>Card description text</Text></CardDescription>
  </CardHeader>
  <CardContent>
    <Text>Card content goes here</Text>
  </CardContent>
  <CardFooter>
    <Button><Text>Action</Text></Button>
  </CardFooter>
</Card>`,
    accessibilityNotes: [
      'Use Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter composition (FR-002)',
      'CardTitle should use Text variant="h3" or appropriate heading level',
      'Group related content within cards for screen reader navigation',
    ],
    wcagCriteria: ['1.3.1 - Info and Relationships', '2.4.6 - Headings and Labels'],
  },
  // Additional components would be added here following the same pattern
  // For brevity, showing structure for first 5 components
  // TODO: Add remaining 27 components (checkbox, collapsible, context-menu, dialog, etc.)
];

/**
 * Get showcase item by component ID
 */
export function getShowcaseItem(id: string) {
  return allShowcaseComponents.find((item) => item.id === id);
}

/**
 * Get showcase items by category
 */
export function getShowcaseItemsByCategory(category: string) {
  return allShowcaseComponents.filter((item) => item.category === category);
}

/**
 * Get all component categories with counts
 */
export function getCategoriesWithCounts() {
  const categories = Array.from(
    new Set(allShowcaseComponents.map((item) => item.category))
  );
  
  return categories.map((category) => ({
    category,
    count: getShowcaseItemsByCategory(category).length,
  }));
}
