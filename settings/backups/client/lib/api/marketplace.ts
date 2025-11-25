import { apiClient } from './client';

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  listing_type: 'course' | 'quest' | 'badge' | 'digital_good' | 'physical_good' | 'service';
  status: 'draft' | 'active' | 'sold_out' | 'suspended' | 'deleted';
  price: number;
  currency: string;
  commission_rate: number;
  quantity?: number;
  sold_count: number;
  course_id?: string;
  quest_id?: string;
  badge_id?: string;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  average_rating: number;
  total_reviews: number;
  seller?: {
    id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MarketplaceReview {
  id: string;
  listing_id: string;
  transaction_id: string;
  reviewer_id: string;
  rating: number;
  title?: string;
  review_text?: string;
  seller_response?: string;
  seller_responded_at?: string;
  reviewer?: {
    id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  listing_type: string;
  price: number;
  currency: string;
  quantity?: number;
  course_id?: string;
  quest_id?: string;
  badge_id?: string;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchListingsRequest {
  seller_id?: string;
  listing_type?: string;
  status?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  tags?: string[];
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface CreateReviewRequest {
  transaction_id: string;
  rating: number;
  title?: string;
  review_text?: string;
}

export interface AddSellerResponseRequest {
  seller_response: string;
}

export interface ListingStats {
  total_sales: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  views_count: number;
}

export interface PaginatedListings {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedReviews {
  reviews: MarketplaceReview[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create a new marketplace listing
 */
export async function createListing(data: CreateListingRequest): Promise<MarketplaceListing> {
  const response = await apiClient.post('/marketplace/listings', data);
  return response.data.listing;
}

/**
 * Search marketplace listings with filters
 */
export async function searchListings(params: SearchListingsRequest = {}): Promise<PaginatedListings> {
  const response = await apiClient.get('/marketplace/listings', { params });
  return response.data;
}

/**
 * Get current user's listings
 */
export async function getMyListings(page = 1, limit = 20): Promise<PaginatedListings> {
  const response = await apiClient.get('/marketplace/my-listings', {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<MarketplaceListing> {
  const response = await apiClient.get(`/marketplace/listings/${id}`);
  return response.data.listing;
}

/**
 * Update a listing
 */
export async function updateListing(id: string, data: UpdateListingRequest): Promise<MarketplaceListing> {
  const response = await apiClient.put(`/marketplace/listings/${id}`, data);
  return response.data.listing;
}

/**
 * Delete a listing (soft delete)
 */
export async function deleteListing(id: string): Promise<void> {
  await apiClient.delete(`/marketplace/listings/${id}`);
}

/**
 * Publish a draft listing
 */
export async function publishListing(id: string): Promise<MarketplaceListing> {
  const response = await apiClient.post(`/marketplace/listings/${id}/publish`);
  return response.data.listing;
}

/**
 * Get listing statistics
 */
export async function getListingStats(id: string): Promise<ListingStats> {
  const response = await apiClient.get(`/marketplace/listings/${id}/stats`);
  return response.data.stats;
}

/**
 * Get listing reviews
 */
export async function getListingReviews(
  id: string,
  page = 1,
  limit = 20
): Promise<PaginatedReviews> {
  const response = await apiClient.get(`/marketplace/listings/${id}/reviews`, {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Add a review for a listing
 */
export async function addReview(
  listingId: string,
  data: CreateReviewRequest
): Promise<MarketplaceReview> {
  const response = await apiClient.post(`/marketplace/listings/${listingId}/reviews`, data);
  return response.data.review;
}

/**
 * Add seller response to a review
 */
export async function addSellerResponse(
  reviewId: string,
  data: AddSellerResponseRequest
): Promise<MarketplaceReview> {
  const response = await apiClient.post(`/marketplace/reviews/${reviewId}/response`, data);
  return response.data.review;
}
