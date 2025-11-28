import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

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

export interface MessageThread {
    id: string;
    participantId: string;
    participantName: string;
    participantAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface MessageStats {
    totalMessages: number;
    unreadCount: number;
    directMessagesCount: number;
    groupMessagesCount: number;
}

export interface GroupMember {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
}

export const messagesService = {
    /**
     * Send direct message
     */
    async sendDirectMessage(receiverId: string, content: string): Promise<Message> {
        return apiClient.post(API_ENDPOINTS.MESSAGES.DIRECT, { receiverId, content });
    },

    /**
     * Get direct messages with a user
     */
    async getDirectMessages(userId: string, page: number = 1): Promise<Message[]> {
        return apiClient.get(`${API_ENDPOINTS.MESSAGES.USERS(userId)}?page=${page}`);
    },

    /**
     * Send group message
     */
    async sendGroupMessage(groupId: string, content: string): Promise<Message> {
        return apiClient.post(API_ENDPOINTS.MESSAGES.GROUPS(groupId), { content });
    },

    /**
     * Get group messages
     */
    async getGroupMessages(groupId: string, page: number = 1): Promise<Message[]> {
        return apiClient.get(`${API_ENDPOINTS.MESSAGES.GROUPS(groupId)}?page=${page}`);
    },

    /**
     * Get message threads
     */
    async getThreads(): Promise<MessageThread[]> {
        return apiClient.get(API_ENDPOINTS.MESSAGES.THREADS);
    },

    /**
     * Search messages
     */
    async searchMessages(query: string): Promise<Message[]> {
        return apiClient.get(`${API_ENDPOINTS.MESSAGES.SEARCH}?q=${encodeURIComponent(query)}`);
    },

    /**
     * Get message stats
     */
    async getStats(): Promise<MessageStats> {
        return apiClient.get(API_ENDPOINTS.MESSAGES.STATS);
    },

    /**
     * Get unread message count
     */
    async getUnreadCount(): Promise<number> {
        const response: { count: number } = await apiClient.get(API_ENDPOINTS.MESSAGES.UNREAD_COUNT);
        return response.count || 0;
    },

    /**
     * Get message by ID
     */
    async getMessage(id: string): Promise<Message> {
        return apiClient.get(API_ENDPOINTS.MESSAGES.BY_ID(id));
    },

    /**
     * Mark message as read
     */
    async markAsRead(id: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.MESSAGES.MARK_READ(id));
    },

    /**
     * Mark multiple messages as read
     */
    async markMultipleAsRead(ids: string[]): Promise<void> {
        return apiClient.post(API_ENDPOINTS.MESSAGES.MARK_MULTIPLE_READ, { ids });
    },

    /**
     * Delete message
     */
    async deleteMessage(id: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.MESSAGES.BY_ID(id));
    },

    /**
     * Set typing indicator
     */
    async setTypingIndicator(receiverId: string, isTyping: boolean): Promise<void> {
        return apiClient.post(API_ENDPOINTS.MESSAGES.TYPING, { receiverId, isTyping });
    },
};

export const groupsService = {
    /**
     * Create group
     */
    async createGroup(name: string, description?: string): Promise<Group> {
        return apiClient.post(API_ENDPOINTS.GROUPS.BASE, { name, description });
    },

    /**
     * Get user's groups
     */
    async getUserGroups(): Promise<Group[]> {
        return apiClient.get(API_ENDPOINTS.GROUPS.BASE);
    },

    /**
     * Get group by ID
     */
    async getGroup(id: string): Promise<Group> {
        return apiClient.get(API_ENDPOINTS.GROUPS.BY_ID(id));
    },

    /**
     * Add group member
     */
    async addMember(groupId: string, userId: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.GROUPS.ADD_MEMBER(groupId), { userId });
    },

    /**
     * Get group members
     */
    async getMembers(groupId: string): Promise<GroupMember[]> {
        return apiClient.get(API_ENDPOINTS.GROUPS.MEMBERS(groupId));
    },

    /**
     * Remove group member
     */
    async removeMember(groupId: string, userId: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.GROUPS.REMOVE_MEMBER(groupId, userId));
    },

    /**
     * Update member role
     */
    async updateMemberRole(groupId: string, userId: string, role: 'admin' | 'moderator' | 'member'): Promise<void> {
        return apiClient.put(API_ENDPOINTS.GROUPS.UPDATE_ROLE(groupId, userId), { role });
    },

    /**
     * Leave group
     */
    async leaveGroup(groupId: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.GROUPS.LEAVE(groupId));
    },
};
