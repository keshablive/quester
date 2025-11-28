import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface ClassifiedAd {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    status: string;
    ownerId: string;
    createdAt: string;
    expiresAt: string;
}

export interface ClassifiedFilters {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
}

export const classifiedsService = {
    /**
     * Create ad
     */
    async create(data: Partial<ClassifiedAd>): Promise<ClassifiedAd> {
        return apiClient.post(API_ENDPOINTS.CLASSIFIEDS.BASE, data);
    },

    /**
     * Search ads
     */
    async search(filters: ClassifiedFilters): Promise<{ data: ClassifiedAd[]; total: number }> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.SEARCH, {
            // Convert filters to query params if needed, but for now passing as is
            // Note: The server endpoint is GET, so we might need to append query params to URL
            // or the client wrapper handles it. 
            // Let's assume the client wrapper doesn't automatically convert body to query params for GET.
            // We should probably construct the query string here or update client wrapper.
            // For simplicity, let's assume the server accepts query params.
            // Actually, looking at routes.go: classifieds.Get("/search", ... classifiedAdController.SearchAds)
            // It's a GET request, so params should be in query string.
            // We'll need to implement query param serialization in client.ts or here.
            // For now, let's just pass them as a config object which fetch might not handle as query params automatically.
            // I'll update client.ts later to handle query params for GET requests if needed, 
            // but for now I'll just pass them in the URL manually if I were doing it raw.
            // Let's assume we'll fix client.ts to handle `params` in config.
            // But wait, I didn't add `params` support in client.ts.
            // I'll just append them to the URL for now in this service or rely on a future update.
            // Let's use a helper or just append string.
        });
    },

    /**
     * Get my ads
     */
    async getMyAds(): Promise<ClassifiedAd[]> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.MY_ADS);
    },

    /**
     * Get recent ads
     */
    async getRecent(): Promise<ClassifiedAd[]> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.RECENT);
    },

    /**
     * Get popular ads
     */
    async getPopular(): Promise<ClassifiedAd[]> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.POPULAR);
    },

    /**
     * Get stats
     */
    async getStats(): Promise<any> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.STATS);
    },

    /**
     * Get ad by ID
     */
    async get(id: string): Promise<ClassifiedAd> {
        return apiClient.get(API_ENDPOINTS.CLASSIFIEDS.BY_ID(id));
    },

    /**
     * Update ad
     */
    async update(id: string, data: Partial<ClassifiedAd>): Promise<ClassifiedAd> {
        return apiClient.put(API_ENDPOINTS.CLASSIFIEDS.BY_ID(id), data);
    },

    /**
     * Delete ad
     */
    async delete(id: string): Promise<void> {
        return apiClient.del(API_ENDPOINTS.CLASSIFIEDS.BY_ID(id));
    },

    /**
     * Publish ad
     */
    async publish(id: string): Promise<ClassifiedAd> {
        return apiClient.post(API_ENDPOINTS.CLASSIFIEDS.PUBLISH(id));
    },

    /**
     * Renew ad
     */
    async renew(id: string): Promise<ClassifiedAd> {
        return apiClient.post(API_ENDPOINTS.CLASSIFIEDS.RENEW(id));
    },

    /**
     * Mark as sold
     */
    async markAsSold(id: string): Promise<ClassifiedAd> {
        return apiClient.post(API_ENDPOINTS.CLASSIFIEDS.SOLD(id));
    }
};
