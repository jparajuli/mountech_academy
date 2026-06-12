import React, { useState, useMemo } from 'react';
import { Course, User } from '../types';
import { courses } from '../courses';
import CourseCard from '../components/CourseCard';
import FilterBar from '../components/FilterBar';
import { LogOut, GraduationCap, ArrowUpRight, HelpCircle } from 'lucide-react';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CoursesProps {
  user: User;
  onSignOut: () => void;
  onSelectCourse: (course: Course) => void;
}

export default function Courses({ user, onSignOut, onSelectCourse }: CoursesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');

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
            <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#4b5563]">
              <a href="#" className="text-[#0070f3] hover:text-[#0051b3] transition-colors font-semibold">Catalog</a>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-mono font-bold text-gray-400">TUNING PLAYGROUND POWERED BY VITE & NODE</span>
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
