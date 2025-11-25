import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Copy, Edit, Share, Trash, Download } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const contextMenuShowcaseData: ShowcaseComponentData = {
  id: 'context-menu',
  name: 'Context Menu',
  description:
    'Right-click or long-press context menu with keyboard navigation. Implements FR-006 accessibilityRole="menu" (WCAG 4.1.2) and FR-009 keyboard support. @rn-primitives/context-menu handles aria attributes, focus management, and roving tabindex internally.',
  category: 'navigation',
  imports: [
    "import React, { useState } from 'react';",
    "import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: accessibilityRole="menu" on content (WCAG 4.1.2)',
    'FR-009: Full keyboard navigation - Arrow keys, Enter, Escape',
    'Web: Right-click to open, Mobile: Long-press to open',
    '@rn-primitives/context-menu handles aria-haspopup internally',
    'Focus management with roving tabindex for menu items',
    'FadeIn animation (200ms) on menu appearance',
    'FullWindowOverlay on iOS ensures proper layering',
    'Screen readers announce menu role and available actions',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Context Menu',
      description: 'Basic context menu on card element',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full border-2 border-dashed p-6">
              <Text className="text-center text-muted-foreground">
                Right-click or long-press here
              </Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem>
              <Copy className="mr-2 size-4" />
              <Text>Copy</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Edit className="mr-2 size-4" />
              <Text>Edit</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Share className="mr-2 size-4" />
              <Text>Share</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <Trash className="mr-2 size-4 text-destructive" />
              <Text className="text-destructive">Delete</Text>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6 border-2 border-dashed">
      <Text className="text-center text-muted-foreground">
        Right-click or long-press here
      </Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuItem>
      <Copy className="mr-2 size-4" />
      <Text>Copy</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Edit className="mr-2 size-4" />
      <Text>Edit</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Share className="mr-2 size-4" />
      <Text>Share</Text>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Trash className="mr-2 size-4 text-destructive" />
      <Text className="text-destructive">Delete</Text>
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`,
    },
    {
      id: 'with-submenu',
      label: 'With Submenu',
      description: 'Context menu with nested submenu options',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full border-2 border-dashed p-6">
              <Text className="text-center">Document Options</Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem>
              <Text>Open</Text>
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Download className="mr-2 size-4" />
                <Text>Export As</Text>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>
                  <Text>PDF</Text>
                </ContextMenuItem>
                <ContextMenuItem>
                  <Text>Word Document</Text>
                </ContextMenuItem>
                <ContextMenuItem>
                  <Text>Plain Text</Text>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <Text>Properties</Text>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6 border-2 border-dashed">
      <Text className="text-center">Document Options</Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuItem>
      <Text>Open</Text>
    </ContextMenuItem>
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Download className="mr-2 size-4" />
        <Text>Export As</Text>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem>
          <Text>PDF</Text>
        </ContextMenuItem>
        <ContextMenuItem>
          <Text>Word Document</Text>
        </ContextMenuItem>
        <ContextMenuItem>
          <Text>Plain Text</Text>
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Text>Properties</Text>
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`,
    },
    {
      id: 'with-checkbox',
      label: 'With Checkboxes',
      description: 'Context menu with checkbox selections',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full border-2 border-dashed p-6">
              <Text className="text-center">View Settings</Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuLabel>
              <Text>Display Options</Text>
            </ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked onCheckedChange={() => {}}>
              <Text>Show Grid</Text>
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem checked onCheckedChange={() => {}}>
              <Text>Show Rulers</Text>
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem checked={false} onCheckedChange={() => {}}>
              <Text>Show Guides</Text>
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6 border-2 border-dashed">
      <Text className="text-center">View Settings</Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuLabel>
      <Text>Display Options</Text>
    </ContextMenuLabel>
    <ContextMenuSeparator />
    <ContextMenuCheckboxItem checked onCheckedChange={() => {}}>
      <Text>Show Grid</Text>
    </ContextMenuCheckboxItem>
    <ContextMenuCheckboxItem checked onCheckedChange={() => {}}>
      <Text>Show Rulers</Text>
    </ContextMenuCheckboxItem>
    <ContextMenuCheckboxItem checked={false} onCheckedChange={() => {}}>
      <Text>Show Guides</Text>
    </ContextMenuCheckboxItem>
  </ContextMenuContent>
</ContextMenu>`,
    },
    {
      id: 'with-radio',
      label: 'With Radio Group',
      description: 'Context menu with radio button selection',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full border-2 border-dashed p-6">
              <Text className="text-center">Text Alignment</Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuLabel>
              <Text>Align Text</Text>
            </ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup value="left" onValueChange={() => {}}>
              <ContextMenuRadioItem value="left">
                <Text>Left</Text>
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="center">
                <Text>Center</Text>
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="right">
                <Text>Right</Text>
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="justify">
                <Text>Justify</Text>
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6 border-2 border-dashed">
      <Text className="text-center">Text Alignment</Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuLabel>
      <Text>Align Text</Text>
    </ContextMenuLabel>
    <ContextMenuSeparator />
    <ContextMenuRadioGroup value="left" onValueChange={() => {}}>
      <ContextMenuRadioItem value="left">
        <Text>Left</Text>
      </ContextMenuRadioItem>
      <ContextMenuRadioItem value="center">
        <Text>Center</Text>
      </ContextMenuRadioItem>
      <ContextMenuRadioItem value="right">
        <Text>Right</Text>
      </ContextMenuRadioItem>
      <ContextMenuRadioItem value="justify">
        <Text>Justify</Text>
      </ContextMenuRadioItem>
    </ContextMenuRadioGroup>
  </ContextMenuContent>
</ContextMenu>`,
    },
    {
      id: 'on-text',
      label: 'Text Selection Menu',
      description: 'Context menu for text content actions',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full p-6">
              <Text>
                This is a sample text paragraph. Right-click or long-press to see text editing
                options like copy, cut, and paste.
              </Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem>
              <Text>Cut</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Text>Copy</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Text>Paste</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <Text>Select All</Text>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6">
      <Text>
        This is a sample text paragraph. Right-click or long-press 
        to see text editing options.
      </Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuItem>
      <Text>Cut</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Text>Copy</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Text>Paste</Text>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>
      <Text>Select All</Text>
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`,
    },
    {
      id: 'labeled-sections',
      label: 'Labeled Sections',
      description: 'Context menu with organized sections',
      preview: (
        <ContextMenu>
          <ContextMenuTrigger>
            <Card className="w-full border-2 border-dashed p-6">
              <Text className="text-center">File Actions</Text>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuLabel>
              <Text>Actions</Text>
            </ContextMenuLabel>
            <ContextMenuItem>
              <Text>Rename</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Text>Duplicate</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>
              <Text>Organize</Text>
            </ContextMenuLabel>
            <ContextMenuItem>
              <Text>Move to Folder</Text>
            </ContextMenuItem>
            <ContextMenuItem>
              <Text>Add to Favorites</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuLabel>
              <Text>Danger Zone</Text>
            </ContextMenuLabel>
            <ContextMenuItem>
              <Text className="text-destructive">Delete</Text>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      code: `<ContextMenu>
  <ContextMenuTrigger>
    <Card className="p-6 border-2 border-dashed">
      <Text className="text-center">File Actions</Text>
    </Card>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-64">
    <ContextMenuLabel>
      <Text>Actions</Text>
    </ContextMenuLabel>
    <ContextMenuItem>
      <Text>Rename</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Text>Duplicate</Text>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuLabel>
      <Text>Organize</Text>
    </ContextMenuLabel>
    <ContextMenuItem>
      <Text>Move to Folder</Text>
    </ContextMenuItem>
    <ContextMenuItem>
      <Text>Add to Favorites</Text>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuLabel>
      <Text>Danger Zone</Text>
    </ContextMenuLabel>
    <ContextMenuItem>
      <Text className="text-destructive">Delete</Text>
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`,
    },
  ],
};
