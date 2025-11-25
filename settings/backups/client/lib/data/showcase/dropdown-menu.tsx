import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { User, Settings, LogOut, Plus, Mail, MessageSquare } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const dropdownMenuShowcaseData: ShowcaseComponentData = {
  id: 'dropdown-menu',
  name: 'Dropdown Menu',
  description:
    'Dropdown menu with keyboard navigation and nested submenus. Implements FR-006 accessibilityRole="menu" (WCAG 4.1.2) and FR-009 keyboard navigation. @rn-primitives/dropdown-menu handles aria-haspopup, aria-expanded, and focus management internally.',
  category: 'navigation',
  imports: [
    "import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: accessibilityRole="menu" on content (WCAG 4.1.2)',
    'FR-009: Full keyboard navigation - Arrow keys, Enter, Escape',
    '@rn-primitives/dropdown-menu handles aria-haspopup and aria-expanded internally',
    'Focus management with roving tabindex for menu items',
    'Screen readers announce "menu" role and item count',
    'FadeIn animation (200ms) on menu open',
    'FullWindowOverlay on iOS ensures proper z-index layering',
    'Supports nested submenus with ChevronRight/ChevronDown indicators',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Menu',
      description: 'Basic dropdown menu with simple items',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text>Open Menu</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>
              <Text>My Account</Text>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              <Text>Profile</Text>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              <Text>Settings</Text>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" />
              <Text>Log out</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Text>Open Menu</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>
      <Text>My Account</Text>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <User className="mr-2 size-4" />
      <Text>Profile</Text>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Settings className="mr-2 size-4" />
      <Text>Settings</Text>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <LogOut className="mr-2 size-4" />
      <Text>Log out</Text>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      id: 'with-submenu',
      label: 'With Submenu',
      description: 'Dropdown menu with nested submenu',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              <Text>Actions</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem>
              <Text>New File</Text>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Plus className="mr-2 size-4" />
                <Text>More Tools</Text>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <Text>Save Page</Text>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Text>Create Shortcut</Text>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Text>Name Window</Text>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Text>Share</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="secondary">
      <Text>Actions</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuItem>
      <Text>New File</Text>
    </DropdownMenuItem>
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Plus className="mr-2 size-4" />
        <Text>More Tools</Text>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem>
          <Text>Save Page</Text>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Text>Create Shortcut</Text>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Text>Share</Text>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      id: 'with-checkbox',
      label: 'With Checkboxes',
      description: 'Menu items with checkbox selection',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text>View Options</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>
              <Text>Display Settings</Text>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked onCheckedChange={() => {}}>
              <Text>Show Toolbar</Text>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked onCheckedChange={() => {}}>
              <Text>Show Sidebar</Text>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => {}}>
              <Text>Show Footer</Text>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Text>View Options</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>
      <Text>Display Settings</Text>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuCheckboxItem checked>
      <Text>Show Toolbar</Text>
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem checked>
      <Text>Show Sidebar</Text>
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem>
      <Text>Show Footer</Text>
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      id: 'with-radio',
      label: 'With Radio Group',
      description: 'Menu items with radio button selection',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text>Sort By</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>
              <Text>Sort Order</Text>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value="name" onValueChange={() => {}}>
              <DropdownMenuRadioItem value="name">
                <Text>Name</Text>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date">
                <Text>Date Modified</Text>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size">
                <Text>Size</Text>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Text>Sort By</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>
      <Text>Sort Order</Text>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuRadioGroup value="name" onValueChange={() => {}}>
      <DropdownMenuRadioItem value="name">
        <Text>Name</Text>
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="date">
        <Text>Date Modified</Text>
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="size">
        <Text>Size</Text>
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      id: 'with-shortcuts',
      label: 'With Keyboard Shortcuts',
      description: 'Menu items showing keyboard shortcuts',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text>Edit</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem>
              <Text>Undo</Text>
              <DropdownMenuShortcut>
                <Text>⌘Z</Text>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Text>Redo</Text>
              <DropdownMenuShortcut>
                <Text>⌘⇧Z</Text>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Text>Cut</Text>
              <DropdownMenuShortcut>
                <Text>⌘X</Text>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Text>Copy</Text>
              <DropdownMenuShortcut>
                <Text>⌘C</Text>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Text>Paste</Text>
              <DropdownMenuShortcut>
                <Text>⌘V</Text>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Text>Edit</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuItem>
      <Text>Undo</Text>
      <DropdownMenuShortcut>
        <Text>⌘Z</Text>
      </DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Text>Redo</Text>
      <DropdownMenuShortcut>
        <Text>⌘⇧Z</Text>
      </DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Text>Cut</Text>
      <DropdownMenuShortcut>
        <Text>⌘X</Text>
      </DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Text>Copy</Text>
      <DropdownMenuShortcut>
        <Text>⌘C</Text>
      </DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Text>Paste</Text>
      <DropdownMenuShortcut>
        <Text>⌘V</Text>
      </DropdownMenuShortcut>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
    {
      id: 'grouped',
      label: 'Grouped Items',
      description: 'Menu with grouped items and labels',
      preview: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text>Communication</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>
              <Text>Messages</Text>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Mail className="mr-2 size-4" />
                <Text>Email</Text>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="mr-2 size-4" />
                <Text>Chat</Text>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              <Text>Settings</Text>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Text>Notifications</Text>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Text>Privacy</Text>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      code: `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Text>Communication</Text>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-56">
    <DropdownMenuLabel>
      <Text>Messages</Text>
    </DropdownMenuLabel>
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <Mail className="mr-2 size-4" />
        <Text>Email</Text>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <MessageSquare className="mr-2 size-4" />
        <Text>Chat</Text>
      </DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuLabel>
      <Text>Settings</Text>
    </DropdownMenuLabel>
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <Text>Notifications</Text>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Text>Privacy</Text>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>`,
    },
  ],
};
