/**
 * Component Showcase Card (Phase 6, T158)
 *
 * Displays a single component with:
 * - Component name and description
 * - Live preview with variant selector
 * - Code snippet viewer
 * - Accessibility notes
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import { Eye, Code, Accessibility, ChevronDown, ChevronUp } from 'lucide-react-native';

export interface ComponentVariant {
  id: string;
  label: string;
  description?: string;
  preview: React.ReactNode;
  code: string;
}

export interface ShowcaseComponentData {
  id: string;
  name: string;
  description: string;
  category: string;
  variants: ComponentVariant[];
  accessibilityNotes: string[];
  wcagLevel: 'A' | 'AA' | 'AAA';
  imports: string[];
}

interface ComponentShowcaseCardProps {
  component: ShowcaseComponentData;
  defaultExpanded?: boolean;
}

export function ComponentShowcaseCard({
  component,
  defaultExpanded = false,
}: ComponentShowcaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'a11y'>('preview');

  const currentVariant = component.variants[selectedVariant];

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <CardTitle>{component.name}</CardTitle>
              <Badge
                variant={component.wcagLevel === 'AAA' ? 'default' : 'secondary'}
                className={
                  component.wcagLevel === 'AAA'
                    ? 'bg-green-600'
                    : component.wcagLevel === 'AA'
                      ? 'bg-blue-600'
                      : 'bg-gray-600'
                }>
                <Text variant="small" className="font-medium text-white">WCAG {component.wcagLevel}</Text>
              </Badge>
            </View>
            <CardDescription className="mt-1">{component.description}</CardDescription>
            <Text variant="small" className="mt-1 capitalize text-muted-foreground">
              {component.category}
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setIsExpanded(!isExpanded)}
            accessibilityRole="button"
            accessibilityLabel={
              isExpanded ? 'Collapse component details' : 'Expand component details'
            }>
            <Icon as={isExpanded ? ChevronUp : ChevronDown} size={20} />
          </Button>
        </View>
      </CardHeader>

      {isExpanded && (
        <CardContent className="gap-4">
          {/* Tab Selector */}
          <View className="flex-row gap-2">
            <Button
              variant={activeTab === 'preview' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setActiveTab('preview')}
              className="flex-1 flex-row items-center gap-1"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'preview' }}>
              <Icon as={Eye} size={16} />
              <Text variant="small">Preview</Text>
            </Button>
            <Button
              variant={activeTab === 'code' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setActiveTab('code')}
              className="flex-1 flex-row items-center gap-1"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'code' }}>
              <Icon as={Code} size={16} />
              <Text variant="small">Code</Text>
            </Button>
            <Button
              variant={activeTab === 'a11y' ? 'default' : 'outline'}
              size="sm"
              onPress={() => setActiveTab('a11y')}
              className="flex-1 flex-row items-center gap-1"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'a11y' }}>
              <Icon as={Accessibility} size={16} />
              <Text variant="small">A11y</Text>
            </Button>
          </View>

          <Separator />

          {/* Variant Selector (if multiple variants) */}
          {component.variants.length > 1 && activeTab !== 'a11y' && (
            <>
              <View className="mt-4">
                <Text variant="small" className="mb-2 font-semibold">Variant:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {component.variants.map((variant, index) => (
                    <Button
                      key={variant.id}
                      variant={selectedVariant === index ? 'default' : 'outline'}
                      size="sm"
                      onPress={() => setSelectedVariant(index)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedVariant === index }}>
                      <Text variant="small">{variant.label}</Text>
                    </Button>
                  ))}
                </View>
                {currentVariant.description && (
                  <Text variant="small" className="mt-2 text-muted-foreground">
                    {currentVariant.description}
                  </Text>
                )}
              </View>
              <Separator />
            </>
          )}

          {/* Tab Content */}
          <View>
            {activeTab === 'preview' && (
              <View className="rounded-lg border border-border bg-muted/30 p-4">
                <Text variant="small" className="mb-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Live Preview
                </Text>
                <View className="items-center justify-center py-6">{currentVariant.preview}</View>
              </View>
            )}

            {activeTab === 'code' && (
              <View className="rounded-lg border border-border bg-muted/30 p-4">
                <Text variant="small" className="mb-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Code Snippet
                </Text>
                <View className="rounded bg-gray-900 p-3">
                  <Text variant="code" className="text-gray-100" selectable>
                    {currentVariant.code}
                  </Text>
                </View>
                <Text variant="small" className="mt-3 text-muted-foreground">
                  Imports: {component.imports.join(', ')}
                </Text>
              </View>
            )}

            {activeTab === 'a11y' && (
              <View className="rounded-lg border border-border bg-muted/30 p-4">
                <Text variant="small" className="mb-3 font-semibold uppercase tracking-wide text-muted-foreground">
                  Accessibility Notes
                </Text>
                <View className="gap-2">
                  {component.accessibilityNotes.map((note, index) => (
                    <View key={index} className="flex-row gap-2">
                      <Text className="text-green-600">✓</Text>
                      <Text variant="small" className="flex-1">{note}</Text>
                    </View>
                  ))}
                </View>
                <Separator className="my-3" />
                <View className="flex-row items-center gap-2">
                  <Badge
                    variant={component.wcagLevel === 'AAA' ? 'default' : 'secondary'}
                    className={
                      component.wcagLevel === 'AAA'
                        ? 'bg-green-600'
                        : component.wcagLevel === 'AA'
                          ? 'bg-blue-600'
                          : 'bg-gray-600'
                    }>
                    <Text variant="small" className="font-medium text-white">
                      WCAG {component.wcagLevel}
                    </Text>
                  </Badge>
                  <Text variant="small" className="text-muted-foreground">
                    Meets {component.wcagLevel} accessibility standards
                  </Text>
                </View>
              </View>
            )}
          </View>
        </CardContent>
      )}
    </Card>
  );
}
