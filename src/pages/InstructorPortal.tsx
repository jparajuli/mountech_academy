import React, { useState, useEffect } from 'react';
import { Course, User } from '../types';
import { 
  fetchInstructorDashboard, 
  fetchInstructorCourseStudents, 
  fetchInstructorCourseMaterials, 
  addCourseMaterial, 
  EnrolledStudent, 
  CourseMaterial 
} from '../api';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  FileText, 
  Plus, 
  ExternalLink, 
  Clock, 
  GraduationCap, 
  FileUp, 
  CheckCircle2, 
  Calendar,
  Search,
  BookMarked,
  FileEdit,
  ClipboardList
} from 'lucide-react';
import { SyllabusEditor } from '../components/Shared/SyllabusEditor';
import { InstructorExamBuilder } from '../components/InstructorExamBuilder';

interface InstructorPortalProps {
  user: User;
  onSignOut: () => void;
}

export default function InstructorPortal({ user, onSignOut }: InstructorPortalProps) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Monitor URL path changes for routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Sync / Load Assigned Courses
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoadingCourses(true);
        const res = await fetchInstructorDashboard();
        if (res.success) {
          setCourses(res.courses);
        } else {
          setCoursesError('Failed to fetch assigned courses.');
        }
      } catch (err: any) {
        setCoursesError(err.message || 'Error occurred while loading assigned courses.');
      } finally {
        setLoadingCourses(false);
      }
    }
    loadDashboard();
  }, [currentPath]);

  // Route parser
  const isCourseManagementPath = currentPath.startsWith('/instructor/courses/');
  const currentCourseId = isCourseManagementPath ? currentPath.substring('/instructor/courses/'.length) : null;
  const activeCourse = courses.find(c => c.id === currentCourseId);

  // Helper to change path SPA-style
  const navigateTo = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-45 bg-white border-b border-gray-150 py-4 px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Return to main site
                window.history.pushState(null, '', '/');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="mr-1 inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              title="Return to Scholar Catalog"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-md font-bold text-gray-900 tracking-tight">Mountech Faculty Suite</h1>
                <p className="text-[10px] text-gray-400 font-medium font-mono uppercase tracking-wider">Instructor Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-900">{user.name}</span>
              <span className="text-[9px] font-mono font-extrabold tracking-wider uppercase text-indigo-600 self-end px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full mt-0.5">
                Instructor
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-indigo-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {isCourseManagementPath && activeCourse ? (
          <CourseManagementView 
            course={activeCourse} 
            onBack={() => navigateTo('/instructor')} 
          />
        ) : (
          <MainDashboard 
            courses={courses} 
            loading={loadingCourses} 
            error={coursesError}
            onSelectCourse={(course) => navigateTo(`/instructor/courses/${course.id}`)}
          />
        )}
      </main>

      <footer className="bg-white border-t border-gray-150 py-6 text-center text-xs text-gray-400">
        <p>© 2026 Mountech Academy. All Instructor session tools are active and logged for verification.</p>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// -------------------------------------------------------------
interface MainDashboardProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
  onSelectCourse: (course: Course) => void;
}

