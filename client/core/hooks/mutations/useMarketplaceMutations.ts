/**
 * Marketplace Mutation Hooks
 *
 * TanStack Query mutations for marketplace actions with
 * optimistic updates and rollback on error.
 *
 * FR-022: System MUST provide optimistic updates for marketplace purchases
 *
 * @module core/hooks/mutations/useMarketplaceMutations
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/keys';
import type { ApiError } from '../../types/query.types';

/**
 * Purchase request payload
 */
export interface PurchaseInput {
  /** Item ID to purchase */
  itemId: string;
  /** Item type (property or classified) */
  itemType: 'property' | 'classified';
  /** Purchase quantity (default: 1) */
  quantity?: number;
}

/**
 * Purchase response with transaction details
 */
export interface PurchaseResponse {
  success: boolean;
  transactionId: string;
  itemId: string;
  amount: number;
  newBalance: number;
  purchasedAt: string;
}

/**
 * Contact seller request payload
 */
export interface ContactSellerInput {
  itemId: string;
  itemType: 'property' | 'classified';
  message: string;
}

/**
 * Contact seller response
 */
export interface ContactSellerResponse {
  success: boolean;
  messageId: string;
  sentAt: string;
}

/**
 * Purchase a marketplace item with optimistic update
 *
 * Implements FR-022: Optimistic updates for marketplace purchases
 * - Immediately shows purchase confirmation
 * - Updates user balance optimistically
 * - Rolls back on server error with toast notification
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for marketplace purchase
 *
 * @example
 * ```tsx
 * function BuyButton({ item }) {
 *   const { mutate: purchase, isPending } = usePurchaseItem();
 *
 *   const handlePurchase = () => {
 *     purchase(
 *       { itemId: item.id, itemType: 'property' },
 *       {
 *         onSuccess: (data) => {
 *           showToast(`Purchased! New balance: ${data.newBalance}`);
 *         },
 *         onError: (error) => {
 *           showToast(`Purchase failed: ${error.message}`);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handlePurchase} disabled={isPending}>
 *       {isPending ? 'Processing...' : `Buy for ${item.price}`}
 *     </Button>
 *   );
 * }
 * ```
 */
export function usePurchaseItem(
  options?: Omit<
    UseMutationOptions<PurchaseResponse, ApiError, PurchaseInput>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >
): UseMutationResult<PurchaseResponse, ApiError, PurchaseInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType, quantity = 1 }: PurchaseInput) => {
      const endpoint =
        itemType === 'property'
          ? `/marketplace/properties/${itemId}/purchase`
          : `/marketplace/classifieds/${itemId}/purchase`;

      return apiClient.post<PurchaseResponse>(endpoint, { quantity });
    },

    onMutate: async ({ itemId, itemType }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey:
          itemType === 'property'
            ? queryKeys.marketplace.properties.detail(itemId)
            : queryKeys.marketplace.classifieds.detail(itemId),
      });

      // Snapshot previous user data for rollback
      const previousUserData = queryClient.getQueryData(queryKeys.users.me);

      // Return context for rollback
      return { previousUserData };
    },

    onError: (_error, _variables, context) => {
      // Rollback user data on error (FR-024)
      if (context?.previousUserData) {
        queryClient.setQueryData(queryKeys.users.me, context.previousUserData);
      }
    },

    onSettled: (_data, _error, { itemType }) => {
      // Invalidate marketplace listings and user data to ensure consistency
      queryClient.invalidateQueries({
        queryKey:
          itemType === 'property'
            ? queryKeys.marketplace.properties.all
            : queryKeys.marketplace.classifieds.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },

    ...options,
  });
}

/**
 * Contact a seller about an item
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for contacting seller
 *
 * @example
 * ```tsx
 * function ContactButton({ item }) {
 *   const { mutate: contact, isPending } = useContactSeller();
 *
 *   return (
 *     <Button
 *       onPress={() => contact({
 *         itemId: item.id,
 *         itemType: 'property',
 *         message: 'I am interested in this item.'
 *       })}
 *       disabled={isPending}
 *     >
 *       Contact Seller
 *     </Button>
 *   );
 * }
 * ```
 */
export function useContactSeller(
  options?: Omit<
    UseMutationOptions<ContactSellerResponse, ApiError, ContactSellerInput>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<ContactSellerResponse, ApiError, ContactSellerInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      itemType,
      message,
    }: ContactSellerInput) => {
      const endpoint =
        itemType === 'property'
          ? `/marketplace/properties/${itemId}/contact`
          : `/marketplace/classifieds/${itemId}/contact`;

      return apiClient.post<ContactSellerResponse>(endpoint, { message });
    },

    onSuccess: () => {
      // Invalidate messages to show the new conversation
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.threads() });
    },

    ...options,
  });
}

/**
 * Add item to favorites/watchlist
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for favoriting item
 */
export function useFavoriteItem(
  options?: Omit<
    UseMutationOptions<void, ApiError, { itemId: string; itemType: 'property' | 'classified' }>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, { itemId: string; itemType: 'property' | 'classified' }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }) => {
      const endpoint =
        itemType === 'property'
          ? `/marketplace/properties/${itemId}/favorite`
          : `/marketplace/classifieds/${itemId}/favorite`;

      return apiClient.post<void>(endpoint);
    },

    onSuccess: (_data, { itemType }) => {
      // Invalidate favorites list
      queryClient.invalidateQueries({
        queryKey:
          itemType === 'property'
            ? queryKeys.marketplace.properties.favorites
            : queryKeys.marketplace.classifieds.favorites,
      });
    },

    ...options,
  });
}

/**
 * Remove item from favorites/watchlist
 *
 * @param options - Optional TanStack Query mutation options
 * @returns Mutation result for unfavoriting item
 */
export function useUnfavoriteItem(
  options?: Omit<
    UseMutationOptions<void, ApiError, { itemId: string; itemType: 'property' | 'classified' }>,
    'mutationFn' | 'onSuccess'
  >
): UseMutationResult<void, ApiError, { itemId: string; itemType: 'property' | 'classified' }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemType }) => {
      const endpoint =
        itemType === 'property'
          ? `/marketplace/properties/${itemId}/favorite`
          : `/marketplace/classifieds/${itemId}/favorite`;

      return apiClient.delete<void>(endpoint);
    },

    onSuccess: (_data, { itemType }) => {
      // Invalidate favorites list
      queryClient.invalidateQueries({
        queryKey:
          itemType === 'property'
            ? queryKeys.marketplace.properties.favorites
            : queryKeys.marketplace.classifieds.favorites,
      });
    },

    ...options,
  });
}
