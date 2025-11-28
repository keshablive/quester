/**
 * Sidebar Components
 * 
 * Unified sidebar system with multiple variants
 * 
 * @example
 * ```tsx
 * // User sidebar
 * <Sidebar 
 *   variant="user" 
 *   isOpen={isOpen} 
 *   onClose={onClose}
 *   menuItems={menuItems}
 *   onSignOut={handleSignOut}
 * />
 * 
 * // Cart sidebar
 * <Sidebar 
 *   variant="cart" 
 *   isOpen={isOpen} 
 *   onClose={onClose}
 *   items={cartItems}
 *   onUpdateQuantity={handleUpdateQuantity}
 *   onRemove={handleRemove}
 *   onCheckout={handleCheckout}
 * />
 * 
 * // Notification sidebar
 * <Sidebar 
 *   variant="notification" 
 *   isOpen={isOpen} 
 *   onClose={onClose}
 *   notifications={notifications}
 *   onMarkAsRead={handleMarkAsRead}
 *   onMarkAllRead={handleMarkAllRead}
 *   onViewMessages={handleViewMessages}
 * />
 * 
 * // Search overlay
 * <Sidebar 
 *   variant="search" 
 *   isOpen={isOpen} 
 *   onClose={onClose}
 *   query={query}
 *   onQueryChange={setQuery}
 *   onClear={() => setQuery('')}
 *   results={searchResults}
 *   onSelect={handleSelect}
 * />
 * ```
 */

export * from './Sidebar';
export * from './SidebarHeader';
export * from './UserContent';
export * from './CartContent';
export * from './CartItemCard';
export * from './NotificationContent';
export * from './NotificationCard';
export * from './SearchContent';
export * from './SearchResultCard';
export * from './types';
// TypeScript refresh
