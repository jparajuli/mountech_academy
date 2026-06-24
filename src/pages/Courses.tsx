import React, { useState, useMemo, useEffect } from 'react';
import { Course, User, InstructorProfile } from '../types';
import { courses } from '../courses';
import CourseCard from '../components/CourseCard';
import FilterBar from '../components/FilterBar';
import ResourcePortal from '../components/ResourcePortal';
import ManageInstructors from '../components/ManageInstructors';
import AdminPaymentApproval from '../components/AdminPaymentApproval';
import AdminStudentMatrix from '../components/AdminStudentMatrix';
import MyProfileSettings from '../components/MyProfileSettings';
import { StudentGradingDashboard } from '../components/StudentGradingDashboard';
import { SyllabusEditor } from '../components/Shared/SyllabusEditor';
import { 
  LogOut, GraduationCap, ArrowUpRight, HelpCircle, 
  Shield, Check, Lock, Server, Activity,
  Plus, Trash2, BookOpen, Sparkles, DollarSign, Award, Compass, ChevronLeft, Video
} from 'lucide-react';
import { 
  adminListUsers, adminUpdateUserRole, 
  adminListEnrollments, fetchCoursesList, createNewCourse,
  fetchAdminCoursesList, updateCourseDetails, toggleCourseLockStatus, scheduleLiveSession,
  fetchInstructors
} from '../api';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CoursesProps {
  user: User;
  onSignOut: () => void;
  onSelectCourse: (course: Course) => void;
  enrolledCourseIds: string[];
}

