import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client'; // T310: Use API client with 401 interceptor

// Types
export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  thumbnailUrl?: string;
  instructorId: string;
  instructorName: string;
  enrollmentCount: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetails extends Course {
  lessonCount: number;
  totalDuration: number;
  certificateEligible: boolean;
  prerequisites?: string[];
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completionPercentage: number;
  averageGrade: number;
  status: 'active' | 'completed' | 'dropped';
  lastAccessedAt?: string;
}

export interface CourseFilters {
  page?: number;
  limit?: number;
  difficulty?: string;
  published?: boolean;
  instructorId?: string;
  search?: string;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  thumbnailUrl?: string;
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  id: string;
}

export interface EnrollmentRequest {
  courseId: string;
  paymentToken?: string;
}

export interface CourseStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  averageGrade: number;
  certificateCount: number;
}

// T310: Use apiClient with automatic token refresh and retry logic
// Helper function for API calls (now uses apiClient for 401 handling)
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use apiClient which handles token refresh automatically
  const method = (options.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  
  switch (method) {
    case 'post':
      return apiClient.post(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'put':
      return apiClient.put(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'patch':
      return apiClient.patch(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'delete':
      return apiClient.delete(endpoint);
    default:
      return apiClient.get(endpoint);
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get list of courses with filters
 */
export async function getCourses(filters: CourseFilters = {}): Promise<Course[]> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.published !== undefined) params.append('published', filters.published.toString());
  if (filters.instructorId) params.append('instructor_id', filters.instructorId);
  if (filters.search) params.append('search', filters.search);

  const queryString = params.toString();
  const endpoint = `/courses${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiCall<{ courses: Course[] }>(endpoint);
  return response.courses;
}

/**
 * Get single course by ID
 */
export async function getCourse(courseId: string): Promise<CourseDetails> {
  const response = await apiCall<{ course: CourseDetails }>(`/courses/${courseId}`);
  return response.course;
}

/**
 * Get course enrollment statistics (instructor/admin only)
 */
export async function getCourseStats(courseId: string): Promise<CourseStats> {
  const response = await apiCall<{ stats: CourseStats }>(`/courses/${courseId}/stats`);
  return response.stats;
}

/**
 * Get courses by instructor
 */
export async function getInstructorCourses(instructorId: string): Promise<Course[]> {
  const response = await apiCall<{ courses: Course[] }>(`/instructors/${instructorId}/courses`);
  return response.courses;
}

/**
 * Get user's enrollment for a course
 */
export async function getUserEnrollment(courseId: string): Promise<Enrollment | null> {
  try {
    const response = await apiCall<{ enrollment: Enrollment }>(`/courses/${courseId}/enrollment`);
    return response.enrollment;
  } catch (error) {
    // Return null if not enrolled
    return null;
  }
}

/**
 * Get all user enrollments
 */
export async function getUserEnrollments(status?: string): Promise<Enrollment[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  const endpoint = `/enrollments${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiCall<{ enrollments: Enrollment[] }>(endpoint);
  return response.enrollments;
}

/**
 * Check if user is enrolled in course
 */
export async function checkEnrollment(courseId: string): Promise<boolean> {
  const response = await apiCall<{ enrolled: boolean }>(`/courses/${courseId}/enrollment/check`);
  return response.enrolled;
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new course (instructor only)
 */
export async function createCourse(data: CreateCourseRequest): Promise<Course> {
  const response = await apiCall<{ course: Course }>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.course;
}

/**
 * Update existing course
 */
export async function updateCourse(data: UpdateCourseRequest): Promise<Course> {
  const { id, ...updates } = data;
  const response = await apiCall<{ course: Course }>(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.course;
}

/**
 * Delete course
 */
export async function deleteCourse(courseId: string): Promise<void> {
  await apiCall(`/courses/${courseId}`, {
    method: 'DELETE',
  });
}

/**
 * Publish course
 */
export async function publishCourse(courseId: string): Promise<Course> {
  const response = await apiCall<{ course: Course }>(`/courses/${courseId}/publish`, {
    method: 'POST',
  });
  return response.course;
}

/**
 * Unpublish course
 */
export async function unpublishCourse(courseId: string): Promise<Course> {
  const response = await apiCall<{ course: Course }>(`/courses/${courseId}/unpublish`, {
    method: 'POST',
  });
  return response.course;
}

/**
 * Enroll in course
 */
export async function enrollInCourse(data: EnrollmentRequest): Promise<Enrollment> {
  const response = await apiCall<{ enrollment: Enrollment }>(`/courses/${data.courseId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ payment_token: data.paymentToken }),
  });
  return response.enrollment;
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch courses list
 */
export function useCourses(filters: CourseFilters = {}) {
  return useQuery({
    queryKey: ['courses', filters],
    queryFn: () => getCourses(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch single course
 */
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch course stats
 */
export function useCourseStats(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId, 'stats'],
    queryFn: () => getCourseStats(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch instructor courses
 */
export function useInstructorCourses(instructorId: string) {
  return useQuery({
    queryKey: ['instructors', instructorId, 'courses'],
    queryFn: () => getInstructorCourses(instructorId),
    enabled: !!instructorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch user enrollment
 */
export function useUserEnrollment(courseId: string) {
  return useQuery({
    queryKey: ['enrollments', 'course', courseId],
    queryFn: () => getUserEnrollment(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch all user enrollments
 */
export function useUserEnrollments(status?: string) {
  return useQuery({
    queryKey: ['enrollments', 'user', status],
    queryFn: () => getUserEnrollments(status),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to check enrollment status
 */
export function useEnrollmentCheck(courseId: string) {
  return useQuery({
    queryKey: ['enrollments', 'check', courseId],
    queryFn: () => checkEnrollment(courseId),
    enabled: !!courseId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to create course
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to update course
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCourse,
    onSuccess: (data) => {
      // Invalidate specific course and courses list
      queryClient.invalidateQueries({ queryKey: ['courses', data.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to delete course
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: (_, courseId) => {
      // Remove specific course from cache
      queryClient.removeQueries({ queryKey: ['courses', courseId] });
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to publish course
 */
export function usePublishCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: publishCourse,
    onSuccess: (data) => {
      // Update course in cache
      queryClient.setQueryData(['courses', data.id], data);
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to unpublish course
 */
export function useUnpublishCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unpublishCourse,
    onSuccess: (data) => {
      // Update course in cache
      queryClient.setQueryData(['courses', data.id], data);
      // Invalidate courses list
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Hook to enroll in course
 */
export function useEnrollInCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: enrollInCourse,
    onSuccess: (_, variables) => {
      // Invalidate enrollment queries
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'course', variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'check', variables.courseId] });
      // Invalidate course to update enrollment count
      queryClient.invalidateQueries({ queryKey: ['courses', variables.courseId] });
    },
  });
}
