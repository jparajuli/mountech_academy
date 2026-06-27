import { User, Course, LiveSession, InstructorProfile, Exam, ExamQuestion, Lesson } from './types';

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
  rawEnrollments?: any[];
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
  sessionData: { title: string; start_time: string; end_time: string; scheduled_start_time?: string; is_live_scheduled?: boolean }
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

export interface ManualCheckoutResponse {
  success: boolean;
  payment_reference: string;
  bankDetails: {
    iban: string;
    swift: string;
    accountName: string;
    bankName: string;
    routingNumber: string;
    amount: number;
  };
}

export interface PendingPayment {
  id: number;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  timestamp: string;
  payment_method: string;
  payment_status: string;
  payment_reference: string;
  price: number;
}

export async function checkoutManual(courseId: string, courseTitle: string): Promise<ManualCheckoutResponse> {
  return apiFetch('/api/checkout/manual', {
    method: 'POST',
    body: JSON.stringify({ courseId, courseTitle }),
  });
}

export async function adminGetPendingPayments(): Promise<{ success: boolean; payments: PendingPayment[] }> {
  return apiFetch('/api/admin/payments/pending');
}

export async function adminApprovePayment(enrollmentId: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/admin/payments/approve/${enrollmentId}`, {
    method: 'POST',
  });
}

export interface CourseEnrollmentDossier {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string | null;
  certificateDownloadedAt: string | null;
  courseCompletedAt: string | null;
  enrollmentStatus: 'Pending Verification' | 'Active' | 'Completed' | 'Certified';
  totalExamsTaken: number;
  averageScore: number;
  finalExamStatus: 'Passed' | 'Failed' | 'Not Attempted';
  attempts: {
    id: number;
    examId: number;
    title: string;
    type: string;
    score: number;
    passed: boolean;
    date: string;
  }[];
}

export interface StudentDossier {
  email: string;
  name: string;
  role: string;
  joinedDate: string;
  enrollments: CourseEnrollmentDossier[];
  overallStats: {
    totalEnrollments: number;
    totalExamsPassed: number;
    averageScoreAll: number;
    hasPendingPayment: boolean;
    overallStatus: 'New Student' | 'Active Student' | 'High Achiever' | 'Graduate';
  };
}

export async function adminGetStudentsOverview(): Promise<{ dossiers: StudentDossier[] }> {
  return apiFetch('/api/admin/students/overview');
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
  clientLastUpdatedAt?: string,
  syllabus?: any[]
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
    body: JSON.stringify({ syllabus_content, clientLastUpdatedAt, syllabus }),
  });
}

// Fetch Course Exams
export async function fetchCourseExams(courseId: string): Promise<{ success: boolean; exams: Exam[] }> {
  return apiFetch(`/api/instructor/courses/${courseId}/exams`);
}

// Create Course Exam
export async function createCourseExam(courseId: string, examData: { 
  title: string; 
  description: string; 
  is_published: boolean; 
  questions_to_display?: number; 
  passing_score_percentage?: number; 
  duration_minutes?: number; 
  chapter_id?: string | null;
  exam_type?: "lesson" | "final";
  lesson_reference?: string | null;
  lesson_id?: number | null;
}): Promise<{ success: boolean; message: string; examId: number }> {
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
export async function updateCourseExamDetails(examId: number, examData: { 
  title: string; 
  description: string; 
  is_published: boolean; 
  questions_to_display?: number; 
  passing_score_percentage?: number; 
  duration_minutes?: number; 
  chapter_id?: string | null;
  exam_type?: "lesson" | "final";
  lesson_reference?: string | null;
  lesson_id?: number | null;
  quiz_data?: any[] | null;
}): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/api/instructor/exams/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(examData),
  });
}

// Fetch Lessons for a course
export async function fetchCourseLessons(courseId: string): Promise<{ success: boolean; lessons: Lesson[] }> {
  return apiFetch(`/api/courses/${courseId}/lessons`);
}

// Fetch student access and assessment payload for a specific chapter
export async function fetchChapterAccess(courseId: string, chapterId: string | number): Promise<{
  success: boolean;
  locked: boolean;
  error?: string;
  failingExam?: {
    exam_id: number;
    title: string;
    passing_score_percentage: number;
  };
  payload?: {
    lesson: Lesson;
    exam: (Exam & { quiz_data?: string }) | null;
  };
}> {
  return apiFetch(`/api/courses/${courseId}/chapters/${chapterId}/access`);
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
export async function submitStudentExamAnswers(
  attemptId: number, 
  answers: { questionId: number, answer: string }[], 
  score?: number, 
  passed?: boolean
): Promise<{
  success: boolean;
  message: string;
  attempt: any;
  earnedPoints?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  passing_score_percentage?: number;
  questions?: any[];
}> {
  return apiFetch(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers, score, passed }),
  });
}

export interface LessonProblem {
  id: number;
  lesson_id: number;
  title: string;
  description_markdown: string;
  starter_code: string;
}

export async function fetchLessonProblems(lessonId: number): Promise<{ problems: LessonProblem[] }> {
  return apiFetch(`/api/lessons/${lessonId}/problems`);
}

export async function updateLessonConfig(lessonId: number, config: { youtube_channel_id?: string | null; is_chosen_for_recording?: boolean | number | null }): Promise<{ success: boolean; message: string; youtube_channel_id?: string | null; is_chosen_for_recording?: number | boolean }> {
  return apiFetch(`/api/admin/lessons/${lessonId}/config`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export async function getJaasTokenRequest(lessonId: string | number): Promise<{ success: boolean; token: string }> {
  return apiFetch(`/api/live-sessions/${lessonId}/jaas-token`);
}

// Fetch Pre-signed Document URL from R2
export async function getLessonDocumentUrl(lessonId: string | number): Promise<{ url: string; isSimulated: boolean; message?: string }> {
  return apiFetch(`/api/lessons/${lessonId}/document`);
}

// Fetch Signed Video playback token for Mux Player
export async function getLessonVideoToken(lessonId: string | number): Promise<{ playbackToken: string; playbackId?: string; videoUrl?: string; isSimulated: boolean; message?: string }> {
  return apiFetch(`/api/lessons/${lessonId}/video-token`);
}

// Upload custom PDF and MP4 video notes/lectures to R2 & Mux
export async function uploadLessonMedia(lessonId: string | number, formData: FormData): Promise<{ success: boolean; document_key?: string; video_playback_id?: string; message: string }> {
  const token = getToken();
  const response = await fetch(`/api/lessons/${lessonId}/media`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

export async function requestPresignedUrls(lessonId: string | number, payload: {
  document?: { fileName: string; fileType: string };
  video?: { fileName: string; fileType: string };
}): Promise<{
  success: boolean;
  document?: { uploadUrl: string; key: string };
  video?: { uploadUrl: string; key: string };
}> {
  return apiFetch(`/api/lessons/${lessonId}/presigned-urls`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function finalizeLessonMedia(lessonId: string | number, payload: {
  documentKey?: string;
  videoKey?: string;
}): Promise<{
  success: boolean;
  document_key?: string;
  video_playback_id?: string;
  message: string;
}> {
  return apiFetch(`/api/lessons/${lessonId}/finalize-media`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}




