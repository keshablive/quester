/**
 * Certificate Query Hooks
 *
 * TanStack Query hooks for certificate data fetching with
 * caching, offline support, and instant display.
 *
 * US3: Certificate Display with Cache
 *
 * @module core/hooks/queries/useCertificates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { certificatesService, Certificate } from '../../api/services/certificates.service';
import { queryKeys } from '../../query/keys';
import { STALE_TIMES, GC_TIME } from '../../query/constants';
import type {
  CertificateFilters,
  ApiError,
} from '../../types/query.types';

/**
 * Fetch all certificates for the current user
 *
 * @param filters - Optional filters for certificates
 * @param options - Optional TanStack Query options
 * @returns Query result with certificates data
 *
 * @example
 * ```tsx
 * const { data: certificates, isLoading, error, refetch } = useCertificates();
 * ```
 */
export function useCertificates(
  filters?: CertificateFilters,
  options?: Omit<
    UseQueryOptions<Certificate[], ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Certificate[], ApiError> {
  return useQuery({
    queryKey: queryKeys.certificates.list(filters),
    queryFn: () => certificatesService.getMyCertificates(),
    staleTime: STALE_TIMES.CERTIFICATES,
    gcTime: GC_TIME,
    ...options,
  });
}

/**
 * Fetch a single certificate by ID
 *
 * @param certificateId - The certificate's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with certificate data
 *
 * @example
 * ```tsx
 * const { data: certificate, isLoading } = useCertificate(certificateId);
 * ```
 */
export function useCertificate(
  certificateId: string,
  options?: Omit<
    UseQueryOptions<Certificate, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Certificate, ApiError> {
  return useQuery({
    queryKey: queryKeys.certificates.detail(certificateId),
    queryFn: () => certificatesService.get(certificateId),
    staleTime: STALE_TIMES.CERTIFICATES,
    gcTime: GC_TIME,
    enabled: !!certificateId,
    ...options,
  });
}

/**
 * Fetch certificate for a specific course
 *
 * @param courseId - The course's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with certificate data
 *
 * @example
 * ```tsx
 * const { data: certificate, isLoading } = useCourseCertificate(courseId);
 * ```
 */
export function useCourseCertificate(
  courseId: string,
  options?: Omit<
    UseQueryOptions<Certificate, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<Certificate, ApiError> {
  return useQuery({
    queryKey: [...queryKeys.certificates.all, 'course', courseId] as const,
    queryFn: () => certificatesService.getCourseCertificate(courseId),
    staleTime: STALE_TIMES.CERTIFICATES,
    gcTime: GC_TIME,
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Get certificate download URL
 *
 * @param certificateId - The certificate's unique identifier
 * @param options - Optional TanStack Query options
 * @returns Query result with download URL
 *
 * @example
 * ```tsx
 * const { data } = useCertificateDownloadUrl(certificateId);
 * if (data?.url) openUrl(data.url);
 * ```
 */
export function useCertificateDownloadUrl(
  certificateId: string,
  options?: Omit<
    UseQueryOptions<{ url: string }, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<{ url: string }, ApiError> {
  return useQuery({
    queryKey: [...queryKeys.certificates.detail(certificateId), 'download'] as const,
    queryFn: () => certificatesService.getDownloadUrl(certificateId),
    // Short stale time for download URLs (they may expire)
    staleTime: 60_000, // 1 minute
    gcTime: GC_TIME,
    enabled: !!certificateId,
    ...options,
  });
}

/**
 * Verify a certificate by code
 *
 * @param code - The certificate verification code
 * @param options - Optional TanStack Query options
 * @returns Query result with verification status
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useVerifyCertificate(verificationCode);
 * if (data?.valid) { ... }
 * ```
 */
export function useVerifyCertificate(
  code: string,
  options?: Omit<
    UseQueryOptions<{ valid: boolean; certificate?: Certificate }, ApiError>,
    'queryKey' | 'queryFn'
  >
): UseQueryResult<{ valid: boolean; certificate?: Certificate }, ApiError> {
  return useQuery({
    queryKey: [...queryKeys.certificates.all, 'verify', code] as const,
    queryFn: () => certificatesService.verify(code),
    staleTime: STALE_TIMES.CERTIFICATES,
    gcTime: GC_TIME,
    enabled: !!code && code.length > 0,
    ...options,
  });
}

/**
 * Regenerate a certificate mutation
 *
 * @returns Mutation result with regenerate function
 *
 * @example
 * ```tsx
 * const { mutate: regenerate, isPending } = useRegenerateCertificate();
 * regenerate(certificateId);
 * ```
 */
export function useRegenerateCertificate(
  options?: Omit<
    UseMutationOptions<Certificate, ApiError, string>,
    'mutationFn'
  >
): UseMutationResult<Certificate, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => certificatesService.regenerate(certificateId),
    onSuccess: (data, certificateId) => {
      // Update the certificate in cache
      queryClient.setQueryData(
        queryKeys.certificates.detail(certificateId),
        data
      );
      // Invalidate the list to reflect the updated certificate
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.lists(),
      });
    },
    ...options,
  });
}
