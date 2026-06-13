import React, { useState, useEffect } from 'react';
import { Course, User } from './types';
import SignIn from './pages/SignIn';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import { getProfile, getEnrollments, enrollInCourse, completeCourse, clearToken, getToken } from './api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [view, setView] = useState<'catalog' | 'detail'>('catalog');
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ sheetsSynced: boolean; message?: string } | null>(null);

  // Initialize and validate the user session
  useEffect(() => {
    async function checkAuthSession() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profileData = await getProfile();
        setUser(profileData.user);

        const enrollmentsData = await getEnrollments();
        setEnrolledCourseIds(enrollmentsData.enrollments);
        setCompletedCourseIds(enrollmentsData.completions || []);
        setSyncStatus({ 
          sheetsSynced: enrollmentsData.sheetsSynced,
          message: enrollmentsData.warning 
        });
      } catch (err) {
        console.warn('Session expired or signature unverified. Re-authenticating.');
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuthSession();
  }, []);

  // Handle Login / Registration Success
  const handleSignInSuccess = async (signedInUser: User) => {
    setUser(signedInUser);
    setView('catalog');
    setSelectedCourse(null);
    setLoading(true);

    try {
      const enrollmentsData = await getEnrollments();
      setEnrolledCourseIds(enrollmentsData.enrollments);
      setCompletedCourseIds(enrollmentsData.completions || []);
      setSyncStatus({ 
        sheetsSynced: enrollmentsData.sheetsSynced,
        message: enrollmentsData.warning 
      });
    } catch (e) {
      console.warn('Could not sync remote sheets enrollments on sign-in:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    clearToken();
    setUser(null);
    setSelectedCourse(null);
    setView('catalog');
    setEnrolledCourseIds([]);
    setCompletedCourseIds([]);
    setSyncStatus(null);
  };

  // Select a course to open detailed syllabus
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Back button trigger
  const handleBackToCatalog = async () => {
    setSelectedCourse(null);
    setView('catalog');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Quiet refresh to guarantee latest row states from sheet
    try {
      const enrollmentsData = await getEnrollments();
      setEnrolledCourseIds(enrollmentsData.enrollments);
      setCompletedCourseIds(enrollmentsData.completions || []);
    } catch (e) {
      // Ignored quiet logs
    }
  };

  // Submit enrollment securely to backend (syncs with Google Sheet)
  const handleEnrollCourse = async (courseId: string) => {
    if (!user || !selectedCourse) return;

    try {
      const enrollResponse = await enrollInCourse(courseId, selectedCourse.title);
      
      // Fetch latest sheets synchronization to verify matching rows
      const enrollmentsData = await getEnrollments();
      setEnrolledCourseIds(enrollmentsData.enrollments);
      setCompletedCourseIds(enrollmentsData.completions || []);
      
      setSyncStatus({
        sheetsSynced: enrollResponse.sheetsSynced,
        message: enrollResponse.warning || enrollResponse.errorDetails
      });
    } catch (error: any) {
      console.error('Enrollment submission issue:', error);
      // Local optimistic confirmation
      setErrorSyncFallback(courseId);
    }
  };

  // Optimistic fallback if servers trigger custom bounds
  const setErrorSyncFallback = (courseId: string) => {
    if (!enrolledCourseIds.includes(courseId)) {
      const updated = [...enrolledCourseIds, courseId];
      setEnrolledCourseIds(updated);
    }
    setSyncStatus({
      sheetsSynced: false,
      message: "Synced to local container memory fallback. Verify service accounts."
    });
  };

  // Submit completion securely to backend (syncs with Google Sheet status)
  const handleCompleteCourse = async (courseId: string) => {
    if (!user) return;

    try {
      const response = await completeCourse(courseId);
      const enrollmentsData = await getEnrollments();
      setEnrolledCourseIds(enrollmentsData.enrollments);
      setCompletedCourseIds(enrollmentsData.completions || []);

      setSyncStatus({
        sheetsSynced: response.sheetsSynced,
        message: response.warning || response.message
      });
    } catch (error: any) {
      console.error('Completion submission issue:', error);
      // Local optimistic fallback
      if (!completedCourseIds.includes(courseId)) {
        setCompletedCourseIds([...completedCourseIds, courseId]);
      }
      setSyncStatus({
        sheetsSynced: false,
        message: "Marked completed in local container memory fallback."
      });
    }
  };

  if (loading) {
    return (
      <div id="loader-wrapper" className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-[#0070f3] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-gray-550 font-mono text-xs tracking-wider uppercase font-semibold">
          Syncing Mountech Academy Environment...
        </span>
      </div>
    );
  }

  // Safe login routing
  if (!user) {
    return (
      <SignIn onSignInSuccess={handleSignInSuccess} />
    );
  }

  return (
    <div id="app-viewport-wrapper">
      {view === 'detail' && selectedCourse ? (
        <CourseDetail
          course={selectedCourse}
          user={user}
          onBack={handleBackToCatalog}
          isEnrolled={enrolledCourseIds.includes(selectedCourse.id)}
          onEnroll={handleEnrollCourse}
          isCompleted={completedCourseIds.includes(selectedCourse.id)}
          onComplete={handleCompleteCourse}
          syncStatus={syncStatus}
        />
      ) : (
        <Courses
          user={user}
          onSignOut={handleSignOut}
          onSelectCourse={handleSelectCourse}
        />
      )}
    </div>
  );
}
