/**
 * Message-related types for the Messages component group
 *
 * These types sync with the API service types from core/api/services/messages.service.ts
 * for consistent data handling between API and UI layers.
 *
 * @module components/pages/communicate/Messages/types
 */

/**
 * Message thread - represents a conversation with another user or group
 * Synced with MessageThread from messages.service.ts (T016)
 */
export interface MessageThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  /** Indicates if this is a group conversation (T049) */
  isGroup?: boolean;
  /** Member count for group conversations */
  memberCount?: number;
}

/**
 * Individual message within a conversation
 * Synced with Message from messages.service.ts (T016)
 */
export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Legacy Message type for backward compatibility with existing components
 * Used by CommunicateDashboard for recent messages display
 * @deprecated Use MessageThread for thread lists, Message for conversation content
 */
export interface LegacyMessage {
  sender: string;
  preview: string;
  time: string;
  unread: boolean;
  initials: string;
}

/**
 * Convert MessageThread to LegacyMessage format for backward compatibility
 */
export function threadToLegacyMessage(thread: MessageThread): LegacyMessage {
  return {
    sender: thread.participantName,
    preview: thread.lastMessage,
    time: formatRelativeTime(thread.lastMessageAt),
    unread: thread.unreadCount > 0,
    initials: getInitials(thread.participantName),
  };
}

/**
 * Format ISO timestamp to relative time string
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
