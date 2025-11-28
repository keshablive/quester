import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    location: string;
    type: string;
    status: string;
    images: string[];
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface PropertyFilters {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    type?: string;
    location?: string;
    page?: number;
    limit?: number;
}

export const propertiesService = {
    /**
     * Create property
     */
    async create(data: Partial<Property>): Promise<Property> {
        return apiClient.post(API_ENDPOINTS.PROPERTIES.BASE, data);
    },

    /**
     * Search properties
     */
    async search(filters: PropertyFilters): Promise<{ data: Property[]; total: number }> {
        return apiClient.post(API_ENDPOINTS.PROPERTIES.SEARCH, filters);
    },

    /**
     * Get property stats
     */
    async getStats(): Promise<any> {
        return apiClient.get(API_ENDPOINTS.PROPERTIES.STATS);
    },

    /**
     * Get property by ID
     */
    async get(id: string): Promise<Property> {
        return apiClient.get(API_ENDPOINTS.PROPERTIES.BY_ID(id));
    },

    /**
     * Update property
     */
    async update(id: string, data: Partial<Property>): Promise<Property> {
        return apiClient.put(API_ENDPOINTS.PROPERTIES.BY_ID(id), data);
    },

    /**
     * Delete property
     */
    async delete(id: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.PROPERTIES.BY_ID(id));
    },

    /**
     * Upload documents
     */
    async uploadDocuments(id: string, formData: FormData): Promise<any> {
        return apiClient.upload(API_ENDPOINTS.PROPERTIES.DOCUMENTS(id), formData);
    },

    /**
     * Verify documents
     */
    async verifyDocuments(id: string): Promise<any> {
        return apiClient.post(API_ENDPOINTS.PROPERTIES.VERIFY(id));
    },

    /**
     * Publish property
     */
    async publish(id: string): Promise<Property> {
        return apiClient.post(API_ENDPOINTS.PROPERTIES.PUBLISH(id));
    },

    /**
     * Increment contact count
     */
    async contact(id: string): Promise<void> {
        return apiClient.post(API_ENDPOINTS.PROPERTIES.CONTACT(id));
    }
};
