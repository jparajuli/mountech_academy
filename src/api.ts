import { User, Course, LiveSession, InstructorProfile, Exam, ExamQuestion } from './types';

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
    const error = new Error(errData.error || `HTTP error! Status: ${response.status}`);
    (error as any).status = response.status;
    (error as any).code = errData.code;
    throw error;
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

export async function resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  });
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; token?: string; resetLink?: string }> {
  return apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetToken(token: string): Promise<{ success: boolean; email: string }> {
  return apiFetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/auth/reset-password-with-token', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
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

export async function fetchCoursesList(): Promise<{ success: boolean; courses: Course[] }> {
  return apiFetch('/api/courses');
}

export async function fetchAdminCoursesList(): Promise<{ success: boolean; courses: Course[] }> {
  return apiFetch('/api/admin/courses');
}

export async function createNewCourse(courseData: any): Promise<{ success: boolean; message: string; course: Course }> {
  return apiFetch('/api/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
}

export async function fetchInstructorDashboard(): Promise<{ success: boolean; courses: Course[] }> {
  return apiFetch('/api/instructor/dashboard');
}

export interface EnrolledStudent {
  name: string;
  email: string;
  enrollmentDate: string;
}

export async function fetchInstructorCourseStudents(courseId: string): Promise<{ success: boolean; students: EnrolledStudent[] }> {
  return apiFetch(`/api/instructor/courses/${encodeURIComponent(courseId)}/students`);
}

export interface CourseMaterial {
  id: number;
  course_id: string;
  title: string;
  file_url: string;
  created_at: string;
}

export async function fetchInstructorCourseMaterials(courseId: string): Promise<{ success: boolean; materials: CourseMaterial[] }> {
  return apiFetch(`/api/instructor/courses/${encodeURIComponent(courseId)}/materials`);
}

export async function addCourseMaterial(courseId: string, title: string, file_url: string): Promise<{ success: boolean; material: CourseMaterial; message: string }> {
  return apiFetch(`/api/instructor/courses/${encodeURIComponent(courseId)}/materials`, {
    method: 'POST',
    body: JSON.stringify({ title, file_url }),
  });
}

export async function updateCourseDetails(id: string, courseData: any): Promise<{ success: boolean; message: string; course: Course }> {
  return apiFetch(`/api/admin/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  });
}

export async function toggleCourseLockStatus(id: string, isLocked?: boolean): Promise<{ success: boolean; isLocked: boolean }> {
  return apiFetch(`/api/admin/courses/${id}/lock`, {
    method: 'PATCH',
    body: isLocked !== undefined ? JSON.stringify({ isLocked }) : undefined,
  });
}

export async function scheduleLiveSession(
  courseId: string, 
  sessionData: { title: string; start_time: string; end_time: string; meet_url: string }
): Promise<{ success: boolean; message: string; session: LiveSession }> {
  return apiFetch(`/api/admin/courses/${courseId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(sessionData),
  });
}

export async function fetchLiveSessions(courseId: string): Promise<{ success: boolean; sessions: LiveSession[] }> {
  return apiFetch(`/api/courses/${courseId}/sessions`);
}

export async function joinLiveSessionRequest(sessionId: number): Promise<{ success: boolean; meetUrl: string }> {
  return apiFetch(`/api/sessions/${sessionId}/join`);
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
  role: 'admin' | 'instructor' | 'student';
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

export async function fetchInstructors(): Promise<{ success: boolean; profiles: InstructorProfile[] }> {
  return apiFetch('/api/instructors');
}

export async function fetchInstructorByEmail(email: string): Promise<{ success: boolean; profile: InstructorProfile }> {
  return apiFetch(`/api/instructors/email/${encodeURIComponent(email)}`);
}

export async function createInstructorProfileAdmin(profileData: {
  user_email: string;
  full_name: string;
  academic_title: string;
  short_bio?: string;
  linkedin_url?: string;
  avatar_url?: string;
}): Promise<{ success: boolean; message: string; profileId: number }> {
  return apiFetch('/api/admin/instructors', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export async function updateInstructorProfileApi(
  id: number,
  profileData: {
    full_name: string;
    academic_title: string;
    short_bio?: string;
    linkedin_url?: string;
    avatar_url?: string;
  }
): Promise<{ success: boolean; message: string; profile: InstructorProfile }> {
  return apiFetch(`/api/instructors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  email: string;
  name: string;
  status: string;
  details: string;
}

export async function adminListAuditLogs(limit = 100, offset = 0): Promise<{ logs: AuditLogEntry[]; total: number; limit: number; offset: number }> {
  return apiFetch(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`);
}

// Update Course Syllabus
export async function updateCourseSyllabus(
  courseId: string, 
  syllabus_content: string, 
  clientLastUpdatedAt?: string
): Promise<{ 
  success: boolean; 
  message: string; 
  syllabus_content: string;
  syllabus_last_updated_at?: string;
  syllabus_last_updated_by?: number;
  syllabus_last_updated_by_name?: string;
}> {
  return apiFetch(`/api/courses/${courseId}/syllabus`, {
    method: 'PUT',
    body: JSON.stringify({ syllabus_content, clientLastUpdatedAt }),
  });
}

// Fetch Course Exams
export async function fetchCourseExams(courseId: string): Promise<{ success: boolean; exams: Exam[] }> {
  return apiFetch(`/api/instructor/courses/${courseId}/exams`);
}

// Create Course Exam
export async function createCourseExam(courseId: string, examData: { title: string; description: string; is_published: boolean; questions_to_display?: number; passing_score_percentage?: number; duration_minutes?: number; chapter_id?: string | null }): Promise<{ success: boolean; message: string; examId: number }> {
  return apiFetch(`/api/instructor/courses/${courseId}/exams`, {
    method: 'POST',
    body: JSON.stringify(examData),
  });
}

// Delete Course Exam
export async function deleteCourseExam(examId: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/instructor/exams/${examId}`, {
    method: 'DELETE',
  });
}

// Create Exam Question
export async function createExamQuestion(examId: number, questionData: Omit<ExamQuestion, 'id' | 'exam_id'>): Promise<{ success: boolean; message: string; questionId: number }> {
  return apiFetch(`/api/instructor/exams/${examId}/questions`, {
    method: 'POST',
    body: JSON.stringify(questionData),
  });
}

// Update Exam Question
export async function updateExamQuestion(examId: number, questionId: number, questionData: Omit<ExamQuestion, 'id' | 'exam_id'>): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/instructor/exams/${examId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(questionData),
  });
}

// Delete Exam Question
export async function deleteExamQuestion(examId: number, questionId: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/instructor/exams/${examId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

// Update Course Exam Configuration
export async function updateCourseExamDetails(examId: number, examData: { title: string; description: string; is_published: boolean; questions_to_display?: number; passing_score_percentage?: number; duration_minutes?: number; chapter_id?: string | null }): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/instructor/exams/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(examData),
  });
}

// Student fetch course exams (published only)
export async function fetchStudentExams(courseId: string): Promise<{ success: boolean; exams: (Exam & { passed?: boolean; attempts?: any[]; bestAttempt?: any })[] }> {
  return apiFetch(`/api/courses/${courseId}/student-exams`);
}

// Student initiate a secure randomized exam attempt
export async function startStudentExam(courseId: string, examId: number, completedLessons?: number[]): Promise<{ success: boolean; message: string; attemptId: number; exam: Exam; questions: ExamQuestion[] }> {
  return apiFetch(`/api/courses/${courseId}/exams/${examId}/start`, {
    method: 'POST',
    body: JSON.stringify({ completedLessons }),
  });
}

// Student submit answers for server-side evaluation & grading
export async function submitStudentExamAnswers(attemptId: number, answers: { questionId: number, answer: string }[]): Promise<{
  success: boolean;
  message: string;
  attempt: any;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  passing_score_percentage: number;
  questions: any[];
}> {
  return apiFetch(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}