function MainDashboard({ courses, loading, error, onSelectCourse }: MainDashboardProps) {
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Synchronizing Faculty Courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl max-w-2xl mx-auto my-10 text-center">
        <h3 className="text-gray-900 font-bold text-md mb-1">Faculty Sync Error</h3>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
        >
          Reload Portal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-gray-900">Assigned Courses</h2>
          <p className="text-sm text-gray-500 mt-1">Review, monitor rosters, and post educational materials for your active classrooms.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-medium font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
          <BookMarked className="w-4 h-4" />
          <span>{courses.length} Classroom{courses.length !== 1 && 's'} Found</span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No Active Assignments</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            The curriculum coordinator has not assigned your faculty profile to any course yet. Please contact the Board Admin if this is an oversight.
          </p>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new Event('popstate'));
            }}
            className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
          >
            <span>Browse Catalog</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const thumbnailBgColor = course.thumbnailBg || '#f3f4f6';
            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="group relative bg-white rounded-xl border border-gray-150 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all duration-250 cursor-pointer flex flex-col h-full overflow-hidden"
              >
                {/* Course color card top bar */}
                <div 
                  className="h-2 w-full transition-all group-hover:h-3"
                  style={{ backgroundColor: thumbnailBgColor }}
                />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Category Tag */}
                  <div className="mb-3">
                    <span className="text-[9px] font-bold font-mono tracking-wider uppercase bg-gray-100 text-gray-600 border border-gray-150 rounded-full px-2 py-0.5">
                      {course.topic}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-[#111827] font-bold text-base leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-500 line-clamp-2 md:line-clamp-3 mb-4 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] font-mono font-medium text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>{course.lessonCount}</span>
                    </div>
                  </div>
                </div>

                {/* Manage Hover Hint */}
                <div className="bg-gray-50 border-t border-gray-100 py-2.5 px-5 text-center text-xs font-bold text-indigo-600 transition-all opacity-90 group-hover:bg-indigo-50/50 flex items-center justify-center gap-1 select-none">
                  <span>Manage Classroom</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// COURSE MANAGEMENT VIEW (TABS INCLUDED)
// -------------------------------------------------------------
interface CourseManagementProps {
  course: Course;
  onBack: () => void;
}

function CourseManagementView({ course, onBack }: CourseManagementProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'materials' | 'syllabus' | 'exams'>('students');
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  // Form states for materials adding
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Tab 1 (Students) loader
  async function loadStudents() {
    try {
      setLoadingStudents(true);
      setStudentsError(null);
      const res = await fetchInstructorCourseStudents(course.id);
      if (res.success) {
        setStudents(res.students);
      } else {
        setStudentsError('Failed to retrieve enrolled study roster.');
      }
    } catch (err: any) {
      setStudentsError(err.message || 'Error occurred while loading enrolled scholars.');
    } finally {
      setLoadingStudents(false);
    }
  }

  // Tab 2 (Materials) loader
  async function loadMaterials() {
    try {
      setLoadingMaterials(true);
      setMaterialsError(null);
      const res = await fetchInstructorCourseMaterials(course.id);
      if (res.success) {
        setMaterials(res.materials);
      } else {
        setMaterialsError('Failed to load course materials.');
      }
    } catch (err: any) {
      setMaterialsError(err.message || 'Error occurred while fetching files.');
    } finally {
      setLoadingMaterials(false);
    }
  }

  // Initial trigger
  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    } else if (activeTab === 'materials') {
      loadMaterials();
    }
  }, [course.id, activeTab]);

  // Form submit handler
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!newTitle.trim()) {
      setFormError('Please input a valid material name/title.');
      return;
    }
    if (!newUrl.trim()) {
      setFormError('Please specify a secure material URL link.');
      return;
    }

    try {
      setSubmittingMaterial(true);
      const res = await addCourseMaterial(course.id, newTitle.trim(), newUrl.trim());
      if (res.success) {
        setFormSuccess(true);
        setNewTitle('');
        setNewUrl('');
        // Reload list directly
        setMaterials(prev => [res.material, ...prev]);
        setTimeout(() => setFormSuccess(false), 4000);
      } else {
        setFormError(res.message || 'Error during file insertion.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Connection failed during submission.');
    } finally {
      setSubmittingMaterial(false);
    }
  };

  // Drag and Drop Simulator / Hook helper
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt && dt.files.length > 0) {
      const file = dt.files[0];
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
      // Create a mock URL or set a file path hint
      setNewUrl(`https://mountech.storage.academy/faculties/${course.id}/${encodeURIComponent(file.name)}`);
    } else {
      // Check if dropped URL text
      const droppedUrl = dt.getData('text');
      if (droppedUrl) {
        setNewUrl(droppedUrl);
        // Deduce a title if possible
        try {
          const parsed = new URL(droppedUrl);
          const parts = parsed.pathname.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart) setNewTitle(decodeURIComponent(lastPart).replace(/\.[^/.]+$/, ""));
        } catch (_) {}
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button and title */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 font-semibold cursor-pointer select-none mb-4 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Assigned Classrooms</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-full">
                {course.topic}
              </span>
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase bg-gray-100 border border-gray-150 text-gray-500 px-2.5 py-0.5 rounded-full">
                {course.difficulty}
              </span>
            </div>
            <h2 className="text-2xl font-bold font-sans text-gray-900 tracking-tight mt-2">{course.title}</h2>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-6 text-sm font-semibold select-none overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 border-b-2 hover:text-[#0070f3] cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'students' ? 'text-[#0070f3] border-[#0070f3]' : 'text-gray-500 border-transparent'}`}
          >
            <Users className="w-4 h-4" />
            <span>Students Roster</span>
            <span className="text-[10px] bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-indigo-700 font-mono">
              {students.length} Enrolled
            </span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-3 border-b-2 hover:text-[#0070f3] cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'materials' ? 'text-[#0070f3] border-[#0070f3]' : 'text-gray-500 border-transparent'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Educational Materials</span>
          </button>
          <button
            onClick={() => setActiveTab('syllabus')}
            className={`pb-3 border-b-2 hover:text-[#0070f3] cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'syllabus' ? 'text-[#0070f3] border-[#0070f3]' : 'text-gray-500 border-transparent'}`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Syllabus Layout</span>
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-3 border-b-2 hover:text-[#0070f3] cursor-pointer transition-colors flex items-center gap-2 ${activeTab === 'exams' ? 'text-[#0070f3] border-[#0070f3]' : 'text-gray-500 border-transparent'}`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Exam Builder</span>
          </button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div>
        {activeTab === 'students' ? (
          <div className="space-y-4 animate-fade-in">
            {studentsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm leading-relaxed">
                {studentsError}
              </div>
            )}

            {loadingStudents ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-[11px] font-mono text-gray-500 tracking-wider">Syncing Enrolled Scholars...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="bg-white border border-gray-150 rounded-xl p-12 text-center text-gray-500 max-w-xl mx-auto shadow-sm">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-gray-900 font-bold text-sm mb-1">No Active Enrollments</h4>
                <p className="text-xs text-gray-500">Currently, no study files or registration paths have been logged for this classroom track.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-150 text-gray-400 font-semibold text-[11px] uppercase tracking-wider font-mono">
                      <th className="py-3 px-6">Name of Scholar</th>
                      <th className="py-3 px-6">Email Address</th>
                      <th className="py-3 px-6">Enrollment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-gray-950 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{student.name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-gray-500 font-mono text-xs">{student.email}</td>
                        <td className="py-3.5 px-6 text-gray-400 flex items-center gap-1 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          <span>
                            {student.enrollmentDate 
                              ? new Date(student.enrollmentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'materials' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
            {/* Form column */}
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 mb-1">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Post Educational Material</span>
                </h3>
                <p className="text-[11px] text-gray-400">Add secure downloads (PDF, files, code repositories, etc.) directly as syllabus resources.</p>
              </div>

              {/* DRAG AND DROP AREA */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="group border border-dashed border-gray-200 hover:border-indigo-400 rounded-lg p-4 bg-gray-50 hover:bg-indigo-50/20 text-center transition-all cursor-pointer flex flex-col items-center justify-center select-none"
              >
                <FileUp className="w-7 h-7 text-gray-400 group-hover:text-indigo-600 group-hover:scale-105 transition-all mb-2" />
                <p className="text-[11px] font-semibold text-gray-700">Drag & Drop file or URL here</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Supports direct drop of files to auto-synthesize info</p>
              </div>

              <form onSubmit={handleAddMaterial} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-mono mb-1">
                    Resource / Material Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. ChatGPT Advanced Tuning Lab Guide"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-mono mb-1">
                    Secure Web File URL
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://mountech.storage.academy/docs/lab1.pdf"
                    className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-red-700 text-[10px] leading-relaxed">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="bg-emerald-50 border border-emerald-250 p-2.5 rounded-lg text-emerald-800 text-[10px] flex items-center gap-1.5 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Material posted successfully. Classroom is updated.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingMaterial}
                  className="w-full inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingMaterial ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Post Material</span>
                </button>
              </form>
            </div>

            {/* List column */}
            <div className="lg:col-span-2 space-y-4">
              {materialsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
                  {materialsError}
                </div>
              )}

              {loadingMaterials ? (
                <div className="py-12 bg-white border border-gray-150 rounded-xl flex flex-col items-center justify-center shadow-sm">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-[11px] font-mono text-gray-500 tracking-wider">Loading Posted Session Materials...</p>
                </div>
              ) : materials.length === 0 ? (
                <div className="bg-white border border-gray-150 rounded-xl p-12 text-center text-gray-400 shadow-sm">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-gray-900 font-bold text-sm mb-1">No Materials Posted Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Be the first to post course blueprints, notes, slides, web links, or syllabus files. They appear here immediately for student access.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-gray-150 p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center font-bold">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-950 text-xs leading-normal">{m.title}</h4>
                          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {m.created_at
                                ? new Date(m.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Uploaded Just Now'
                              }
                            </span>
                          </span>
                        </div>
                      </div>

                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="referrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer select-none"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'syllabus' ? (
          <div className="animate-fade-in">
            <SyllabusEditor 
              courseId={course.id} 
              initialSyllabusContent={course.syllabus_content || ''} 
              onSyllabusSaved={(newContent) => {
                course.syllabus_content = newContent;
              }}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <InstructorExamBuilder courseId={course.id} />
          </div>
        )}
      </div>
    </div>
  );
}
