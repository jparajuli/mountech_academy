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
