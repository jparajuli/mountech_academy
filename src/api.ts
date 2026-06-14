import { User } from './types';

// Read existing token from local storage
export function getToken(): string | null {
  return localStorage.getItem('mountech_session_token');
}

// Set token in local storage
export function setToken(token: string) {
  localStorage.setItem('mountech_session_token', token);
}

// Clear token on logout
export function clearToken() {
  localStorage.removeItem('mountech_session_token');
}

// Base Fetch Wrapper with Bearer Token integration
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

// Authentication requests
export async function registerUser(email: string, name: string, password: string) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
}

export async function loginUser(email: string, password: string) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function oauthLogin(email: string, name: string, provider: 'Google' | 'LinkedIn' | 'GitHub') {
  return apiFetch('/api/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ email, name, provider }),
  });
}

export async function resendVerification(email: string): Promise<{ message: string; verificationLink?: string }> {
  return apiFetch('/api/auth/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getProfile(): Promise<{ user: User }> {
  return apiFetch('/api/auth/me');
}

// Google Sheets enrollment requests
export interface GetEnrollmentsResponse {
  enrollments: string[];
  completions: string[];
  sheetsSynced: boolean;
  warning?: string;
}

export async function getEnrollments(): Promise<GetEnrollmentsResponse> {
  return apiFetch('/api/enrollments');
}

export interface EnrollResponse {
  success: boolean;
  sheetsSynced: boolean;
  message: string;
  warning?: string;
  errorDetails?: string;
}

export async function enrollInCourse(courseId: string, courseTitle: string): Promise<EnrollResponse> {
  return apiFetch('/api/enroll', {
    method: 'POST',
    body: JSON.stringify({ courseId, courseTitle }),
  });
}

export interface CompleteResponse {
  success: boolean;
  sheetsSynced: boolean;
  message: string;
  warning?: string;
  errorDetails?: string;
}

export async function completeCourse(courseId: string): Promise<CompleteResponse> {
  return apiFetch('/api/complete', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  });
}

export interface LoginEvent {
  timestamp: string;
  email: string;
  name: string;
  status: string;
  details: string;
}

export async function getLoginHistory(): Promise<{ logins: LoginEvent[] }> {
  return apiFetch('/api/auth/logins');
}

export interface ReviewRating {
  id: string;
  courseId: string;
  email: string;
  name: string;
  rating: number;
  review: string;
  timestamp: string;
}

export interface GetRatingsResponse {
  ratings: ReviewRating[];
  average: number;
  count: number;
}

export async function getCourseRatings(courseId: string): Promise<GetRatingsResponse> {
  return apiFetch(`/api/ratings/${courseId}`);
}

export async function submitCourseRating(courseId: string, rating: number, review?: string): Promise<{ success: boolean; message: string; rating: ReviewRating }> {
  return apiFetch('/api/ratings', {
    method: 'POST',
    body: JSON.stringify({ courseId, rating, review })
  });
}

// RBAC admin requests
export interface ManagedUser {
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student' | 'developer';
  isVerified: boolean;
}

export async function adminListUsers(): Promise<{ users: ManagedUser[] }> {
  return apiFetch('/api/admin/users');
}

export interface AdminEnrollment {
  timestamp: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  status: string;
}

export async function adminListEnrollments(): Promise<{ enrollments: AdminEnrollment[] }> {
  return apiFetch('/api/admin/enrollments');
}

export async function adminUpdateUserRole(email: string, role: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/admin/users/role', {
    method: 'PUT',
    body: JSON.stringify({ email, role }),
  });
}

export async function getDeveloperLogs(): Promise<{ logs: any[] }> {
  return apiFetch('/api/developer/logs');
}

