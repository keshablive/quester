import { apiClient } from './client';
import { Point } from './properties';

// Classified Ad Types
export interface ClassifiedAd {
  id: string;
  tenant_id: string;
  poster_id: string;
  title: string;
  description: string;
  ad_type: 'job' | 'service' | 'item' | 'housing' | 'event';
  status: 'draft' | 'active' | 'sold' | 'expired' | 'suspended';
  price?: number;
  currency: string;
  price_type?: 'fixed' | 'negotiable' | 'free' | 'hourly' | 'monthly';
  location?: Point;
  location_text?: string;
  images: string[];
  contact_method: 'email' | 'phone' | 'chat';
  contact_info: string;
  category_data?: Record<string, any>;
  tags?: string[];
  keywords?: string[];
  view_count: number;
  response_count: number;
  published_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassifiedAdWithDistance {
  ad: ClassifiedAd;
  distance_meters?: number;
  distance_display?: string;
}

export interface ClassifiedAdSearchParams {
  ad_type?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // meters
  min_price?: number;
  max_price?: number;
  // Allow keywords/tags to be passed as either a single comma-separated string or an array
  keywords?: string | string[];
  tags?: string | string[];
  // Pagination helpers used by some UI screens
  page?: number;
  limit?: number;
  offset?: number;
}

export interface ClassifiedAdStats {
  total: number;
  active: number;
  sold: number;
  expired: number;
  total_views: number;
  total_responses: number;
  by_type: Record<string, number>;
}

// API Functions

/**
 * Create a new classified ad
 */
export async function createClassifiedAd(data: Partial<ClassifiedAd>): Promise<ClassifiedAd> {
  const response = await apiClient.post('/classifieds', data);
  return response.data.data;
}

/**
 * Get classified ad by ID
 */
export async function getClassifiedAd(id: string): Promise<ClassifiedAd> {
  const response = await apiClient.get(`/classifieds/${id}`);
  return response.data.data;
}

/**
 * Update classified ad
 */
export async function updateClassifiedAd(id: string, data: Partial<ClassifiedAd>): Promise<void> {
  await apiClient.put(`/classifieds/${id}`, data);
}

/**
 * Delete classified ad
 */
export async function deleteClassifiedAd(id: string): Promise<void> {
  await apiClient.delete(`/classifieds/${id}`);
}

/**
 * Search classified ads
 */
export async function searchClassifiedAds(
  params: ClassifiedAdSearchParams
): Promise<{ ads: ClassifiedAdWithDistance[]; total: number }> {
  const queryParams = new URLSearchParams();
  
  if (params.ad_type) queryParams.append('ad_type', params.ad_type);
  if (params.status) queryParams.append('status', params.status);
  if (params.latitude) queryParams.append('latitude', params.latitude.toString());
  if (params.longitude) queryParams.append('longitude', params.longitude.toString());
  if (params.radius) queryParams.append('radius', params.radius.toString());
  if (params.min_price) queryParams.append('min_price', params.min_price.toString());
  if (params.max_price) queryParams.append('max_price', params.max_price.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  
  const response = await apiClient.get(`/classifieds/search?${queryParams.toString()}`);
  return {
    ads: response.data.data.ads,
    total: response.data.data.total,
  };
}

/**
 * Get current user's classified ads
 */
export async function getMyClassifiedAds(): Promise<ClassifiedAd[]> {
  const response = await apiClient.get('/classifieds/my-ads');
  return response.data.data;
}

/**
 * Get recent classified ads
 */
export async function getRecentClassifiedAds(limit: number = 10): Promise<ClassifiedAd[]> {
  const response = await apiClient.get(`/classifieds/recent?limit=${limit}`);
  return response.data.data;
}

/**
 * Get popular classified ads
 */
export async function getPopularClassifiedAds(limit: number = 10): Promise<ClassifiedAd[]> {
  const response = await apiClient.get(`/classifieds/popular?limit=${limit}`);
  return response.data.data;
}

/**
 * Publish classified ad
 */
export async function publishClassifiedAd(adId: string): Promise<ClassifiedAd> {
  const response = await apiClient.post(`/classifieds/${adId}/publish`);
  return response.data.data;
}

/**
 * Renew classified ad (extend by 30 days)
 */
export async function renewClassifiedAd(adId: string): Promise<ClassifiedAd> {
  const response = await apiClient.post(`/classifieds/${adId}/renew`);
  return response.data.data;
}

/**
 * Mark classified ad as sold
 */
export async function markClassifiedAdAsSold(adId: string): Promise<ClassifiedAd> {
  const response = await apiClient.post(`/classifieds/${adId}/sold`);
  return response.data.data;
}

/**
 * Increment response count
 */
export async function incrementResponseCount(adId: string): Promise<void> {
  await apiClient.post(`/classifieds/${adId}/respond`);
}

/**
 * Get classified ad statistics
 */
export async function getClassifiedAdStats(): Promise<ClassifiedAdStats> {
  const response = await apiClient.get('/classifieds/stats');
  return response.data.data;
}
