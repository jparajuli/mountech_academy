import React, { useState, useMemo, useEffect } from 'react';
import { Course, User } from '../types';
import { courses } from '../courses';
import CourseCard from '../components/CourseCard';
import FilterBar from '../components/FilterBar';
import ResourcePortal from '../components/ResourcePortal';
import { 
  LogOut, GraduationCap, ArrowUpRight, HelpCircle, 
  Shield, FileCode, Terminal, Copy, Check, Lock, Server, Activity
} from 'lucide-react';
import { getLoginHistory, LoginEvent, adminListUsers, adminUpdateUserRole, getDeveloperLogs, adminListEnrollments } from '../api';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CoursesProps {
  user: User;
  onSignOut: () => void;
  onSelectCourse: (course: Course) => void;
  enrolledCourseIds: string[];
}

export default function Courses({ user, onSignOut, onSelectCourse, enrolledCourseIds }: CoursesProps) {
  const [currentMenuTab, setCurrentMenuTab] = useState<'catalog' | 'resources' | 'admin'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');

  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'script' | 'logs'>('script');
  const [copiedAppScript, setCopiedAppScript] = useState(false);

  // Admin & Developer tab states
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [devLogs, setDevLogs] = useState<any[]>([]);
  const [loadingDevLogs, setLoadingDevLogs] = useState(false);
  const [rbacMessage, setRbacMessage] = useState('');

  // Course registrations & payment fees states
  const [adminEnrollments, setAdminEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const filteredUsers = useMemo(() => {
    if (user.role === 'developer') {
      return managedUsers.filter((u: any) => u.role !== 'student');
    }
    return managedUsers;
  }, [managedUsers, user.role]);

  const loadAdminData = () => {
    if (user.role === 'admin' || user.role === 'developer') {
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

      if (user.role === 'admin') {
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

      if (user.role === 'developer') {
        setLoadingDevLogs(true);
        getDeveloperLogs()
          .then((res) => {
            setDevLogs(res.logs || []);
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            setLoadingDevLogs(false);
          });
      }
    }
  };

  useEffect(() => {
    if (currentMenuTab === 'admin') {
      loadAdminData();
    }
  }, [currentMenuTab, user.role]);

  const handleRoleToggle = async (targetEmail: string, currentRole: string) => {
    // Standard role cycling loop for testing: student -> instructor -> admin -> developer -> student
    const roles: ('admin' | 'instructor' | 'student' | 'developer')[] = ['student', 'instructor', 'admin', 'developer'];
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

  useEffect(() => {
    setLogsLoading(true);
    getLoginHistory()
      .then((res) => {
        setLoginHistory(res.logins || []);
      })
      .catch((err) => {
        console.error("Error loading account verification logs:", err);
      })
      .finally(() => {
        setLogsLoading(false);
      });
  }, []);

  const appScriptSrc = `/**
 * MOUNTECH ACADEMY WORKSPACE - GOOGLE APPS SCRIPT
 * 
 * Paste this script into your Google Sheet's Apps Script editor:
 * 1. Open your Google Sheet (e.g., matching GOOGLE_SHEET_ID).
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any boilerplate code and paste this entire script.
 * 4. Click Save (Disk Icon).
 * 5. Deploy -> New Deployment -> Select Type: Web App.
 *    - Execute as: Me (your-email)
 *    - Who has access: Anyone
 *    - Copy the deployment URL and add it as GOOGLE_APPS_SCRIPT_URL (or set it as GOOGLE_SHEET_ID)!
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    var email = data.email || "Unknown Email";
    var name = data.name || "Unknown Scholar";
    var timestamp = data.timestamp || new Date().toISOString();
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.type === "get_status") {
      var emailQuery = (data.email || "").trim().toLowerCase();
      var sheet = doc.getSheetByName("Sheet1");
      var enrollments = [];
      var completions = [];
      
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowEmail = rows[i][1] ? rows[i][1].toString().trim().toLowerCase() : "";
          if (rowEmail === emailQuery) {
            var courseId = rows[i][3] ? rows[i][3].toString().trim() : "";
            var status = rows[i][5] ? rows[i][5].toString().trim() : "";
            if (courseId) {
              enrollments.push(courseId);
              if (status === "Completed") {
                completions.push(courseId);
              }
            }
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        enrollments: enrollments,
        completions: completions
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if it's an enrollment/completion or a login log
    if (data.type === "enrollment" || data.courseId) {
      var courseId = data.courseId || "unknown_course";
      var courseTitle = data.courseTitle || "Course Title";
      var status = data.status || "Enrolled";
      
      var sheet = doc.getSheetByName("Sheet1");
      if (!sheet) {
        sheet = doc.insertSheet("Sheet1");
        sheet.appendRow(["Timestamp", "Email Address", "Scholar Name", "Course ID", "Course Title", "Status"]);
        
        // Header styling
        var headerRange = sheet.getRange(1, 1, 1, 6);
        headerRange.setBackground("#0070f3");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setFontFamily("Inter");
        sheet.setFrozenRows(1);
      }
      
      var rows = sheet.getDataRange().getValues();
      var updated = false;
      
      if (status === "Completed") {
        for (var i = 1; i < rows.length; i++) {
          var rowEmail = rows[i][1] ? rows[i][1].toString().trim().toLowerCase() : "";
          var rowCourseId = rows[i][3] ? rows[i][3].toString().trim().toLowerCase() : "";
          if (rowEmail === email.trim().toLowerCase() && rowCourseId === courseId.trim().toLowerCase()) {
            sheet.getRange(i + 1, 6).setValue("Completed");
            updated = true;
            break;
          }
        }
      }
      
      if (!updated) {
        sheet.appendRow([timestamp, email, name, courseId, courseTitle, status]);
      }
      
      for (var col = 1; col <= sheet.getLastColumn(); col++) {
        sheet.autoResizeColumn(col);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Successfully synchronized enrollment securely to Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else {
      var status = data.status || "Attempt";
      var details = data.details || "API Call";
      
      var sheet = doc.getSheetByName("Logins");
      if (!sheet) {
        sheet = doc.insertSheet("Logins");
        sheet.appendRow(["Timestamp", "Email Address", "Scholar Name", "Login Status", "Session Identifier"]);
        
        // Modern slate header styling
        var headerRange = sheet.getRange(1, 1, 1, 5);
        headerRange.setBackground("#0f172a");
        headerRange.setFontColor("#f8fafc");
        headerRange.setFontWeight("bold");
        headerRange.setFontFamily("Inter");
        sheet.setFrozenRows(1);
      }
      
      sheet.appendRow([timestamp, email, name, status, details]);
      
      for (var col = 1; col <= sheet.getLastColumn(); col++) {
        sheet.autoResizeColumn(col);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Successfully recorded login session information."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appScriptSrc);
    setCopiedAppScript(true);
    setTimeout(() => setCopiedAppScript(false), 2000);
  };

  // Compute unique lists for filter options
  const types = useMemo(() => {
    return Array.from(new Set(courses.map((c) => c.type)));
  }, []);

  const difficulties = useMemo(() => {
    return Array.from(new Set(courses.map((c) => c.difficulty)));
  }, []);

  const topics = useMemo(() => {
    return Array.from(new Set(courses.map((c) => c.topic)));
  }, []);

  // Filter courses based on selections
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
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
  }, [searchQuery, selectedType, selectedDifficulty, selectedTopic]);

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
              {(user.role === 'admin' || user.role === 'developer') && (
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
                {user.role === 'developer' && (
                  <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-violet-50 text-violet-600 border border-violet-250 rounded-full">
                    Developer
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
        {(user.role === 'admin' || user.role === 'developer') && (
          <button 
            onClick={() => setCurrentMenuTab('admin')} 
            className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'admin' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-[#4b5563] border-transparent'}`}
          >
            Control Panel
          </button>
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
        {currentMenuTab === 'resources' ? (
          <ResourcePortal courses={courses} user={user} enrolledCourseIds={enrolledCourseIds} />
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

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadAdminData}
                  disabled={loadingUsers}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#e5e7eb] hover:bg-gray-50 rounded-lg transition-all shadow-xs cursor-pointer select-none flex items-center gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Sync Database
                </button>
              </div>
            </div>

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
              
              {/* Left hand column: Scholar account directory list (Size: 2/3) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                      {user.role === 'developer' ? 'Operational Staff Directory' : 'Scholar Role Directory'} ({filteredUsers.length} Users)
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
                              {user.role === 'developer' ? 'Staff Member' : 'Scholar'} & Email
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
                            else if (u.role === 'developer') roleBadgeClass = "bg-violet-50 text-violet-700 border-violet-200";
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
                              const matchC = courses.find((c) => c.id === reg.courseId);
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
              </div>

              {/* Right column: Debug System metrics & Configuration Panel (Size: 1/3) */}
              <div className="space-y-6">
                
                {/* Developer Diagnostic Panel */}
                <div className="bg-gray-900 text-slate-100 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
                    <Terminal className="w-5 h-5 text-violet-400" />
                    <div>
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Systems Diagnostics Console
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                        Real-time container environments telemetry logs
                      </p>
                    </div>
                  </div>

                  {user.role === 'developer' ? (
                    loadingDevLogs ? (
                      <div className="space-y-3 py-6">
                        <div className="h-4 bg-gray-800 animate-pulse rounded w-1/2"></div>
                        <div className="h-4 bg-gray-800 animate-pulse rounded w-3/4"></div>
                        <div className="h-4 bg-gray-800 animate-pulse rounded"></div>
                      </div>
                    ) : devLogs.length > 0 ? (
                      <div className="space-y-4 font-mono text-[11px]">
                        {devLogs.map((log, index) => (
                          <div key={index} className="space-y-3">
                            <div className="space-y-1.5 p-3.5 bg-gray-950 border border-gray-800 rounded-lg text-violet-300">
                              <div className="flex justify-between items-center text-gray-500 border-b border-gray-800 pb-1.5 mb-1.5 text-[9px]">
                                <span>SYSTEM CLOCK: {new Date(log.systemClock).toLocaleTimeString()}</span>
                                <span className="text-emerald-500 font-bold">● STANDBY_OK</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Database Context:</span>
                                <span className="font-bold text-gray-100">{log.activeDatabaseFallback}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Registered Accounts:</span>
                                <span className="font-bold text-gray-100">{log.metrics?.registeredScholars || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Total Sessions Count:</span>
                                <span className="font-bold text-gray-100">{log.metrics?.authenticatedSessions || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Course Enrollments:</span>
                                <span className="font-bold text-gray-100">{log.metrics?.scholarlyEnrollments || 0}</span>
                              </div>
                            </div>

                            <div className="space-y-2 p-3 bg-gray-950 border border-gray-800 rounded-lg text-amber-200">
                              <div className="text-[10px] font-bold text-gray-400 pb-1">EXTERNAL DATA SYNC KEYS:</div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Google Sheets Sync:</span>
                                <span className={log.credentialsLoaded?.hasSheetsConfig ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                                  {log.credentialsLoaded?.hasSheetsConfig ? "AUTHORIZED" : "LOCAL_ONLY"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Firebase Database:</span>
                                <span className={log.credentialsLoaded?.hasFirebaseConfig ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                                  {log.credentialsLoaded?.hasFirebaseConfig ? "ACTIVE" : "PENDING"}
                                </span>
                              </div>
                            </div>

                            <div className="p-2 bg-violet-950/20 text-violet-400 border border-violet-800/30 rounded text-center font-bold text-[10px] font-mono tracking-wide uppercase">
                              {log.diagnosticCode}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-gray-500 text-xs font-mono">No telemetry state fetched.</p>
                    )
                  ) : (
                    <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2 text-center text-xs">
                      <Lock className="w-5 h-5 text-rose-400 mx-auto" />
                      <p className="font-bold text-slate-100">Developer Diagnostic Log Locked</p>
                      <p className="text-[10px] text-gray-500 font-sans leading-normal">
                        Only scholars holding the explicit <span className="font-mono text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded">developer</span> system role possess certificates to view diagnostic metrics.
                      </p>
                    </div>
                  )}
                </div>

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
                      <span className="font-bold font-mono text-violet-600 bg-violet-50 px-1 rounded text-[10px]">Developer</span>
                      <p className="flex-1">Configure container servers, probe system files, read real-time diagnostic telemetry counter.</p>
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

            {/* Security Logs & Apps Script Panel */}
            {(user.role === 'admin' || user.role === 'developer') && (
              <section id="security-console-panel" className="mt-12 bg-gray-900 text-slate-100 rounded-2xl border border-gray-800 shadow-2xl p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      <Shield className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                        Security Logs & Google Apps Script Console
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Configure Google Sheets synchronization engines and monitor account security activities.
                      </p>
                    </div>
                  </div>
                  
                  {/* Tabs Selector */}
                  <div className="flex gap-1 bg-gray-950 p-1 border border-gray-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveConsoleTab('script')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer select-none transition-all ${
                        activeConsoleTab === 'script'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-white hover:bg-gray-950'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Apps Script API</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveConsoleTab('logs')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer select-none transition-all ${
                        activeConsoleTab === 'logs'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-white hover:bg-gray-950'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Verification Logs</span>
                    </button>
                  </div>
                </div>

                {activeConsoleTab === 'script' ? (
                  <div id="apps-script-tab-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Instructions Column (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-blue-400 uppercase block">SPREADSHEET INTEGRATION FLOW</span>
                        <div className="space-y-4 text-xs text-gray-300">
                          <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 bg-blue-600/20 text-blue-400 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5">1</div>
                            <p className="leading-relaxed">
                              Copy the script code onto your clipboard using the <strong>Copy Script Code</strong> button on the right.
                            </p>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 bg-blue-600/20 text-blue-400 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5">2</div>
                            <p className="leading-relaxed">
                              Open your Google Sheet matching <code>GOOGLE_SHEET_ID</code>, navigate to <strong>Extensions &gt; Apps Script</strong>.
                            </p>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <div className="w-5 h-5 bg-blue-600/20 text-blue-400 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0 mt-0.5">3</div>
                            <p className="leading-relaxed">
                              Paste the code, save, and select <code>doPost</code> or <code>testLoginLogger</code> to test directly with your service accounts!
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2.5 text-xs text-gray-300">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase">
                          <Lock className="w-4 h-4" />
                          <span>SECURITY SAFEGUARDS</span>
                        </div>
                        <p className="leading-relaxed text-gray-400">
                          This school limits scholar account access strictly to verified emails. If your account is not verified, credentials will be blocked by internal security middle-layers.
                        </p>
                      </div>
                    </div>

                    {/* Code Box Column (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5 text-blue-400" />
                          <span>APP_SCRIPT.gs</span>
                        </span>
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-all select-none border border-gray-700"
                        >
                          {copiedAppScript ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Script Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <pre id="script-pre-box" className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-[10.5px] font-mono text-gray-300 leading-snug overflow-x-auto max-h-[350px] scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                          {appScriptSrc}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div id="verification-logs-tab-content" className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-800">
                      <span>Recent Live Authentication Events (Filtered to <strong className="text-slate-100">{user.email}</strong>)</span>
                      <span className="font-mono text-[10px] bg-gray-950 px-2.5 py-0.5 rounded-full border border-gray-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Interactive Sync Active</span>
                      </span>
                    </div>

                    {logsLoading ? (
                      <div className="text-center py-12">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs text-gray-400 font-mono">Querying real-time event logs...</span>
                      </div>
                    ) : loginHistory.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-900 border-b border-gray-800 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                              <th className="p-3">Timestamp / Date</th>
                              <th className="p-3">Email Address</th>
                              <th className="p-3">Scholar Name</th>
                              <th className="p-3">Login Status</th>
                              <th className="p-3">Session Identifier</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                            {loginHistory.map((log, idx) => {
                              let statusColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                              if (log.status === "SUCCESS") {
                                statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                              } else if (log.status === "BLOCKED_UNVERIFIED") {
                                statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                              }
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-900/60 transition-colors">
                                  <td className="p-3 text-[11px] whitespace-nowrap text-gray-400">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-[11px]">{log.email}</td>
                                  <td className="p-3 text-[11px] text-slate-100">{log.name}</td>
                                  <td className="p-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                                      {log.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[11px] text-gray-400">{log.details}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 p-6 bg-gray-950 border border-gray-800 rounded-xl">
                        <Activity className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <span className="text-xs text-gray-400 block font-mono">No matching account verification events recorded.</span>
                        <p className="text-[10px] text-gray-500 mt-1">Attempts made with your institutional email {user.email} will stream live to this spreadsheet console.</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
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

    </div>
  );
}
