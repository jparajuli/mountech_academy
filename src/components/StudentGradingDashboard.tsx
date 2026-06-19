import React, { useState, useEffect } from 'react';
import { Course, User } from '../types';
import { fetchStudentExams, getToken } from '../api';
import { 
  Award, 
  TrendingUp, 
  BookOpen, 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  Download, 
  Calendar, 
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface ExamAttempt {
  id: number;
  score: number;
  passed: boolean | number;
  started_at: string;
  completed_at: string | null;
}

interface HydratedExam {
  id: number;
  course_id: string;
  chapter_id?: string | null;
  title: string;
  description?: string;
  questions_to_display?: number;
  passing_score_percentage: number;
  duration_minutes?: number;
  attempts: ExamAttempt[];
  passed: boolean;
  bestAttempt: ExamAttempt | null;
  exam_type?: 'lesson' | 'final';
  lesson_reference?: string | null;
}

interface CourseProgress {
  courseId: string;
  title: string;
  type?: string;
  difficulty?: string;
  exams: HydratedExam[];
  status: 'Completed' | 'In Progress' | 'No Assigned Exams';
  passedCount: number;
  totalCount: number;
  averageScore: number;
  certificateEarned: boolean;
  originalCourse: Course;
}

interface StudentGradingDashboardProps {
  enrolledCourseIds: string[];
  user: User;
  coursesList: Course[];
  onSelectCourse: (course: Course) => void;
}

export const StudentGradingDashboard: React.FC<StudentGradingDashboardProps> = ({
  enrolledCourseIds,
  user,
  coursesList,
  onSelectCourse,
}) => {
  const [courseData, setCourseData] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExams, setExpandedExams] = useState<Record<number, boolean>>({});
  const [downloadingCert, setDownloadingCert] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAllCourseProgress() {
      if (enrolledCourseIds.length === 0) {
        setCourseData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const results: CourseProgress[] = [];

      try {
        for (const courseId of enrolledCourseIds) {
          const originalCourse = coursesList.find(c => c.id === courseId);
          if (!originalCourse) continue;

          // Fetch hydrated exams containing student's attempts
          const response = await fetchStudentExams(courseId);
          if (response && response.success) {
            const exams = (response.exams || []) as HydratedExam[];

            // Determine statistics
            const totalCount = exams.length;
            const passedCount = exams.filter(e => e.passed).length;

            // Calculate Best Attempt Scores Average
            let scoreSum = 0;
            let examsTakenCount = 0;
            exams.forEach(e => {
              if (e.bestAttempt && e.bestAttempt.score !== undefined) {
                scoreSum += e.bestAttempt.score;
                examsTakenCount++;
              }
            });
            const averageScore = examsTakenCount > 0 ? Math.round(scoreSum / examsTakenCount) : 0;

            const finalExams = exams.filter(e => !e.exam_type || e.exam_type === 'final');
            const hasFinalExam = finalExams.length > 0;
            const passedAllFinalExams = hasFinalExam && finalExams.every(e => e.passed);

            // Course level status
            let status: 'Completed' | 'In Progress' | 'No Assigned Exams' = 'In Progress';
            if (totalCount === 0) {
              status = 'No Assigned Exams';
            } else if (passedAllFinalExams) {
              status = 'Completed';
            }

            const certificateEarned = passedAllFinalExams;

            results.push({
              courseId,
              title: originalCourse.title,
              type: originalCourse.type,
              difficulty: originalCourse.difficulty,
              exams,
              status,
              passedCount,
              totalCount,
              averageScore,
              certificateEarned,
              originalCourse,
            });
          }
        }
        setCourseData(results);
      } catch (err: any) {
        console.error("Dashboard calculation error:", err);
        setError("Unable to compute student grade telemetry: " + (err.message || 'Server timeout'));
      } finally {
        setLoading(false);
      }
    }

    loadAllCourseProgress();
  }, [enrolledCourseIds, coursesList]);

  // Collapsible toggle helper
  const toggleExamHistory = (examId: number) => {
    setExpandedExams(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }));
  };

  // Securely trigger certificate download
  const handleDownloadCertificate = async (courseId: string) => {
    setDownloadingCert(prev => ({ ...prev, [courseId]: true }));
    const token = getToken();

    try {
      if (!token) {
        alert("Verification failure: Please sign in again.");
        return;
      }

      // Secure link building supporting fallback paths
      const downloadUrl = `/api/courses/${courseId}/certificate?token=${encodeURIComponent(token)}`;
      
      // Trigger native download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = "_blank";
      link.download = `${courseId}_mountech_certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Certificate download error:", e);
      alert("Failed to secure PDF payload. Contact administrator.");
    } finally {
      setDownloadingCert(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Overview metrics math
  const totalEnrolled = enrolledCourseIds.length;
  const passedExamsTotal = courseData.reduce((acc, c) => acc + c.passedCount, 0);
  const totalExamsAssigned = courseData.reduce((acc, c) => acc + c.totalCount, 0);
  const certificatesEarnedCount = courseData.filter(c => c.certificateEarned).length;

  // Global Average Score
  const validScores = courseData.flatMap(c => c.exams)
    .filter(e => e.bestAttempt !== null)
    .map(e => e.bestAttempt!.score);
  const globalAverageScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length) 
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl p-12">
        <div className="w-10 h-10 border-4 border-[#0070f3] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-gray-550 font-mono text-xs tracking-wider uppercase font-semibold">
          Aggregating grading indexes & certificate signatures...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm">Telemetry Evaluation Error</h3>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in" id="student-grading-portal">
      {/* HEADER COLOURED BRAND RIBBON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#0070f3] tracking-widest uppercase bg-blue-50 border border-blue-150 px-2.5 py-0.5 rounded-full">
            Student Academic Logs
          </span>
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight mt-2 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#0070f3]" />
            Mountech Evaluation & Grading Console
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 pr-6 leading-relaxed">
            Review detailed criteria scores, previous grading attempts, and retrieve authenticated PDF graduation certificates.
          </p>
        </div>

        <div className="text-right shrink-0 bg-slate-50 border border-gray-200 px-4 py-2.5 rounded-xl font-mono text-[10px] text-gray-500">
          <div>Logged User: <span className="font-bold text-gray-800">{user.email}</span></div>
          <div className="mt-0.5">Authorization: <span className="font-bold text-emerald-600 uppercase">Authenticated</span></div>
        </div>
      </div>

      {/* PHASE 2: AT A GLANCE OVERVIEW PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="grading-overview-metrics">
        {/* Metric 1: Average Score */}
        <div className="bg-white border border-gray-200 hover:border-blue-300 transition-all rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">Average Exam Score</span>
            <div className="text-3xl font-extrabold text-slate-900 flex items-baseline gap-1">
              <span>{globalAverageScore}%</span>
              <span className="text-[10px] text-gray-450 font-normal font-sans">weighted</span>
            </div>
            <p className="text-[11px] text-gray-500">across best scores recorded</p>
          </div>
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
            <TrendingUp className="w-6 h-6 text-[#0070f3]" />
          </div>
        </div>

        {/* Metric 2: Exams Passed */}
        <div className={`bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all ${passedExamsTotal > 0 ? 'border-emerald-200 hover:border-emerald-300' : 'border-gray-200'}`}>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">Exams Cleared</span>
            <div className="text-3xl font-extrabold text-slate-900">
              {passedExamsTotal} <span className="text-lg font-normal text-gray-400">/ {totalExamsAssigned}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {totalExamsAssigned === 0 ? 'No current unit examinations' : `${Math.round((passedExamsTotal / (totalExamsAssigned || 1)) * 100)}% passing rate`}
            </p>
          </div>
          <div className={`p-3.5 rounded-2xl border ${passedExamsTotal > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-gray-100'}`}>
            <Award className={`w-6 h-6 ${passedExamsTotal > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
        </div>

        {/* Metric 3: Certificates Earned */}
        <div className={`bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between transition-all md:col-span-2 lg:col-span-1 ${certificatesEarnedCount > 0 ? 'border-indigo-200 hover:border-indigo-300' : 'border-gray-200'}`}>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">Official Credentials</span>
            <div className="text-3xl font-extrabold text-slate-900">
              {certificatesEarnedCount} <span className="text-lg font-normal text-gray-400">Earned</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {totalEnrolled === 0 ? 'Enrolled in 0 lectures' : `Course completeness: ${Math.round((certificatesEarnedCount / (totalEnrolled || 1)) * 100)}%`}
            </p>
          </div>
          <div className={`p-3.5 rounded-2xl border ${certificatesEarnedCount > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-gray-100'}`}>
            <BookOpen className={`w-6 h-6 ${certificatesEarnedCount > 0 ? 'text-indigo-600' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* EMPTY STATE CONVERTED */}
      {totalEnrolled === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center" id="empty-enrollments-dashboard">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-gray-900">No Enrolled Courses Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Please register for active courses in the main Academy Catalog to synchronize syllabus materials and access evaluation nodes.
          </p>
        </div>
      ) : (
        <div className="space-y-8" id="dashboard-course-list">
          <h2 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">Course Evaluations & Syllabus Progress</h2>

          {courseData.map((courseProgress) => {
            const hasExamsObj = courseProgress.exams.length > 0;
            const completedStatus = courseProgress.status === 'Completed';

            return (
              <div 
                key={courseProgress.courseId} 
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                id={`course-progress-card-${courseProgress.courseId}`}
              >
                {/* COURSE SUBHEADER */}
                <div className="bg-slate-50 border-b border-gray-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        {courseProgress.type || 'Lecture'}
                      </span>
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        {courseProgress.difficulty || 'All Skill Levels'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-2 tracking-tight">
                      {courseProgress.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Course completion badge */}
                    {courseProgress.status === 'Completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Course Complete
                      </span>
                    ) : courseProgress.status === 'No Assigned Exams' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-505 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        No Evaluation Nodes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        In Progress ({courseProgress.passedCount}/{courseProgress.totalCount})
                      </span>
                    )}

                    <button
                      onClick={() => onSelectCourse(courseProgress.originalCourse)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Syllabus Workbench</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* VISUAL CERTIFICATE INTERLOCK GATE */}
                {courseProgress.certificateEarned && (
                  <div className="bg-gradient-to-r from-emerald-50 via-[#f0fdf4] to-blue-50 border-b border-emerald-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900 tracking-tight">Academic Completion Certificate Released</h4>
                        <p className="text-xs text-emerald-700 mt-1 max-w-xl leading-relaxed">
                          Magnificent! You have successfully passed all examinations assigned to this program curriculum and achieved average mark of <strong>{courseProgress.averageScore}%</strong>. Download your official, cryptographically verified graduation PDF document now.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadCertificate(courseProgress.courseId)}
                      disabled={downloadingCert[courseProgress.courseId]}
                      className="md:self-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloadingCert[courseProgress.courseId] ? 'Signing Certificate...' : 'Download Official Certificate'}</span>
                    </button>
                  </div>
                )}

                {/* EXAMS CONTAINER */}
                <div className="p-6">
                  {!hasExamsObj ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                      <span>No dynamic exam modules have been assigned by the course instructors.</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {courseProgress.exams.map((exam) => {
                        const isExpanded = !!expandedExams[exam.id];
                        const bestScore = exam.bestAttempt ? exam.bestAttempt.score : null;
                        const isCleared = exam.passed;
                        const requiresPassing = exam.passing_score_percentage || 70;

                        return (
                          <div 
                            key={exam.id} 
                            className={`border rounded-xl overflow-hidden transition-all ${isCleared ? 'border-emerald-100 bg-emerald-50/10' : bestScore !== null ? 'border-amber-100 bg-amber-50/5' : 'border-gray-150'}`}
                            id={`exam-node-${exam.id}`}
                          >
                            {/* Exam Row Header */}
                            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-extrabold text-slate-950 text-sm leading-snug">{exam.title}</h4>
                                  
                                  {exam.exam_type === 'lesson' ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                                      <BookOpen className="w-2.5 h-2.5" />
                                      {exam.lesson_reference || "Lesson Quiz"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded uppercase">
                                      <Award className="w-2.5 h-2.5" />
                                      Final Exam
                                    </span>
                                  )}

                                  {exam.chapter_id && (
                                    <span className="text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded">
                                      {exam.chapter_id}
                                    </span>
                                  )}

                                  {isCleared ? (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase bg-emerald-105 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      Passed
                                    </span>
                                  ) : bestScore !== null ? (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase bg-amber-105 text-amber-805 border border-amber-205 px-2 py-0.5 rounded-full">
                                      Retake Required
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase bg-slate-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                                      Unsubmitted
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-505 leading-relaxed max-w-2xl">
                                  {exam.description || 'Comprehensive competency test designed to validate understanding of key course targets.'}
                                </p>
                              </div>

                              {/* Progress metrics and CTA */}
                              <div className="flex flex-wrap items-center gap-4 md:text-right shrink-0">
                                <div className="flex flex-col gap-1 min-w-[120px]">
                                  <div className="flex justify-between text-[11px] font-mono text-gray-500">
                                    <span>Highest Mark:</span>
                                    <span className="font-bold text-gray-900">{bestScore !== null ? `${bestScore}%` : '—'}</span>
                                  </div>
                                  
                                  {/* Score Progress Bar */}
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-gray-200">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${isCleared ? 'bg-emerald-500' : bestScore !== null ? 'bg-amber-500' : 'bg-slate-300'}`} 
                                      style={{ width: `${bestScore !== null ? Math.min(100, bestScore) : 0}%` }}
                                    />
                                  </div>

                                  <span className="text-[9px] font-bold font-mono text-gray-400 mt-1 uppercase tracking-wider">
                                    Passing Bar: {requiresPassing}%
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Accordion view history button */}
                                  <button
                                    onClick={() => toggleExamHistory(exam.id)}
                                    title="View grading tries history log"
                                    className="px-2.5 py-2.5 text-xs text-gray-650 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>

                                  {/* TAKE/RETAKE BUTTON COAX */}
                                  {!isCleared ? (
                                    <button
                                      onClick={() => onSelectCourse(courseProgress.originalCourse)}
                                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-transform hover:scale-[1.02] cursor-pointer"
                                    >
                                      {bestScore !== null ? 'Retake assessment' : 'Take Exam'}
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="px-4 py-2 bg-emerald-50 text-emerald-805 border border-emerald-1.5 px-3 py-2.5 text-xs font-bold rounded-lg cursor-not-allowed inline-flex items-center gap-1"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Complete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Collapsible Attempts History list */}
                            {isExpanded && (
                              <div className="bg-[#fcfdfe] border-t border-gray-150 p-4 sm:p-5 text-xs space-y-3">
                                <h5 className="font-bold font-mono text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  Examinations History Trials Log ({exam.attempts.length})
                                </h5>

                                {exam.attempts.length === 0 ? (
                                  <div className="text-gray-400 py-2 italic">
                                    No submissions recorded for this credential. Open the course workbench syllabus to complete your initial attempt.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto border border-gray-150 rounded-xl bg-white">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 text-[9px] font-bold font-mono text-gray-400 uppercase border-b border-gray-150">
                                          <th className="py-2.5 px-4">Trial ID</th>
                                          <th className="py-2.5 px-4 font-mono">Date Started / Completed</th>
                                          <th className="py-2.5 px-4 text-center">Score Mark</th>
                                          <th className="py-2.5 px-4 text-center">Target Result</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 text-[11px]">
                                        {exam.attempts.map((attempt) => {
                                          const isPassedTrial = typeof attempt.passed === 'boolean' ? attempt.passed : attempt.passed === 1;
                                          return (
                                            <tr key={attempt.id} className="hover:bg-slate-50/50">
                                              <td className="py-3 px-4 font-mono text-[10px] text-gray-500 font-semibold select-all">
                                                #{attempt.id}
                                              </td>
                                              <td className="py-3 px-4 text-gray-600 font-mono text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar className="w-3 h-3 text-gray-400" />
                                                  <span>{new Date(attempt.started_at).toLocaleString()}</span>
                                                </div>
                                              </td>
                                              <td className="py-3 px-4 text-center leading-none">
                                                <span className={`inline-block font-mono font-bold text-xs ${isPassedTrial ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                  {attempt.score}%
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-center">
                                                {isPassedTrial ? (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Passed
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase border bg-red-50 text-rose-700 border-red-200">
                                                    Failed
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER ACADEMY META */}
      <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-405 gap-4">
        <span>© 2026 Mountech Academy Operations. Secure Blockchain-Signatures Activated.</span>
        <div className="flex gap-4">
          <span className="hover:text-gray-700 cursor-pointer">Institutional Policies</span>
          <span>•</span>
          <span className="hover:text-gray-700 cursor-pointer">Verification Registry</span>
        </div>
      </div>
    </div>
  );
};
