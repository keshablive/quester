import { LucideIcon } from 'lucide-react-native';

/**
 * Sidebar Types
 * 
 * Unified type definitions for the sidebar component system
 */

// Base sidebar props
export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'user' | 'cart' | 'notification' | 'search';
}

// Menu item for user sidebar
export interface MenuItem {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  badge?: number | string;
}

// Cart item
export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

// Notification item
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Search result
export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'page' | 'user' | 'file' | 'setting';
  href?: string;
}

// Sidebar header props
export interface SidebarHeaderProps {
  onClose: () => void;
  variant: 'user' | 'cart' | 'notification' | 'search';
  title: string;
  subtitle: string;
  badge?: number;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: LucideIcon;
}

// Content props for different variants
export interface UserContentProps {
  menuItems: MenuItem[];
  onSignOut: () => void;
}

export interface CartContentProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export interface NotificationContentProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onViewMessages: () => void;
}

export interface SearchContentProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}
