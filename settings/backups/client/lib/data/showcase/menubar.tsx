import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

// Lazy import to avoid web compatibility issues
let Menubar: any;
let MenubarMenu: any;
let MenubarTrigger: any;
let MenubarContent: any;
let MenubarItem: any;
let MenubarSeparator: any;
let MenubarCheckboxItem: any;
let MenubarRadioGroup: any;
let MenubarRadioItem: any;
let MenubarSub: any;
let MenubarSubTrigger: any;
let MenubarSubContent: any;
let MenubarShortcut: any;

// Only load on native platforms
if (Platform.OS !== 'web') {
  const menubarModule = require('@/components/ui/menubar');
  Menubar = menubarModule.Menubar;
  MenubarMenu = menubarModule.MenubarMenu;
  MenubarTrigger = menubarModule.MenubarTrigger;
  MenubarContent = menubarModule.MenubarContent;
  MenubarItem = menubarModule.MenubarItem;
  MenubarSeparator = menubarModule.MenubarSeparator;
  MenubarCheckboxItem = menubarModule.MenubarCheckboxItem;
  MenubarRadioGroup = menubarModule.MenubarRadioGroup;
  MenubarRadioItem = menubarModule.MenubarRadioItem;
  MenubarSub = menubarModule.MenubarSub;
  MenubarSubTrigger = menubarModule.MenubarSubTrigger;
  MenubarSubContent = menubarModule.MenubarSubContent;
  MenubarShortcut = menubarModule.MenubarShortcut;
}

