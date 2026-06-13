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
import { getLoginHistory, LoginEvent } from '../api';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CoursesProps {
  user: User;
  onSignOut: () => void;
  onSelectCourse: (course: Course) => void;
}

export default function Courses({ user, onSignOut, onSelectCourse }: CoursesProps) {
  const [currentMenuTab, setCurrentMenuTab] = useState<'catalog' | 'resources'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');

  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'script' | 'logs'>('script');
  const [copiedAppScript, setCopiedAppScript] = useState(false);

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
 * 1. Open your Google Sheet (matching GOOGLE_SHEET_ID).
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any boilerplate code and paste this entire script.
 * 4. Save and deploy as a Web App to stream real-time logs remotely!
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    var email = data.email || "Unknown Email";
    var name = data.name || "Unknown Scholar";
    var status = data.status || "Attempt";
    var timestamp = data.timestamp || new Date().toISOString();
    var details = data.details || "API Call";

    var doc = SpreadsheetApp.getActiveSpreadsheet();
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
    
    // Auto-adjust column widths
    var columns = sheet.getLastColumn();
    for (var col = 1; col <= columns; col++) {
      sheet.autoResizeColumn(col);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Successfully recorded login session information."
    })).setMimeType(ContentService.MimeType.JSON);
    
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
              <button
                onClick={() => setCurrentMenuTab('resources')}
                className={`transition-colors cursor-pointer select-none py-1 border-b-2 ${currentMenuTab === 'resources' ? 'text-[#0070f3] border-[#0070f3]' : 'text-[#4b5563] border-transparent hover:text-[#0070f3]'}`}
              >
                Lecture Resources & GitLab Hub
              </button>
            </nav>
          </div>

          {/* User Profile & Logout Action */}
          <div className="flex items-center gap-4">
            <div id="user-profile-summary" className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#111827]">{user.name}</span>
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
        <button 
          onClick={() => setCurrentMenuTab('resources')} 
          className={`pb-1 transition-all cursor-pointer ${currentMenuTab === 'resources' ? 'text-[#0070f3] border-b-2 border-[#0070f3]' : 'text-[#4b5563] border-transparent'}`}
        >
          Resources & GitLab
        </button>
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
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex-grow w-full">
        {currentMenuTab === 'resources' ? (
          <ResourcePortal courses={courses} user={user} />
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
