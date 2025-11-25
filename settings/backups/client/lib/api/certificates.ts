import { apiClient } from './client';
import { handleApiResponse } from '../utils/error-handler';

/**
 * Certificate data structure matching server Certificate model
 */
export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  verification_code: string;
  certificate_url?: string;
  issued_at: string;
  average_grade?: number;
  completed_at?: string;
  instructor_id?: string;
  course_difficulty?: string;
  course_title?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Certificate statistics for a course
 */
export interface CertificateStats {
  total_issued: number;
  average_grade: number;
  completion_rate: number;
  certificates_by_difficulty?: Record<string, number>;
}

/**
 * Certificate verification response
 */
export interface CertificateVerification {
  valid: boolean;
  certificate?: Certificate;
  message?: string;
}

/**
 * Parameters for creating a certificate
 */
export interface CreateCertificateParams {
  course_id: string;
  user_id?: string; // Optional, defaults to current user
}

/**
 * Parameters for listing certificates
 */
export interface ListCertificatesParams {
  page?: number;
  limit?: number;
  course_id?: string;
  user_id?: string;
  sort?: 'issued_at' | 'average_grade';
  order?: 'asc' | 'desc';
}

/**
 * Create a new certificate for a course completion
 * 
 * @param params - Certificate creation parameters
 * @returns Promise<Certificate>
 * @throws ApiError on validation or server errors
 * 
 * @example
 * ```typescript
 * const certificate = await createCertificate({
 *   course_id: 'course-uuid',
 * });
 * console.log(`Certificate issued: ${certificate.verification_code}`);
 * ```
 */
export const createCertificate = async (
  params: CreateCertificateParams
): Promise<Certificate> => {
  try {
    const response = await apiClient.post('/certificates', params);
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get list of certificates with optional filtering
 * 
 * @param params - Pagination and filter parameters
 * @returns Promise<Certificate[]>
 * 
 * @example
 * ```typescript
 * const certificates = await getCertificates({
 *   course_id: 'course-uuid',
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export const getCertificates = async (
  params?: ListCertificatesParams
): Promise<Certificate[]> => {
  try {
    const response = await apiClient.get('/certificates', { params });
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get a specific certificate by ID
 * 
 * @param id - Certificate ID
 * @returns Promise<Certificate>
 * @throws ApiError with 404 if certificate not found
 * 
 * @example
 * ```typescript
 * const certificate = await getCertificate('cert-uuid');
 * ```
 */
export const getCertificate = async (id: string): Promise<Certificate> => {
  try {
    const response = await apiClient.get(`/certificates/${id}`);
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Download certificate as PDF
 * Returns a blob URL that can be used to download or display the PDF
 * 
 * @param id - Certificate ID
 * @returns Promise<string> - Blob URL for PDF
 * 
 * @example
 * ```typescript
 * const pdfUrl = await downloadCertificate('cert-uuid');
 * window.open(pdfUrl, '_blank');
 * ```
 */
export const downloadCertificate = async (id: string): Promise<string> => {
  try {
    // Use apiClient's baseURL and construct full URL
    const url = `${apiClient.baseURL}/certificates/${id}/download`;
    const token = apiClient.getToken();
    
    // Fetch the PDF directly to get blob response
    // Note: This bypasses apiClient to handle blob response type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to download certificate');
    }
    
    // Create blob URL from response
    const blob = await response.blob();
    const pdfUrl = URL.createObjectURL(blob);
    
    return pdfUrl;
  } catch (error) {
    throw error;
  }
};

/**
 * Regenerate a certificate (e.g., if original was lost or template updated)
 * 
 * @param id - Certificate ID
 * @returns Promise<Certificate>
 * @throws ApiError with 404 if certificate not found
 * 
 * @example
 * ```typescript
 * const newCertificate = await regenerateCertificate('cert-uuid');
 * ```
 */
export const regenerateCertificate = async (id: string): Promise<Certificate> => {
  try {
    const response = await apiClient.post(`/certificates/${id}/regenerate`);
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get all certificates for a specific course
 * 
 * @param courseId - Course ID
 * @param params - Optional pagination parameters
 * @returns Promise<Certificate[]>
 * 
 * @example
 * ```typescript
 * const courseCertificates = await getCourseCertificates('course-uuid', {
 *   page: 1,
 *   limit: 50,
 * });
 * ```
 */
export const getCourseCertificates = async (
  courseId: string,
  params?: { page?: number; limit?: number }
): Promise<Certificate[]> => {
  try {
    const response = await apiClient.get(`/certificates/course/${courseId}`, { params });
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Get certificate statistics for a course
 * Useful for instructors/admins to see course completion metrics
 * 
 * @param courseId - Course ID
 * @returns Promise<CertificateStats>
 * 
 * @example
 * ```typescript
 * const stats = await getCourseCertificateStats('course-uuid');
 * console.log(`Total certificates issued: ${stats.total_issued}`);
 * console.log(`Average grade: ${stats.average_grade}%`);
 * ```
 */
export const getCourseCertificateStats = async (
  courseId: string
): Promise<CertificateStats> => {
  try {
    const response = await apiClient.get(`/certificates/stats/course/${courseId}`);
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Verify a certificate by verification code
 * Public endpoint - no authentication required
 * 
 * @param code - Verification code from certificate
 * @returns Promise<CertificateVerification>
 * 
 * @example
 * ```typescript
 * const verification = await verifyCertificate('ABC123XYZ');
 * if (verification.valid) {
 *   console.log(`Valid certificate for ${verification.certificate?.course_title}`);
 * } else {
 *   console.log('Invalid certificate');
 * }
 * ```
 */
export const verifyCertificate = async (
  code: string
): Promise<CertificateVerification> => {
  try {
    const response = await apiClient.get(`/certificates/verify/${code}`);
    return handleApiResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Certificates API client
 * Provides methods for certificate management in the LMS
 */
const certificatesApi = {
  createCertificate,
  getCertificates,
  getCertificate,
  downloadCertificate,
  regenerateCertificate,
  getCourseCertificates,
  getCourseCertificateStats,
  verifyCertificate,
};

export default certificatesApi;