export const menubarShowcaseData: ShowcaseComponentData = {
  id: 'menubar',
  name: 'Menubar',
  description:
    'Horizontal menu bar for application-level navigation. Implements FR-006 accessibilityRole="menubar" and FR-010 navigation roles. Keyboard navigable with arrow keys and supports nested submenus.',
  category: 'navigation',
  imports: [
    "import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem } from '@/components/ui/menubar';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: Menubar exposes accessibilityRole="menubar" for WCAG 4.1.2',
    'FR-010: Implements proper navigation roles and keyboard support',
    'Arrow keys navigate between menu triggers and menu items',
    'Enter/Space activates menu items',
    'Escape closes open menus',
    'Screen readers announce menu structure and states',
    'Checkbox and radio items announce checked state',
    'Submenus are keyboard accessible with arrow navigation',
  ],
  variants: [
    {
      id: 'simple',
      label: 'Simple Menubar',
      description: 'Basic menubar with File and Edit menus',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              Menubar component is optimized for native platforms. View on iOS/Android to see live
              demo.
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="file">
                  <MenubarTrigger>
                    <Text>File</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>New File</Text>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>Open</Text>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      <Text>Save</Text>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu value="edit">
                  <MenubarTrigger>
                    <Text>Edit</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>Cut</Text>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>Copy</Text>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>Paste</Text>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `<Menubar>\n  <MenubarMenu>\n    <MenubarTrigger><Text>File</Text></MenubarTrigger>\n    <MenubarContent>\n      <MenubarItem><Text>New</Text></MenubarItem>\n      <MenubarItem><Text>Open</Text></MenubarItem>\n    </MenubarContent>\n  </MenubarMenu>\n</Menubar>`,
    },
    {
      id: 'checkbox',
      label: 'With Checkboxes',
      description: 'Menu items with checkbox state',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              View on native to see interactive demo
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            const [showToolbar, setShowToolbar] = useState(true);
            const [showSidebar, setShowSidebar] = useState(false);
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="view">
                  <MenubarTrigger>
                    <Text>View</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarCheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
                      <Text>Show Toolbar</Text>
                    </MenubarCheckboxItem>
                    <MenubarCheckboxItem checked={showSidebar} onCheckedChange={setShowSidebar}>
                      <Text>Show Sidebar</Text>
                    </MenubarCheckboxItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `const [checked, setChecked] = useState(true);\n<MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>\n  <Text>Option</Text>\n</MenubarCheckboxItem>`,
    },
    {
      id: 'radio',
      label: 'With Radio Group',
      description: 'Menu with radio group for exclusive selection',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              View on native to see interactive demo
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            const [theme, setTheme] = useState('light');
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="theme">
                  <MenubarTrigger>
                    <Text>Theme</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarRadioGroup value={theme} onValueChange={setTheme}>
                      <MenubarRadioItem value="light">
                        <Text>Light</Text>
                      </MenubarRadioItem>
                      <MenubarRadioItem value="dark">
                        <Text>Dark</Text>
                      </MenubarRadioItem>
                      <MenubarRadioItem value="system">
                        <Text>System</Text>
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `const [value, setValue] = useState('light');\n<MenubarRadioGroup value={value} onValueChange={setValue}>\n  <MenubarRadioItem value="light"><Text>Light</Text></MenubarRadioItem>\n  <MenubarRadioItem value="dark"><Text>Dark</Text></MenubarRadioItem>\n</MenubarRadioGroup>`,
    },
    {
      id: 'submenu',
      label: 'With Submenu',
      description: 'Nested submenu navigation',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              View on native to see interactive demo
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="file">
                  <MenubarTrigger>
                    <Text>File</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>New File</Text>
                    </MenubarItem>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        <Text>Recent Files</Text>
                      </MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem>
                          <Text>Document1.txt</Text>
                        </MenubarItem>
                        <MenubarItem>
                          <Text>Document2.txt</Text>
                        </MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `<MenubarSub>\n  <MenubarSubTrigger><Text>Submenu</Text></MenubarSubTrigger>\n  <MenubarSubContent>\n    <MenubarItem><Text>Item</Text></MenubarItem>\n  </MenubarSubContent>\n</MenubarSub>`,
    },
    {
      id: 'shortcuts',
      label: 'With Keyboard Shortcuts',
      description: 'Menu items showing keyboard shortcuts',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              View on native to see interactive demo
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="edit">
                  <MenubarTrigger>
                    <Text>Edit</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>Undo</Text>
                      <MenubarShortcut>
                        <Text>⌘Z</Text>
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>Redo</Text>
                      <MenubarShortcut>
                        <Text>⌘⇧Z</Text>
                      </MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      <Text>Cut</Text>
                      <MenubarShortcut>
                        <Text>⌘X</Text>
                      </MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `<MenubarItem>\n  <Text>Save</Text>\n  <MenubarShortcut><Text>⌘S</Text></MenubarShortcut>\n</MenubarItem>`,
    },
    {
      id: 'full-example',
      label: 'Full Application Menubar',
      description: 'Complete menubar with multiple menus and features',
      preview:
        Platform.OS === 'web' ? (
          <View className="rounded-lg border border-border p-4">
            <Text className="text-center text-muted-foreground">
              View on native to see interactive demo
            </Text>
          </View>
        ) : (
          (() => {
            const [value, setValue] = useState<string | undefined>(undefined);
            const [showRuler, setShowRuler] = useState(false);
            const [zoom, setZoom] = useState('100');
            return (
              <Menubar value={value} onValueChange={setValue}>
                <MenubarMenu value="file">
                  <MenubarTrigger>
                    <Text>File</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>New</Text>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>Open</Text>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      <Text>Exit</Text>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu value="view">
                  <MenubarTrigger>
                    <Text>View</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarCheckboxItem checked={showRuler} onCheckedChange={setShowRuler}>
                      <Text>Ruler</Text>
                    </MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarRadioGroup value={zoom} onValueChange={setZoom}>
                      <MenubarRadioItem value="50">
                        <Text>50%</Text>
                      </MenubarRadioItem>
                      <MenubarRadioItem value="100">
                        <Text>100%</Text>
                      </MenubarRadioItem>
                      <MenubarRadioItem value="200">
                        <Text>200%</Text>
                      </MenubarRadioItem>
                    </MenubarRadioGroup>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu value="help">
                  <MenubarTrigger>
                    <Text>Help</Text>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Text>Documentation</Text>
                    </MenubarItem>
                    <MenubarItem>
                      <Text>About</Text>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            );
          })()
        ),
      code: `// Full application menubar with File, View, and Help menus`,
    },
  ],
};
