import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Info, HelpCircle, AlertCircle, CheckCircle } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const tooltipShowcaseData: ShowcaseComponentData = {
  id: 'tooltip',
  name: 'Tooltip',
  description:
    'Contextual help overlay that appears on hover or long-press. Implements FR-009 accessibilityHint for complex interactions (WCAG 3.3.2 Labels or Instructions). Uses FadeInDown/FadeInUp animations with proper z-index layering.',
  category: 'feedback',
  imports: ["import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-009: accessibilityHint on TooltipTrigger provides context for screen readers',
    'WCAG 3.3.2: Labels or Instructions - Tooltips provide additional help text',
    'WCAG 1.4.13: Content on Hover or Focus - Tooltip content is dismissible and hoverable',
    '@rn-primitives/tooltip handles aria-describedby internally',
    'Web: Shows on hover, mobile: shows on long-press',
    'Animated with FadeInDown (top) or FadeInUp (bottom) for smooth transitions',
    'z-50 ensures tooltip appears above other content',
    'Supports custom positioning with side prop (top, bottom, left, right)',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Tooltip',
      description: 'Basic tooltip on button hover/long-press',
      preview: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" accessibilityHint="Shows help information">
              <Text>Hover me</Text>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Text>This is a helpful tooltip</Text>
          </TooltipContent>
        </Tooltip>
      ),
      code: `<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" accessibilityHint="Shows help information">
      <Text>Hover me</Text>
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <Text>This is a helpful tooltip</Text>
  </TooltipContent>
</Tooltip>`,
    },
    {
      id: 'with-icon',
      label: 'With Info Icon',
      description: 'Tooltip triggered by icon button for contextual help',
      preview: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Information"
              accessibilityHint="Shows additional details">
              <Info className="size-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Text>Additional information about this feature</Text>
          </TooltipContent>
        </Tooltip>
      ),
      code: `<Tooltip>
  <TooltipTrigger asChild>
    <Button 
      variant="ghost" 
      size="icon"
      accessibilityLabel="Information"
      accessibilityHint="Shows additional details"
    >
      <Info className="size-4 text-muted-foreground" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <Text>Additional information about this feature</Text>
  </TooltipContent>
</Tooltip>`,
    },
    {
      id: 'positioned-bottom',
      label: 'Bottom Position',
      description: 'Tooltip appears below the trigger element',
      preview: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" accessibilityHint="Shows help below">
              <Text>Bottom tooltip</Text>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <Text>Tooltip positioned at the bottom</Text>
          </TooltipContent>
        </Tooltip>
      ),
      code: `<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="secondary" accessibilityHint="Shows help below">
      <Text>Bottom tooltip</Text>
    </Button>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <Text>Tooltip positioned at the bottom</Text>
  </TooltipContent>
</Tooltip>`,
    },
    {
      id: 'multi-line',
      label: 'Multi-line Content',
      description: 'Tooltip with longer, wrapped text content',
      preview: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" accessibilityHint="Shows detailed explanation">
              <HelpCircle className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <Text>
              This tooltip contains multiple lines of text to provide more detailed information
              about the feature.
            </Text>
          </TooltipContent>
        </Tooltip>
      ),
      code: `<Tooltip>
  <TooltipTrigger asChild>
    <Button 
      variant="outline"
      accessibilityHint="Shows detailed explanation"
    >
      <HelpCircle className="size-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent className="max-w-xs">
    <Text>
      This tooltip contains multiple lines of text to provide 
      more detailed information about the feature.
    </Text>
  </TooltipContent>
</Tooltip>`,
    },
    {
      id: 'status-indicators',
      label: 'Status Tooltips',
      description: 'Tooltips explaining status icons',
      preview: (
        <View className="flex-row gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Success"
                accessibilityHint="Operation completed">
                <CheckCircle className="size-5 text-green-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>Operation successful</Text>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel="Warning"
                accessibilityHint="Requires attention">
                <AlertCircle className="size-5 text-amber-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>Action required</Text>
            </TooltipContent>
          </Tooltip>
        </View>
      ),
      code: `<View className="flex-row gap-3">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon"
        accessibilityLabel="Success"
        accessibilityHint="Operation completed"
      >
        <CheckCircle className="size-5 text-green-500" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <Text>Operation successful</Text>
    </TooltipContent>
  </Tooltip>
  
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon"
        accessibilityLabel="Warning"
        accessibilityHint="Requires attention"
      >
        <AlertCircle className="size-5 text-amber-500" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <Text>Action required</Text>
    </TooltipContent>
  </Tooltip>
</View>`,
    },
    {
      id: 'in-form',
      label: 'Form Field Help',
      description: 'Tooltip providing help for form inputs',
      preview: (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="font-medium">Password</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  accessibilityLabel="Password help"
                  accessibilityHint="Shows password requirements">
                  <Info className="size-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <Text className="text-xs">
                  Password must be at least 8 characters with uppercase, lowercase, and numbers.
                </Text>
              </TooltipContent>
            </Tooltip>
          </View>
        </View>
      ),
      code: `<View className="gap-2">
  <View className="flex-row items-center gap-2">
    <Text className="font-medium">Password</Text>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-6"
          accessibilityLabel="Password help"
          accessibilityHint="Shows password requirements"
        >
          <Info className="size-3 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <Text className="text-xs">
          Password must be at least 8 characters with uppercase, 
          lowercase, and numbers.
        </Text>
      </TooltipContent>
    </Tooltip>
  </View>
</View>`,
    },
  ],
};
