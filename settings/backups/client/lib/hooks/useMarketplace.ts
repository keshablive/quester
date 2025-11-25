import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchListings,
  getMyListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  publishListing,
  getListingStats,
  getListingReviews,
  addReview,
  addSellerResponse,
  SearchListingsRequest,
  CreateListingRequest,
  UpdateListingRequest,
  CreateReviewRequest,
  AddSellerResponseRequest,
} from '@/lib/api/marketplace';

/**
 * Hook for searching marketplace listings
 */
export function useSearchListings(params: SearchListingsRequest = {}) {
  return useQuery({
    queryKey: ['marketplace', 'listings', params],
    queryFn: () => searchListings(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for getting current user's listings
 */
export function useMyListings(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['marketplace', 'my-listings', page, limit],
    queryFn: () => getMyListings(page, limit),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for getting a single listing
 */
export function useListing(id: string) {
  return useQuery({
    queryKey: ['marketplace', 'listing', id],
    queryFn: () => getListing(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for getting listing statistics
 */
export function useListingStats(id: string) {
  return useQuery({
    queryKey: ['marketplace', 'listing', id, 'stats'],
    queryFn: () => getListingStats(id),
    enabled: !!id,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Hook for getting listing reviews
 */
export function useListingReviews(id: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['marketplace', 'listing', id, 'reviews', page, limit],
    queryFn: () => getListingReviews(id, page, limit),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for creating a listing
 */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListingRequest) => createListing(data),
    onSuccess: () => {
      // Invalidate my listings query
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
    },
  });
}

/**
 * Hook for updating a listing
 */
export function useUpdateListing(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateListingRequest) => updateListing(listingId, data),
    onSuccess: () => {
      // Invalidate listing and my listings queries
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
    },
  });
}

/**
 * Hook for deleting a listing
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => deleteListing(listingId),
    onSuccess: () => {
      // Invalidate my listings query
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
    },
  });
}

/**
 * Hook for publishing a listing
 */
export function usePublishListing(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => publishListing(listingId),
    onSuccess: () => {
      // Invalidate listing and my listings queries
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'my-listings'] });
    },
  });
}

/**
 * Hook for adding a review
 */
export function useAddReview(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewRequest) => addReview(listingId, data),
    onSuccess: () => {
      // Invalidate listing and reviews queries
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId, 'stats'] });
    },
  });
}

/**
 * Hook for adding seller response
 */
export function useAddSellerResponse(reviewId: string, listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddSellerResponseRequest) => addSellerResponse(reviewId, data),
    onSuccess: () => {
      // Invalidate reviews query
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'listing', listingId, 'reviews'] });
    },
  });
}