export default function Courses({ user, onSignOut, onSelectCourse, enrolledCourseIds }: CoursesProps) {
  const [currentMenuTab, setCurrentMenuTab] = useState<'catalog' | 'resources' | 'admin' | 'instructor-profile' | 'grades'>(() => {
    const saved = localStorage.getItem("mountech_courses_tab");
    if (saved === 'resources' || saved === 'catalog' || saved === 'admin' || saved === 'instructor-profile' || saved === 'grades') {
      localStorage.removeItem("mountech_courses_tab");
      return saved;
    }
    return 'catalog';
  });
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'instructors' | 'payments' | 'matrix'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');

  // Admin & Developer tab states
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [rbacMessage, setRbacMessage] = useState('');

  // Course registrations & payment fees states
  const [adminEnrollments, setAdminEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Dynamic courses and dynamic creation states
  const [coursesList, setCoursesList] = useState<Course[]>(courses); // Start with static baseline
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showCreateCourseSection, setShowCreateCourseSection] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Create course Form states
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseType, setNewCourseType] = useState<'Short Course' | 'Course' | 'Professional Certificate'>('Short Course');
  const [newCourseDifficulty, setNewCourseDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [newCourseTopic, setNewCourseTopic] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseFullDesc, setNewCourseFullDesc] = useState('');
  const [newCourseInstName, setNewCourseInstName] = useState('');
  const [newCourseInstTitle, setNewCourseInstTitle] = useState('');
  const [instructorsList, setInstructorsList] = useState<InstructorProfile[]>([]);
  const [newCourseInstProfileId, setNewCourseInstProfileId] = useState<string>('');
  const [newCourseInstProfileIds, setNewCourseInstProfileIds] = useState<string[]>(['']);
  const [newCourseDuration, setNewCourseDuration] = useState('');
  const [newCourseLessonCount, setNewCourseLessonCount] = useState('');
  const [newCoursePartner, setNewCoursePartner] = useState('');
  const [newCourseThumbnailBg, setNewCourseThumbnailBg] = useState('bg-indigo-950 text-indigo-400');
  const [newCourseThumbnailIcon, setNewCourseThumbnailIcon] = useState('agents');
  const [newCourseIsPaid, setNewCourseIsPaid] = useState(false);
  const [newCoursePrice, setNewCoursePrice] = useState('49');

  // Interactive content sublists
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [currSkill, setCurrSkill] = useState('');
  
  const [reqsList, setReqsList] = useState<string[]>([]);
  const [currReq, setCurrReq] = useState('');

  const [syllabusList, setSyllabusList] = useState<{ chapter: string; title: string; description: string }[]>([]);
  const [editingSyllabusContent, setEditingSyllabusContent] = useState<string>('');
  const [currChapter, setCurrChapter] = useState('');
  const [currChapTitle, setCurrChapTitle] = useState('');
  const [currChapDesc, setCurrChapDesc] = useState('');
  
  const [createCourseError, setCreateCourseError] = useState('');
  const [createCourseSuccess, setCreateCourseSuccess] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Live Session Scheduling States
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [sessionMeetUrl, setSessionMeetUrl] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const resetForm = () => {
    setNewCourseTitle('');
    setNewCourseType('Short Course');
    setNewCourseDifficulty('Beginner');
    setNewCourseTopic('');
    setNewCourseDescription('');
    setNewCourseFullDesc('');
    setNewCourseInstName('');
    setNewCourseInstTitle('');
    setNewCourseInstProfileId('');
    setNewCourseInstProfileIds(['']);
    setNewCourseDuration('');
    setNewCourseLessonCount('');
    setNewCoursePartner('');
    setNewCourseThumbnailBg('bg-indigo-950 text-indigo-400');
    setNewCourseThumbnailIcon('agents');
    setNewCourseIsPaid(false);
    setNewCoursePrice('49');
    setSkillsList([]);
    setReqsList([]);
    setSyllabusList([]);
    setEditingSyllabusContent('');
    setEditingCourseId(null);
    setCreateCourseError('');
    setCreateCourseSuccess('');
  };

  const loadCourses = () => {
    setCoursesLoading(true);
    const isAdminOrDev = user && user.role === 'admin';
    const fetchFn = isAdminOrDev ? fetchAdminCoursesList : fetchCoursesList;

    fetchFn()
      .then((res) => {
        if (res.success && res.courses) {
          setCoursesList(res.courses);
        }
      })
      .catch((err) => {
        console.error("Failed to load dynamic courses from server SQLite index:", err);
      })
      .finally(() => {
        setCoursesLoading(false);
      });
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const res = await fetchInstructors();
        if (res && res.success) {
          setInstructorsList(res.profiles || []);
        }
      } catch (err) {
        console.warn("Failed to load instructors list when mounting:", err);
      }
    };
    loadInstructors();
  }, []);

  const handleAddSkill = () => {
    if (currSkill.trim() && !skillsList.includes(currSkill.trim())) {
      setSkillsList([...skillsList, currSkill.trim()]);
      setCurrSkill('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkillsList(skillsList.filter((_, i) => i !== index));
  };

  const handleAddReq = () => {
    if (currReq.trim() && !reqsList.includes(currReq.trim())) {
      setReqsList([...reqsList, currReq.trim()]);
      setCurrReq('');
    }
  };

  const handleRemoveReq = (index: number) => {
    setReqsList(reqsList.filter((_, i) => i !== index));
  };

  const handleAddSyllabus = () => {
    if (currChapter.trim() && currChapTitle.trim() && currChapDesc.trim()) {
      setSyllabusList([...syllabusList, {
        chapter: currChapter.trim(),
        title: currChapTitle.trim(),
        description: currChapDesc.trim()
      }]);
      setCurrChapter('');
      setCurrChapTitle('');
      setCurrChapDesc('');
    }
  };

  const handleRemoveSyllabus = (index: number) => {
    setSyllabusList(syllabusList.filter((_, i) => i !== index));
  };

  const handleScheduleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId) return;
    setScheduling(true);
    setScheduleSuccess('');
    setScheduleError('');

    try {
      if (!sessionMeetUrl.startsWith('http://') && !sessionMeetUrl.startsWith('https://')) {
        throw new Error('A valid meeting URL starting with http:// or https:// is required.');
      }

      // Convert local date inputs to UTC ISO strings
      const startIso = new Date(sessionStart).toISOString();
      const endIso = new Date(sessionEnd).toISOString();

      const res = await scheduleLiveSession(editingCourseId, {
        title: sessionTitle || 'Live Online Class Session',
        start_time: startIso,
        end_time: endIso,
        meet_url: sessionMeetUrl.trim()
      });

      if (res.success) {
        setScheduleSuccess(`Course lecture session "${sessionTitle}" successfully scheduled!`);
        setSessionTitle('');
        setSessionStart('');
        setSessionEnd('');
        setSessionMeetUrl('');
        setTimeout(() => setScheduleSuccess(''), 4000);
      }
    } catch (err: any) {
      setScheduleError(err?.message || 'Unable to schedule live class seminar.');
    } finally {
      setScheduling(false);
    }
  };

  const handleStartEditCourse = (course: Course) => {
    setNewCourseTitle(course.title);
    setNewCourseType(course.type);
    setNewCourseDifficulty(course.difficulty);
    setNewCourseTopic(course.topic);
    setNewCourseDescription(course.description);
    setNewCourseFullDesc(course.fullDescription || '');
    setNewCourseInstName(course.instructorName || '');
    setNewCourseInstTitle(course.instructorTitle || '');
    setNewCourseInstProfileId(course.instructor_profile_id ? String(course.instructor_profile_id) : '');
    
    // Prefill multi-instructors array
    let profileIds: string[] = [];
    if (course.instructors && course.instructors.length > 0) {
      profileIds = course.instructors.map(ci => {
        const match = instructorsList.find(i => (ci.id && Number(i.id) === Number(ci.id)) || i.full_name === ci.name);
        return match ? String(match.id) : '';
      }).filter(Boolean);
    }
    if (profileIds.length === 0 && course.instructor_profile_id) {
      profileIds = [String(course.instructor_profile_id)];
    }
    if (profileIds.length === 0) {
      profileIds = [''];
    }
    setNewCourseInstProfileIds(profileIds);

    setNewCourseDuration(course.duration || '');
    setNewCourseLessonCount(course.lessonCount || '');
    setNewCoursePartner(course.partnerName || '');
    setNewCourseThumbnailBg(course.thumbnailBg || 'bg-indigo-950 text-indigo-400');
    setNewCourseThumbnailIcon(course.thumbnailIconCode || 'agents');
    setNewCourseIsPaid(!!course.isPaid);
    setNewCoursePrice(String(course.price || '49'));
    setSkillsList(course.skillsAcquired || []);
    setReqsList(course.requirements || []);
    setSyllabusList(course.syllabus || []);
    setEditingSyllabusContent((course as any).syllabus_content || '');
    
    setEditingCourseId(course.id);
    setShowCreateCourseSection(true);
  };

  const handleToggleCourseLock = async (courseId: string, currentIsLocked: boolean) => {
    try {
      const res = await toggleCourseLockStatus(courseId, !currentIsLocked);
      if (res.success) {
        setRbacMessage(`Curriculum visibility locked status updated successfully.`);
        loadCourses();
        setTimeout(() => setRbacMessage(''), 3000);
      }
    } catch (err: any) {
      setUsersError(err.message || "Failed to update curriculum lock status.");
      setTimeout(() => setUsersError(''), 4000);
    }
  };

  const executeCourseUpdate = async () => {
    if (!editingCourseId) return;
    setCreatingCourse(true);
    setCreateCourseError('');
    setCreateCourseSuccess('');

    try {
      const payload = {
        title: newCourseTitle,
        type: newCourseType,
        difficulty: newCourseDifficulty,
        topic: newCourseTopic || "Artificial Intelligence",
        description: newCourseDescription,
        fullDescription: newCourseFullDesc,
        instructorName: newCourseInstName || user.name,
        instructorTitle: newCourseInstTitle || "Mountech Academy Instructor",
        duration: newCourseDuration || "2 hours",
        lessonCount: newCourseLessonCount || `${syllabusList.length} lessons`,
        partnerName: newCoursePartner || "Mountech Academy",
        skillsAcquired: skillsList,
        requirements: reqsList,
        syllabus: syllabusList,
        thumbnailBg: newCourseThumbnailBg,
        thumbnailIconCode: newCourseThumbnailIcon,
        isPaid: newCourseIsPaid,
        price: newCourseIsPaid ? Number(newCoursePrice) : 0,
        instructor_ids: newCourseInstProfileIds.filter(Boolean)
      };

      const res = await updateCourseDetails(editingCourseId, payload);
      if (res.success) {
        setCreateCourseSuccess(`Course successfully updated: "${newCourseTitle}" is now live!`);
        setShowConfirmModal(false);
        loadCourses();
        setTimeout(() => {
          setShowCreateCourseSection(false);
          resetForm();
        }, 1500);
      }
    } catch (err: any) {
      setCreateCourseError(err.message || 'Unable to update curriculum content details.');
      setShowConfirmModal(false);
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCourseError('');
    setCreateCourseSuccess('');

    if (!newCourseTitle.trim()) {
      setCreateCourseError("A distinct Course Title is required.");
      return;
    }
    if (!newCourseDescription.trim() || !newCourseFullDesc.trim()) {
      setCreateCourseError("Full informational and brief module desc is required.");
      return;
    }
    if (newCourseIsPaid && (!newCoursePrice || Number(newCoursePrice) <= 0)) {
      setCreateCourseError("Tuition pricing fee is required for premium classes.");
      return;
    }
    if (syllabusList.length === 0) {
      setCreateCourseError("Course content syllabus is required! Please add at least one lesson topic module below.");
      return;
    }

    if (editingCourseId) {
      // Intercept with the warning modal
      setShowConfirmModal(true);
      return;
    }

    setCreatingCourse(true);
    try {
      const payload = {
        title: newCourseTitle,
        type: newCourseType,
        difficulty: newCourseDifficulty,
        topic: newCourseTopic || "Artificial Intelligence",
        description: newCourseDescription,
        fullDescription: newCourseFullDesc,
        instructorName: newCourseInstName || user.name,
        instructorTitle: newCourseInstTitle || "Mountech Academy Instructor",
        duration: newCourseDuration || "2 hours",
        lessonCount: newCourseLessonCount || `${syllabusList.length} lessons`,
        partnerName: newCoursePartner || "Mountech Academy",
        skillsAcquired: skillsList,
        requirements: reqsList,
        syllabus: syllabusList,
        thumbnailBg: newCourseThumbnailBg,
        thumbnailIconCode: newCourseThumbnailIcon,
        isPaid: newCourseIsPaid,
        price: newCourseIsPaid ? Number(newCoursePrice) : 0,
        instructor_profile_id: null,
        instructor_ids: newCourseInstProfileIds.filter(Boolean)
      };

      const res = await createNewCourse(payload);
      if (res.success) {
        setCreateCourseSuccess(res.message || "Course and curriculum content successfully synchronized!");
        
        loadCourses();

        setTimeout(() => {
          setShowCreateCourseSection(false);
          resetForm();
        }, 2000);
      }
    } catch (err: any) {
      setCreateCourseError(err.message || 'Unable to provision new syllabus module schema details.');
    } finally {
      setCreatingCourse(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return managedUsers;
  }, [managedUsers]);

  const loadAdminData = () => {
    if (user.role === 'admin') {
      setLoadingUsers(true);
      setUsersError('');
      adminListUsers()
        .then((res) => {
          setManagedUsers(res.users || []);
        })
        .catch((err) => {
          setUsersError(err.message || 'Failed to sync users database panel.');
        })
        .finally(() => {
          setLoadingUsers(false);
        });

      setLoadingEnrollments(true);
      adminListEnrollments()
        .then((res) => {
          setAdminEnrollments(res.enrollments || []);
        })
        .catch((err) => {
          console.error("Failed to sync registrations/payment diagnostics:", err);
        })
        .finally(() => {
          setLoadingEnrollments(false);
        });
    }
  };

  useEffect(() => {
    if (currentMenuTab === 'admin') {
      loadAdminData();
    }
  }, [currentMenuTab, user.role]);

  const handleRoleToggle = async (targetEmail: string, currentRole: string) => {
    // Standard role cycling loop for testing: student -> instructor -> admin -> student
    const roles: ('admin' | 'instructor' | 'student')[] = ['student', 'instructor', 'admin'];
    const currentIndex = roles.indexOf(currentRole as any);
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];

    try {
      setRbacMessage('');
      const res = await adminUpdateUserRole(targetEmail, nextRole);
      setRbacMessage(res.message);
      loadAdminData();
      setTimeout(() => setRbacMessage(''), 4000);
    } catch (err: any) {
      setUsersError(err.message || 'Could not update user role reservation.');
    }
  };


  // Compute unique lists for filter options
  const types = useMemo(() => {
    return Array.from(new Set(coursesList.map((c) => c.type)));
  }, [coursesList]);

  const difficulties = useMemo(() => {
    return Array.from(new Set(coursesList.map((c) => c.difficulty)));
  }, [coursesList]);

  const topics = useMemo(() => {
    return Array.from(new Set(coursesList.map((c) => c.topic)));
  }, [coursesList]);

  // Filter courses based on selections
  const filteredCourses = useMemo(() => {
    return coursesList.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.topic.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === 'All' || course.type === selectedType;
      const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
      const matchesTopic = selectedTopic === 'All' || course.topic === selectedTopic;

      return matchesSearch && matchesType && matchesDifficulty && matchesTopic;
    });
  }, [coursesList, searchQuery, selectedType, selectedDifficulty, selectedTopic]);

  return (
    <div id="courses-root" className="min-h-screen bg-white text-dark-gray font-sans flex flex-col justify-between">
      
      {/* Header Bar (Clean Minimal White Header) */}
      <header id="courses-header" className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50 h-16 flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex items-center justify-between">
          
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-10">
            <div className="flex items-center cursor-pointer text-[20px] font-extrabold tracking-tight" onClick={() => { setSearchQuery(''); setSelectedType('All'); setSelectedDifficulty('All'); setSelectedTopic('All'); }}>
              <img src={brandLogo} alt="Mountech Academy Logo" className="w-8 h-8 rounded-lg object-cover mr-2 select-none border border-gray-250 shrink-0" referrerPolicy="no-referrer" />
              <span className="text-[#0070f3]">Mountech</span>
              <span className="text-[#111827] ml-0.5">Academy</span>
            </div>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-[13px] font-bold uppercase tracking-wider">
              <button
                onClick={() => { setCurrentMenuTab('catalog'); setSearchQuery(''); }}
                className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'catalog' ? 'text-[#0070f3] border-[#0070f3]' : 'text-[#4b5563] border-transparent hover:text-[#0070f3]'}`}
              >
                Catalog
              </button>
              {enrolledCourseIds.length > 0 ? (
                <button
                  onClick={() => setCurrentMenuTab('resources')}
                  className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'resources' ? 'text-[#0070f3] border-[#0070f3]' : 'text-[#4b5563] border-transparent hover:text-[#0070f3]'}`}
                >
                  Lecture Resources & GitLab Hub
                </button>
              ) : (
                <button
                  disabled
                  title="Enroll in a course first to unlock the lecture resources and GitLab hub."
                  className="transition-colors py-1 border-b-2 text-gray-300 border-transparent cursor-not-allowed flex items-center gap-1.5"
                >
                  <span className="opacity-50">Lecture Resources & GitLab Hub</span>
                  <span className="text-[9px] bg-gray-100 border border-gray-200 text-gray-400 px-1 py-0.2 rounded font-mono font-bold uppercase scale-90">Locked</span>
                </button>
              )}
              <button
                onClick={() => { setCurrentMenuTab('grades'); setSearchQuery(''); }}
                className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'grades' ? 'text-[#0070f3] border-[#0070f3]' : 'text-[#4b5563] border-transparent hover:text-[#0070f3]'}`}
              >
                My Grades & Credentials
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => setCurrentMenuTab('admin')}
                  className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'admin' ? 'text-rose-600 border-rose-600' : 'text-[#4b5563] border-transparent hover:text-rose-600'}`}
                >
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-rose-500" />
                    Board Control panel
                  </span>
                </button>
              )}
              {user.role === 'instructor' && (
                <>
                  <button
                    onClick={() => setCurrentMenuTab('instructor-profile')}
                    className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'instructor-profile' ? 'text-indigo-600 border-indigo-600' : 'text-[#4b5563] border-transparent hover:text-indigo-600'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-indigo-500" />
                      My Faculty Profile
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      window.history.pushState(null, '', '/instructor');
                      window.dispatchEvent(new Event('popstate'));
                    }}
                    className="transition-colors cursor-pointer select-none py-1 border-b-2 text-[#4b5563] border-transparent hover:text-indigo-600 font-semibold"
                  >
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      Instructor Dashboard
                    </span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* User Profile & Logout Action */}
          <div className="flex items-center gap-4">
            <div id="user-profile-summary" className="hidden sm:flex flex-col text-right items-end">
              <div className="flex items-center gap-1.5 h-5">
                <span className="text-xs font-semibold text-[#111827]">{user.name}</span>
                {user.role === 'admin' && (
                  <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-250 rounded-full">
                    Admin
                  </span>
                )}
                {user.role === 'instructor' && (
                  <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-250 rounded-full">
                    Instructor
                  </span>
                )}
                {user.role === 'student' && (
                  <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-250 rounded-full">
                    Student
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#6b7280]">{user.email}</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-[#0070f3] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#e5e7eb]">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <button
              id="sign-out-navbar-btn"
              onClick={onSignOut}
              className="flex items-center justify-center p-2 rounded-md border border-[#e5e7eb] hover:bg-gray-50 text-[#4b5563] hover:text-[#111827] transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Navigation row */}
      <div className="md:hidden flex bg-gray-50 border-b border-gray-200 px-6 py-2.5 justify-around text-xs font-bold uppercase tracking-widest select-none shrink-0">
        <button 
          onClick={() => { setCurrentMenuTab('catalog'); setSearchQuery(''); }} 
          className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'catalog' ? 'text-[#0070f3] border-b-2 border-[#0070f3]' : 'text-[#4b5563] border-transparent'}`}
        >
          Catalog
        </button>
        {enrolledCourseIds.length > 0 ? (
          <button 
            onClick={() => setCurrentMenuTab('resources')} 
            className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'resources' ? 'text-[#0070f3] border-b-2 border-[#0070f3]' : 'text-[#4b5563] border-transparent'}`}
          >
            Resources
          </button>
        ) : (
          <button 
            disabled
            title="Enroll in a course first to unlock resources."
            className="pb-1 transition-all text-gray-350 cursor-not-allowed flex items-center gap-1"
          >
            <span className="opacity-50">Resources</span>
            <span className="text-[8px] bg-gray-100 border border-gray-150 text-gray-400 px-1 rounded font-mono scale-90">🔒</span>
          </button>
        )}
        <button 
          onClick={() => { setCurrentMenuTab('grades'); setSearchQuery(''); }} 
          className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'grades' ? 'text-[#0070f3] border-b-2 border-[#0070f3]' : 'text-[#4b5563] border-transparent'}`}
        >
          Grades
        </button>
        {user.role === 'admin' && (
          <button 
            onClick={() => setCurrentMenuTab('admin')} 
            className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'admin' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-[#4b5563] border-transparent'}`}
          >
            Control Panel
          </button>
        )}
        {user.role === 'instructor' && (
          <>
            <button 
              onClick={() => setCurrentMenuTab('instructor-profile')} 
              className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'instructor-profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-[#4b5563] border-transparent'}`}
            >
              My Profile
            </button>
            <button 
              onClick={() => {
                window.history.pushState(null, '', '/instructor');
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="pb-1 transition-all cursor-pointer text-[#4b5563] border-transparent hover:text-indigo-600 shrink-0"
            >
              Dashboard
            </button>
          </>
        )}
      </div>

      {/* Hero Section (Clean Minimal Centered Board) */}
      <div id="courses-hero" className="bg-[#f9fafb] border-b border-[#e5e7eb] py-12 md:py-16 text-center w-full px-6">
        <div className="max-w-4xl mx-auto">
          {/* Subtle icon category badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0070f3]/10 text-[#0070f3] text-[11px] font-mono font-bold tracking-wider uppercase rounded-full mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>EXPERT-LED IT & AI TRAININGS</span>
          </div>

          <h1 id="hero-main-title" className="text-3xl md:text-5xl font-sans font-extrabold text-[#111827] tracking-tight leading-tight mb-4">
            Engineer your career trail at Mountech
          </h1>
          
          <p className="text-[#6b7280] text-sm md:text-lg leading-relaxed max-w-2xl mx-auto mb-6">
            Learn from industry veterans in computing and artificial intelligence. Gain robust engineering skills, develop smart models, and launch containerized code playgrounds in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-medium text-[#4b5563]">
            <span className="bg-white px-3 py-1 rounded-md border border-[#e5e7eb]">Large Language Models</span>
            <span className="bg-white px-3 py-1 rounded-md border border-[#e5e7eb]">AI Multi-Agent Systems</span>
            <span className="bg-white px-3 py-1 rounded-md border border-[#e5e7eb]">Vector Databases & RAG</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex-grow w-full font-sans">
        {currentMenuTab === 'instructor-profile' ? (
          <MyProfileSettings user={user} />
        ) : currentMenuTab === 'resources' ? (
          <ResourcePortal courses={coursesList} user={user} enrolledCourseIds={enrolledCourseIds} />
        ) : currentMenuTab === 'grades' ? (
          <StudentGradingDashboard
            enrolledCourseIds={enrolledCourseIds}
            user={user}
            coursesList={coursesList}
            onSelectCourse={onSelectCourse}
          />
        ) : currentMenuTab === 'admin' ? (
          <div id="rbac-admin-panel" className="space-y-8 animate-fade-in">
            {/* Header section with clean metadata */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e7eb] pb-6">
              <div>
                <span className="text-[11px] font-mono font-bold text-rose-600 tracking-wider uppercase bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Access Management Hub
                </span>
                <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight mt-2 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-rose-500" />
                  Institutional Security & RBAC Console
                </h1>
                <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">
                  List registered users, configure granular security role mappings, and monitor server environments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={loadAdminData}
                  disabled={loadingUsers}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e5e7eb] hover:bg-gray-50 rounded-lg transition-all shadow-xs cursor-pointer select-none flex items-center gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Sync Database
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateCourseSection(!showCreateCourseSection)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer select-none flex items-center gap-1.5 border ${
                    showCreateCourseSection
                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                      : 'bg-[#0070f3] hover:bg-[#0070f3]/90 text-white border-[#0070f3]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showCreateCourseSection ? 'View Users Directory' : 'Provision New Course'}
                </button>
              </div>
            </div>

            {/* Admin Sub-navigation Header Tabs */}
            <div className="flex border-b border-gray-200 gap-1 select-none">
              <button
                type="button"
                onClick={() => setAdminSubTab('users')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  adminSubTab === 'users'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Roles, System Metrics & Courses
              </button>
              <button
                type="button"
                onClick={() => setAdminSubTab('instructors')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  adminSubTab === 'instructors'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Instructor Profiles
              </button>
              <button
                type="button"
                onClick={() => setAdminSubTab('payments')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  adminSubTab === 'payments'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                id="btn-admin-tab-payments"
              >
                Validate Bank Transfers
              </button>
              <button
                type="button"
                onClick={() => setAdminSubTab('matrix')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  adminSubTab === 'matrix'
                    ? 'border-[#0070f3] text-[#0070f3]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                id="btn-admin-tab-matrix"
              >
                Academic Matrix
              </button>
            </div>

            {adminSubTab === 'instructors' ? (
              <ManageInstructors />
            ) : adminSubTab === 'payments' ? (
              <AdminPaymentApproval />
            ) : adminSubTab === 'matrix' ? (
              <AdminStudentMatrix />
            ) : (
              <>
                {/* Alert Logs messages */}
            {rbacMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2">
                <span className="text-emerald-500 font-bold font-mono">✓</span>
                <span>{rbacMessage}</span>
              </div>
            )}

            {usersError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2">
                <span className="text-red-500 font-bold shrink-0">❌</span>
                <span>{usersError}</span>
              </div>
            )}

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left hand column: Scholar account directory list or Course Creator Form (Size: 2/3) */}
              <div className="lg:col-span-2 space-y-6">
                {showCreateCourseSection ? (
                  <>
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in" id="course-provisioner-form-card">
                    <div className="border-b border-gray-100 pb-4">
                      <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#0070f3] animate-pulse" />
                        Academic Course & Syllabus Provisioner
                      </h2>
                      <p className="text-[11px] text-[#6b7280] mt-1">
                        Configure structural curriculum modules, choose beautiful aesthetic pairings, and sync to high-availability SQLite cache immediately.
                      </p>
                    </div>

                    {createCourseError && (
                      <div className="p-3 bg-red-55 border border-red-150 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                        <span className="shrink-0">⚠️</span>
                        <span>{createCourseError}</span>
                      </div>
                    )}

                    {createCourseSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                        <span className="shrink-0">✓</span>
                        <span>{createCourseSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateCourseSubmit} className="space-y-6 text-xs">
                      {/* Course Title and Topic */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Course Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={newCourseTitle}
                            onChange={(e) => setNewCourseTitle(e.target.value)}
                            placeholder="e.g. Prompt Engineering with Gemini 2.0"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Topic/Discipline Category *
                          </label>
                          <input
                            type="text"
                            required
                            value={newCourseTopic}
                            onChange={(e) => setNewCourseTopic(e.target.value)}
                            placeholder="e.g. Generative AI, Large Language Models"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>
                      </div>

                      {/* Course Type and Difficulty */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Course Format Type *
                          </label>
                          <select
                            value={newCourseType}
                            onChange={(e: any) => setNewCourseType(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          >
                            <option value="Short Course">Short Course</option>
                            <option value="Course">Regular Course</option>
                            <option value="Professional Certificate">Professional Certificate</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Target Difficulty *
                          </label>
                          <select
                            value={newCourseDifficulty}
                            onChange={(e: any) => setNewCourseDifficulty(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          >
                            <option value="Beginner">Beginner Level</option>
                            <option value="Intermediate">Intermediate Level</option>
                            <option value="Advanced">Advanced Level</option>
                          </select>
                        </div>
                      </div>

                      {/* Short Description */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                          Short Narrative Description * (Card display)
                        </label>
                        <input
                          type="text"
                          required
                          value={newCourseDescription}
                          onChange={(e) => setNewCourseDescription(e.target.value)}
                          placeholder="Brief summary of what this course unlocks for the audience..."
                          className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                        />
                      </div>

                      {/* Detailed Full Description */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                          Deep Curriculum Full Description * (Course details viewer)
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={newCourseFullDesc}
                          onChange={(e) => setNewCourseFullDesc(e.target.value)}
                          placeholder="Provide an extensive, beautifully paragraph-separated description. Outline what students will write, achieve, and build..."
                          className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                        />
                      </div>

                      {/* Assign Instructors from Profiles (Up to 3 Many-To-Many) */}
                      <div className="space-y-3.5">
                        <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                          Assign Instructors (Max 3, Primary & Co-instructors)
                        </label>
                        {newCourseInstProfileIds.map((profileId, index) => {
                          const isPrimary = index === 0;
                          return (
                            <div key={index} className="flex gap-2 items-center">
                              <div className="flex-1">
                                <span className="block text-[10px] text-gray-400 font-medium mb-1">
                                  {isPrimary ? "Primary Instructor" : `Co-Instructor #${index}`}
                                </span>
                                <select
                                  value={profileId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const nextIds = [...newCourseInstProfileIds];
                                    nextIds[index] = val;
                                    setNewCourseInstProfileIds(nextIds);
                                    
                                    // Fill backward compatibility names
                                    if (isPrimary) {
                                      setNewCourseInstProfileId(val);
                                      if (val) {
                                        const selected = instructorsList.find(i => String(i.id) === val);
                                        if (selected) {
                                          setNewCourseInstName(selected.full_name);
                                          setNewCourseInstTitle(selected.academic_title);
                                        }
                                      } else {
                                        setNewCourseInstName('');
                                        setNewCourseInstTitle('');
                                      }
                                    }
                                  }}
                                  className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] cursor-pointer"
                                >
                                  <option value="">To be assigned later</option>
                                  {instructorsList.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                      {inst.full_name} ({inst.academic_title})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextIds = newCourseInstProfileIds.filter((_, idx) => idx !== index);
                                    setNewCourseInstProfileIds(nextIds);
                                  }}
                                  className="self-end px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer mt-5"
                                  title="Remove Co-Instructor"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          );
                        })}
                        
                        {newCourseInstProfileIds.length < 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCourseInstProfileIds([...newCourseInstProfileIds, '']);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                          >
                            <span>+ Add Co-Instructor</span>
                          </button>
                        )}
                      </div>

                      {/* Instructor Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Instructor Full Name
                          </label>
                          <input
                            type="text"
                            value={newCourseInstName}
                            onChange={(e) => setNewCourseInstName(e.target.value)}
                            placeholder={user.name}
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Instructor Academic Title
                          </label>
                          <input
                            type="text"
                            value={newCourseInstTitle}
                            onChange={(e) => setNewCourseInstTitle(e.target.value)}
                            placeholder="Mountech Fellow / Certified Expert"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>
                      </div>

                      {/* Metadata: Duration, LessonCount, Partner */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={newCourseDuration}
                            onChange={(e) => setNewCourseDuration(e.target.value)}
                            placeholder="e.g. 4 hours"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Lesson Count Label
                          </label>
                          <input
                            type="text"
                            value={newCourseLessonCount}
                            onChange={(e) => setNewCourseLessonCount(e.target.value)}
                            placeholder="e.g. 6 lessons"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Certifying Partner
                          </label>
                          <input
                            type="text"
                            value={newCoursePartner}
                            onChange={(e) => setNewCoursePartner(e.target.value)}
                            placeholder="e.g. Mountech Academy"
                            className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          />
                        </div>
                      </div>

                      {/* Theme & Icons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Aesthetic Design Theme *
                          </label>
                          <select
                            value={newCourseThumbnailBg}
                            onChange={(e) => setNewCourseThumbnailBg(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          >
                            <option value="bg-indigo-950 text-indigo-400">Indigo Cyber (Standard)</option>
                            <option value="bg-emerald-950 text-emerald-400">Emerald Minimal</option>
                            <option value="bg-amber-950 text-amber-500">Golden Autumn</option>
                            <option value="bg-blue-950 text-blue-400">Classic Blue</option>
                            <option value="bg-rose-950 text-rose-400">Royal Crimson</option>
                            <option value="bg-purple-950 text-purple-400">Dark Violet</option>
                            <option value="bg-slate-900 text-slate-100">Slate Charcoal</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                            Visual Icon Signifier *
                          </label>
                          <select
                            value={newCourseThumbnailIcon}
                            onChange={(e) => setNewCourseThumbnailIcon(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                          >
                            <option value="agents">Multi-Agent Systems</option>
                            <option value="prompt">Prompting / LLMs</option>
                            <option value="deeplearning">Neural Nets</option>
                            <option value="python">Python Programming</option>
                            <option value="systems">Computing Systems</option>
                            <option value="rag">RAG / Databases</option>
                            <option value="genai">Creative Generative AI</option>
                            <option value="cybersecurity">Cybersecurity Controls</option>
                            <option value="default">Default Academic Graduation</option>
                          </select>
                        </div>
                      </div>

                      {/* Paid Checkbox and Pricing */}
                      <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            id="isPaidCheckbox"
                            type="checkbox"
                            checked={newCourseIsPaid}
                            onChange={(e) => setNewCourseIsPaid(e.target.checked)}
                            className="w-4 h-4 text-[#0070f3] border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="isPaidCheckbox" className="text-xs font-bold text-gray-800 select-none cursor-pointer">
                            This is a premium tuition-based course *
                          </label>
                        </div>

                        {newCourseIsPaid && (
                          <div className="flex items-center gap-2 max-w-[200px] animate-fade-in">
                            <span className="text-xs font-bold text-gray-600">$ USD</span>
                            <input
                              type="number"
                              min="1"
                              value={newCoursePrice}
                              onChange={(e) => setNewCoursePrice(e.target.value)}
                              placeholder="49"
                              className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                            />
                          </div>
                        )}
                      </div>

                      {/* Skills Sublist Builder */}
                      <div className="space-y-2 border-t border-gray-100 pt-4">
                        <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                          Dynamic Skills Acquired Checklist
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currSkill}
                            onChange={(e) => setCurrSkill(e.target.value)}
                            placeholder="e.g. System Fine-Tuning"
                            className="flex-grow px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                          />
                          <button
                            type="button"
                            onClick={handleAddSkill}
                            className="bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                          >
                            + Add Skill
                          </button>
                        </div>
                        
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {skillsList.map((skill, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#0070f3]/5 text-[#0070f3] border border-[#0070f3]/10 px-2 py-0.5 rounded">
                                {skill}
                                <button type="button" onClick={() => handleRemoveSkill(idx)} className="text-[#0070f3]/65 hover:text-red-550 font-bold ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Requirements Sublist Builder */}
                      <div className="space-y-2 border-t border-gray-100 pt-4">
                        <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                          Prerequisites & Requirements
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currReq}
                            onChange={(e) => setCurrReq(e.target.value)}
                            placeholder="e.g. Basic familiarization with JSON payloads"
                            className="flex-grow px-3 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                          />
                          <button
                            type="button"
                            onClick={handleAddReq}
                            className="bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                          >
                            + Add Req
                          </button>
                        </div>

                        {reqsList.length > 0 && (
                          <div className="space-y-1.5 pt-1.5">
                            {reqsList.map((req, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] text-[#4b5563] bg-gray-50 border border-gray-100 px-3 py-1 rounded">
                                <span>• {req}</span>
                                <button type="button" onClick={() => handleRemoveReq(idx)} className="text-gray-400 hover:text-red-500 font-bold">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Syllabus Lesson Content Builder */}
                      <div className="space-y-4 border-t border-gray-100 pt-4 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                            Syllabus / Course Lesson Content *
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-500 font-mono">Chapter label</label>
                            <input
                              type="text"
                              value={currChapter}
                              onChange={(e) => setCurrChapter(e.target.value)}
                              placeholder="e.g. Lesson 1 or Module 1"
                              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 font-mono">Lecture / Topic title</label>
                            <input
                              type="text"
                              value={currChapTitle}
                              onChange={(e) => setCurrChapTitle(e.target.value)}
                              placeholder="e.g. Core mechanisms of embeddings"
                              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 font-mono">Topic narrative / Lecture briefing</label>
                          <textarea
                            rows={2}
                            value={currChapDesc}
                            onChange={(e) => setCurrChapDesc(e.target.value)}
                            placeholder="Outline exactly what hands-on modules or labs the student completes in this lesson chapter..."
                            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddSyllabus}
                          disabled={!currChapter.trim() || !currChapTitle.trim() || !currChapDesc.trim()}
                          className="w-full py-1.5 bg-indigo-55 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Add Lecture Chapter to Syllabus
                        </button>

                        {/* Render Syllabus list */}
                        {syllabusList.length > 0 ? (
                          <div className="space-y-2 pt-2">
                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wide uppercase">STRUCTURED SYLLABUS ({syllabusList.length} Chapters):</p>
                            {syllabusList.map((chap, idx) => (
                              <div key={idx} className="p-3 bg-white border border-gray-150 rounded-lg flex items-start gap-4 justify-between shadow-xs">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                    {chap.chapter}
                                  </span>
                                  <div className="text-xs font-bold text-slate-800">{chap.title}</div>
                                  <div className="text-[11px] text-gray-500 leading-normal">{chap.description}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSyllabus(idx)}
                                  className="text-rose-600 hover:text-rose-800 text-[10px] font-bold p-1 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-white border border-dashed text-center text-[11px] text-gray-400 rounded-lg">
                            No Lesson Syllabus created yet. Please formulate at least one academic session topic.
                          </div>
                        )}
                      </div>

                      {/* Submit Section */}
                      <div className="border-t border-gray-100 pt-5 flex items-center justify-end gap-3 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateCourseSection(false);
                            resetForm();
                          }}
                          className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingCourse}
                          className="px-5 py-2 text-xs font-bold text-white bg-[#0070f3] hover:bg-[#0070f3]/90 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {creatingCourse ? (
                            <>
                              <Activity className="w-3.5 h-3.5 animate-spin" />
                              {editingCourseId ? 'Updating...' : 'Provisioning...'}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              {editingCourseId ? 'Save Changes' : 'Initialize Dynamic Course'}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {editingCourseId && (
                    <>
                      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 space-y-4 shadow-3xs animate-fade-in" id="live-session-scheduler-card">
                        <div className="border-b border-gray-150 pb-3">
                          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                            <Video className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                            <span>Schedule Live Class Seminar</span>
                          </h3>
                          <p className="text-[11px] text-[#6b7280] mt-0.5">
                            Publish a new Google Meet classroom event for registered scholars in this elective.
                          </p>
                        </div>

                        {scheduleError && (
                          <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                            <span className="shrink-0">⚠️</span>
                            <span>{scheduleError}</span>
                          </div>
                        )}
                        {scheduleSuccess && (
                          <div className="p-3 bg-emerald-55 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                            <span className="shrink-0">✓</span>
                            <span>{scheduleSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleScheduleSessionSubmit} className="space-y-4 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                              Lecture / Seminar Session Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={sessionTitle}
                              onChange={(e) => setSessionTitle(e.target.value)}
                              placeholder="e.g. Q&A and Exam Review with Sarah Sterling"
                              className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                                Start Date & Time (Local) *
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={sessionStart}
                                onChange={(e) => setSessionStart(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                                End Date & Time (Local) *
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={sessionEnd}
                                onChange={(e) => setSessionEnd(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
                              Google Meet URL *
                            </label>
                            <input
                              type="url"
                              required
                              value={sessionMeetUrl}
                              onChange={(e) => setSessionMeetUrl(e.target.value)}
                              placeholder="e.g. https://meet.google.com/abc-defg-hij"
                              className="w-full px-3.5 py-2 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3]"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={scheduling}
                              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {scheduling ? (
                                <>
                                  <Activity className="w-3.5 h-3.5 animate-spin" />
                                  Scheduling...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Schedule Live Lecture
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="mt-8 md:col-span-2">
                        <SyllabusEditor
                          courseId={editingCourseId}
                          initialSyllabus={editingSyllabusContent}
                          onSyllabusSaved={(newContent) => {
                            setEditingSyllabusContent(newContent);
                            loadCourses();
                          }}
                        />
                      </div>
                    </>
                  )}
                  </>
                ) : (
                  <>
                    {/* ACADEMY COURSE CURRICULUM MANAGEMENT CARD - FOR ADMINS & DEVELOPERS */}
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 overflow-hidden md:col-span-2" id="admin-courses-curriculum-management">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gray-100 pb-3 gap-2">
                        <div>
                          <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                            <span>Academy Course Curriculum Management</span>
                          </h2>
                          <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">
                            Edit course contents and toggle curriculum visibility/hidden states for the active student catalog.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded font-bold uppercase shrink-0 w-fit">
                          {coursesList.length} COURSES ACTIVE
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-105 text-xs">
                          <thead>
                            <tr className="text-[10px] font-bold text-gray-400 font-mono text-left uppercase tracking-wider">
                              <th className="pb-3 text-[#6b7280]">Course Details</th>
                              <th className="pb-3 text-[#6b7280]">Status & Visibility</th>
                              <th className="pb-3 text-right text-[#6b7280]">Management Options</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-sans text-xs">
                            {coursesList.map((course) => {
                              const isLocked = !!course.isLocked;
                              return (
                                <tr key={course.id} className="hover:bg-gray-50/50 transition-all text-xs" id={`course-row-${course.id}`}>
                                  <td className="py-4 pr-3">
                                    <div className="font-semibold text-gray-900 leading-snug">{course.title}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono mt-0.5">
                                      <span>ID: {course.id}</span>
                                      <span>•</span>
                                      <span>{course.type}</span>
                                      <span>•</span>
                                      <span>{course.difficulty}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      {isLocked ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase border bg-red-50 text-red-700 border-red-200">
                                          <Lock className="w-3 h-3 text-red-600 shrink-0" />
                                          Locked & Hidden
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                          Student Live
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.2 uppercase font-mono tracking-wider">
                                        {course.isPaid ? `PAID ($${course.price})` : 'FREE'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-right space-x-2 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditCourse(course)}
                                      className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-all cursor-pointer inline-flex items-center gap-1 select-none shadow-3xs"
                                    >
                                      Edit Course
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleCourseLock(course.id, isLocked)}
                                      className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all border cursor-pointer inline-flex items-center gap-1 select-none shadow-3xs ${
                                        isLocked
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                      }`}
                                    >
                                      {isLocked ? 'Publish' : 'Lock'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 overflow-hidden">
                      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                        <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                          Scholar Role Directory ({filteredUsers.length} Users)
                        </h2>
                        <span className="text-[10px] font-mono text-[#9ca3af] bg-gray-50 px-2 py-0.5 rounded border border-[#e5e7eb]">
                          Live fallback db
                        </span>
                      </div>

                      {loadingUsers ? (
                        <div className="space-y-4 py-8">
                          <div className="h-6 bg-gray-100 animate-pulse rounded w-1/3"></div>
                          <div className="h-20 bg-gray-50 animate-pulse rounded"></div>
                          <div className="h-20 bg-gray-50 animate-pulse rounded"></div>
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                              <tr className="text-[10px] font-bold text-gray-400 font-mono text-left uppercase tracking-wider">
                                <th className="pb-3 text-[#6b7280]">
                                  Scholar & Email
                                </th>
                                <th className="pb-3 text-[#6b7280]">Role Registry</th>
                                <th className="pb-3 text-right text-[#6b7280]">Action toggles</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-sans">
                              {filteredUsers.map((u: any) => {
                                const isCurrentUser = u.email.trim().toLowerCase() === user.email.trim().toLowerCase();
                                
                                // Color scheme mapping
                                let roleBadgeClass = "bg-gray-100 text-gray-700 border-gray-200";
                                if (u.role === 'admin') roleBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                                else if (u.role === 'instructor') roleBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                else if (u.role === 'student') roleBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

                                return (
                                  <tr key={u.email} className="hover:bg-gray-50/50 transition-all text-xs">
                                    <td className="py-4 pr-3">
                                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                        {u.name || 'Anonymous Scholar'}
                                        {isCurrentUser && (
                                          <span className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] font-mono text-gray-400">{u.email}</div>
                                    </td>
                                    
                                    <td className="py-4">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase border ${roleBadgeClass}`}>
                                        {u.role || 'student'}
                                      </span>
                                    </td>

                                    <td className="py-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRoleToggle(u.email, u.role)}
                                        disabled={isCurrentUser}
                                        title={isCurrentUser ? "Self-role changes are disallowed to prevent security lockout." : "Cycle role state"}
                                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all select-none border cursor-pointer inline-flex items-center gap-1 ${
                                          isCurrentUser 
                                            ? 'bg-gray-50 text-gray-300 border-gray-150 cursor-not-allowed opacity-60' 
                                            : 'bg-white text-[#0070f3] border-[#0070f3]/25 hover:bg-[#0070f3]/5 hover:border-[#0070f3]'
                                        }`}
                                      >
                                        Cycle Role ⟳
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                          <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 font-mono">No records found in directory.</p>
                        </div>
                      )}
                    </div>

                    {/* INSTITUTIONAL COURSE REGISTRATIONS AND ACADEMIC FEES STATUS BOARD - FOR ADMIN ONLY */}
                    {user.role === 'admin' && (
                      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 overflow-hidden" id="admin-registrations-payment-hub">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gray-100 pb-3 gap-2">
                          <div>
                            <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                              <span>Institutional Course Registrations & Fee Status</span>
                            </h2>
                            <p className="text-[11px] text-[#6b7280] mt-0.5">
                              Track active courses, academic fees paid, and enrollment status of all registered scholarship accounts.
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded font-bold uppercase shrink-0 w-fit">
                            ADMIN ACCESS UNLOCKED
                          </span>
                        </div>

                        {loadingEnrollments ? (
                          <div className="space-y-3 py-6">
                            <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3"></div>
                            <div className="h-12 bg-gray-50 animate-pulse rounded"></div>
                            <div className="h-12 bg-gray-50 animate-pulse rounded"></div>
                          </div>
                        ) : adminEnrollments.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                              <thead>
                                <tr className="text-[10px] font-bold text-gray-400 font-mono text-left uppercase tracking-wider">
                                  <th className="pb-3 text-[#6b7280]">Scholar & Email</th>
                                  <th className="pb-3 text-[#6b7280]">Registered Course</th>
                                  <th className="pb-3 text-[#6b7280]">Fee Status</th>
                                  <th className="pb-3 text-[#6b7280]">Status</th>
                                  <th className="pb-3 text-right text-[#6b7280]">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-sans text-xs">
                                {adminEnrollments.map((reg: any, regIdx: number) => {
                                  const matchC = coursesList.find((c) => c.id === reg.courseId);
                                  const isPaidCourse = matchC ? matchC.isPaid : false;
                                  const tuitionFee = matchC ? (isPaidCourse ? `$${matchC.price}` : 'FREE') : 'FREE';
                                  
                                  return (
                                    <tr key={regIdx} id={`reg-row-${regIdx}`} className="hover:bg-gray-50/50 transition-all">
                                      <td className="py-4 pr-3">
                                        <div className="font-semibold text-gray-900">{reg.name || 'Anonymous Scholar'}</div>
                                        <div className="text-[10px] font-mono text-gray-400">{reg.email}</div>
                                      </td>
                                      <td className="py-4 pr-3 max-w-[200px] truncate">
                                        <span className="font-medium text-gray-800" title={reg.courseTitle}>
                                          {reg.courseTitle || reg.courseId}
                                        </span>
                                      </td>
                                      <td className="py-4">
                                        {isPaidCourse ? (
                                          <div className="flex flex-col">
                                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded font-bold px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider inline-block w-fit">
                                              PAID {tuitionFee}
                                            </span>
                                            <span className="text-[8px] text-gray-400 font-mono mt-0.5">NPR {(matchC!.price * 133).toLocaleString()} via digital wallet</span>
                                          </div>
                                        ) : (
                                          <span className="text-blue-700 bg-blue-50 border border-blue-200 rounded font-bold px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider inline-block w-fit">
                                            FREE ACCESS
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-4">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider border ${
                                          reg.status === 'Completed' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                          {reg.status || 'Enrolled'}
                                        </span>
                                      </td>
                                      <td className="py-4 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (matchC) {
                                              onSelectCourse(matchC);
                                            }
                                          }}
                                          className="px-2.5 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-3xs cursor-pointer inline-flex items-center gap-1 select-none"
                                        >
                                          <span>View Course Materials</span>
                                          <span>→</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-12 p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                            <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-gray-800">No School Registrations Active</h4>
                            <p className="text-[10px] text-gray-500 max-w-sm mx-auto mt-1 leading-normal font-sans">
                              Once active scholars register courses or authorize academic payments, they will populate here securely.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right column: Debug System metrics & Configuration Panel (Size: 1/3) */}
              <div className="space-y-6">
                
                {/* Role Permission Documentation Card */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3 shadow-xs">
                  <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    Granular Access Guidelines
                  </h3>
                  <div className="space-y-2.5 text-[11px] leading-relaxed text-[#6b7280]">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold font-mono text-rose-600 bg-rose-50 px-1 rounded text-[10px]">Admin</span>
                      <p className="flex-1">Directly change user role registrations, view all databases, and monitor academic boards.</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold font-mono text-indigo-600 bg-indigo-50 px-1 rounded text-[10px]">Instructor</span>
                      <p className="flex-1">Create course modules, upload lecture resources, manage curriculum boards.</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold font-mono text-emerald-600 bg-emerald-50 px-1 rounded text-[10px]">Student</span>
                      <p className="flex-1">Register dynamic lectures, request training certificates, and synchronize progress.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

          </div>
        ) : (
          <>
            {/* Filter Bar Component */}
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              selectedDifficulty={selectedDifficulty}
              setSelectedDifficulty={setSelectedDifficulty}
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
              types={types}
              difficulties={difficulties}
              topics={topics}
              resultsCount={filteredCourses.length}
            />

            {/* Course Cards Grid */}
            <div id="course-grid-container" className="mt-4">
              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <div key={course.id}>
                      <CourseCard
                        course={course}
                        onClick={() => onSelectCourse(course)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Elegant Empty State */
                <div id="no-results-state" className="text-center py-16 bg-white rounded-xl border border-[#e5e7eb] max-w-md mx-auto p-8 shadow-xs">
                  <div className="w-12 h-12 bg-gray-50 border border-[#e5e7eb] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0070f3]">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#111827] mb-1">No Courses Found</h3>
                  <p className="text-[#6b7280] text-xs leading-relaxed mb-6">
                    None of our academy modules match your specified search or selection categories.
                  </p>
                  <button
                    id="reset-filters-empty-state-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('All');
                      setSelectedDifficulty('All');
                      setSelectedTopic('All');
                    }}
                    className="px-5 py-2 bg-[#0070f3] text-white rounded-md text-xs font-semibold hover:bg-[#0051b3] transition-all cursor-pointer"
                  >
                    Reset Filter Settings
                  </button>
                </div>
              )}
            </div>


          </>
        )}
      </main>

      {/* Trust Badge Bar */}
      <section className="bg-white border-t border-[#e5e7eb] py-8 w-full mt-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <span className="text-[10px] font-mono text-[#9ca3af] tracking-widest font-bold uppercase block mb-4">
            INTEGRATED PRACTICE LANDSCAPES
          </span>
          <div className="flex flex-wrap items-center justify-center gap-10 text-xs text-[#6b7280] font-bold font-mono">
            <span className="hover:text-[#111827] transition-colors">OPENAI WORKSPACE</span>
            <span className="hover:text-[#111827] transition-colors">AZURE COGNITIVE</span>
            <span className="hover:text-[#111827] transition-colors">AWS BEDROCK</span>
            <span className="hover:text-[#111827] transition-colors">PINECONE VECTOR</span>
            <span className="hover:text-[#111827] transition-colors">LANGCHAIN SYSTEM</span>
          </div>
        </div>
      </section>

      {/* Footer Bar (Clean White / Light Slate Footer) */}
      <footer id="courses-footer" className="bg-[#f9fafb] text-[#4b5563] py-12 border-t border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-4">
            <div className="flex items-center text-[18px] font-extrabold tracking-tight">
              <img src={brandLogo} alt="Mountech Academy Logo" className="w-7 h-7 rounded-md object-cover mr-1.5 select-none border border-gray-150 shrink-0" referrerPolicy="no-referrer" />
              <span className="text-[#0070f3]">Mountech</span>
              <span className="text-[#111827] ml-0.5">Academy</span>
            </div>
            <p className="text-xs text-[#6b7280] leading-relaxed max-w-xs">
              Mountech Academy is an interactive education platform delivering world-class software development, database orchestration, and core machine learning models.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[#111827] text-xs font-mono font-bold tracking-wider uppercase">Pathways</h4>
            <ul className="text-xs space-y-2 text-[#6b7280]">
              <li><button onClick={() => setSelectedTopic('LLMs')} className="hover:text-[#0070f3] transition-colors cursor-pointer text-left">Large Language Models (LLMs)</button></li>
              <li><button onClick={() => setSelectedTopic('Agents')} className="hover:text-[#0070f3] transition-colors cursor-pointer text-left">Autonomous AI Agents</button></li>
              <li><button onClick={() => setSelectedTopic('Deep Learning')} className="hover:text-[#0070f3] transition-colors cursor-pointer text-left">Deep Learning Core Foundations</button></li>
              <li><button onClick={() => setSelectedTopic('RAG')} className="hover:text-[#0070f3] transition-colors cursor-pointer text-left">Retrieval-Augmented Generation (RAG)</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[#111827] text-xs font-mono font-bold tracking-wider uppercase">Support Desk</h4>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              Have questions regarding Service Account access or enrollment states?
            </p>
            <div className="text-xs text-[#0070f3] font-mono font-semibold">
              support@mountech.academy
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-10 pt-6 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#9ca3af]">
          <div>
            © 2026 Mountech Academy. All rights reserved. Designed with premium visual cues.
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-[#4b5563]">Terms of Service</a>
            <a href="#" className="hover:text-[#4b5563]">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {showConfirmModal && (
        <div id="syllabus-warning-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in animate-duration-150">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 border border-amber-200 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                  Confirm Curriculum Revision
                </h3>
                <p className="text-xs text-[#6b7280]">
                  You are editing an established academic course module catalog.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                Is everything finalized? CAUTION: Once accepted, these curriculum changes will be immediately visible to all enrolled students.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 font-sans text-xs pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeCourseUpdate}
                disabled={creatingCourse}
                className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-all cursor-pointer select-none shadow-sm flex items-center gap-1.5"
              >
                {creatingCourse ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <span>Confirm & Publish</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
