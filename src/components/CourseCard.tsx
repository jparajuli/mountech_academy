import React from 'react';
import { Course } from '../types';
import { Clock, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
  // Return the SVG code based on the course's thumbnail icon identifier (Minimalist Blues style)
  const renderSVGIcon = (code: string) => {
    switch (code) {
      case 'prompt':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-prompt-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            {/* Braces */}
            <text x="40" y="115" className="font-mono text-brand-blue font-bold" fontSize="48" opacity="0.2">{'['}</text>
            <text x="320" y="115" className="font-mono text-brand-blue font-bold" fontSize="48" opacity="0.2">{']'}</text>
            {/* Prompt lines */}
            <line x1="100" y1="80" x2="300" y2="80" stroke="#0070f3" strokeWidth="2.5" strokeDasharray="5,5" opacity="0.8" />
            <line x1="100" y1="105" x2="260" y2="105" stroke="#0070f3" strokeWidth="2.5" />
            <line x1="100" y1="130" x2="220" y2="130" stroke="#0256cc" strokeWidth="2.5" />
            {/* Connected nodes */}
            <circle cx="260" cy="105" r="4.5" fill="#38bdf8" />
            <circle cx="220" cy="130" r="4.5" fill="#38bdf8" />
            {/* Wave paths representing semantic patterns */}
            <path d="M 60 160 Q 130 145 200 160 T 340 160" stroke="#0070f3" strokeWidth="1.5" opacity="0.15" fill="none" />
          </svg>
        );
      case 'agents':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-agents-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            {/* Multiple agents talking */}
            <rect x="80" y="60" width="80" height="60" rx="5" fill="#0f172a" stroke="#0070f3" strokeWidth="1.5" />
            <rect x="240" y="60" width="80" height="60" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Agent roles */}
            <text x="95" y="85" fontSize="10" className="font-mono" fill="#38bdf8">CODE_AGENT</text>
            <text x="255" y="85" fontSize="10" className="font-mono" fill="#a5f3fc">TEST_AGENT</text>
            <line x1="110" y1="100" x2="130" y2="100" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="270" y1="100" x2="290" y2="100" stroke="#a5f3fc" strokeWidth="1.5" />
            {/* Arrow connections */}
            <path d="M 170 80 C 190 70, 210 70, 230 80" stroke="#0070f3" strokeWidth="1.5" fill="none" strokeDasharray="3,3" />
            <path d="M 230 100 C 210 110, 190 110, 170 100" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </svg>
        );
      case 'deeplearning':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-dl-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            {/* Neural network graph */}
            {/* Input layer */}
            <circle cx="80" cy="60" r="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            <circle cx="80" cy="100" r="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            <circle cx="80" cy="140" r="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            {/* Hidden layer */}
            <circle cx="200" cy="40" r="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="200" cy="80" r="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            <circle cx="200" cy="120" r="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            <circle cx="200" cy="160" r="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Output layer */}
            <circle cx="320" cy="80" r="10" fill="#1e293b" stroke="#0070f3" strokeWidth="2" />
            <circle cx="320" cy="120" r="10" fill="#0f172a" stroke="#0070f3" strokeWidth="1" opacity="0.5" />

            {/* Connections */}
            <g opacity="0.25" stroke="#0070f3" strokeWidth="1">
              <line x1="90" y1="60" x2="190" y2="40" />
              <line x1="90" y1="60" x2="190" y2="80" />
              <line x1="90" y1="60" x2="190" y2="120" />
              <line x1="90" y1="100" x2="190" y2="40" />
              <line x1="90" y1="100" x2="190" y2="80" strokeWidth="1.5" />
              <line x1="90" y1="100" x2="190" y2="120" strokeWidth="1.5" />
              <line x1="90" y1="140" x2="190" y2="80" />
              <line x1="90" y1="140" x2="190" y2="120" />
              <line x1="210" y1="80" x2="308" y2="80" strokeWidth="1.5" />
              <line x1="210" y1="120" x2="308" y2="80" />
            </g>
          </svg>
        );
      case 'python':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-python-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            <path d="M 120 70 C 180 30, 220 170, 280 130" stroke="#0070f3" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 120 130 C 180 170, 220 30, 280 70" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
            {/* Terminal lines */}
            <rect x="140" y="75" width="120" height="50" rx="4" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
            <text x="150" y="95" className="font-mono text-blue-400 font-bold" fontSize="9">def ai_agent():</text>
            <text x="165" y="110" className="font-mono text-emerald-450" fontSize="9">  return model.run()</text>
          </svg>
        );
      case 'systems':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-systems-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            <rect x="50" y="80" width="60" height="40" rx="3" fill="#0f172a" stroke="#0070f3" strokeWidth="1.5" />
            <text x="65" y="104" fontSize="10" className="font-semibold" fill="#0070f3">INPUT</text>

            <rect x="170" y="80" width="60" height="40" rx="3" fill="#0f172a" stroke="#0070f3" strokeWidth="1.5" />
            <text x="185" y="104" fontSize="10" className="font-semibold" fill="#0070f3">LLM</text>

            <rect x="290" y="80" width="60" height="40" rx="3" fill="#0f172a" stroke="#0070f3" strokeWidth="1.5" />
            <text x="301" y="104" fontSize="10" className="font-semibold" fill="#0070f3">SYSTEM</text>

            <line x1="110" y1="100" x2="170" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="230" y1="100" x2="290" y2="100" stroke="#0070f3" strokeWidth="1.5" />
          </svg>
        );
      case 'rag':
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-rag-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            <ellipse cx="120" cy="80" rx="25" ry="8" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            <path d="M 95 80 L 95 100 A 25 8 0 0 0 145 100 L 145 80 Z" fill="#1e293b" stroke="#0070f3" strokeWidth="1.5" />
            {/* Document icon on right */}
            <rect x="250" y="65" width="45" height="60" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="260" y1="80" x2="285" y2="80" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="260" y1="95" x2="285" y2="95" stroke="#38bdf8" strokeWidth="1.5" />

            <path d="M 148 90 Q 195 80 240 90" stroke="#0070f3" strokeWidth="1.5" strokeDasharray="2,2" fill="none" />
          </svg>
        );
      default: // genai
        return (
          <svg viewBox="0 0 400 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" id={`svg-genai-${course.id}`}>
            <rect width="400" height="200" fill="currentColor" opacity="0.04" />
            <circle cx="200" cy="100" r="32" fill="#0f172a" stroke="#0070f3" strokeWidth="1.5" />
            <circle cx="200" cy="100" r="12" fill="#0070f3" />
            <line x1="130" y1="100" x2="160" y2="100" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="240" y1="100" x2="270" y2="100" stroke="#0070f3" strokeWidth="1.5" />
          </svg>
        );
    }
  };

  const getDifficultyColor = (diff: Course['difficulty']) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-slate-100 text-slate-800';
      case 'Intermediate':
        return 'bg-blue-50 text-[#0070f3]';
      case 'Advanced':
        return 'bg-zinc-800 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeStyle = (type: Course['type']) => {
    switch (type) {
      case 'Short Course':
        return 'text-[#0070f3] font-bold border-[#0070f3]/20 bg-[#0070f3]/5';
      case 'Course':
        return 'text-emerald-600 font-bold border-emerald-500/20 bg-emerald-500/5';
      case 'Professional Certificate':
        return 'text-purple-600 font-bold border-purple-500/20 bg-purple-500/5';
      default:
        return 'text-gray-500 font-bold border-gray-500/20 bg-gray-500/5';
    }
  };

  return (
    <motion.div
      id={`course-card-${course.id}`}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      onClick={onClick}
      className="group bg-white rounded-xl overflow-hidden border border-[#e5e7eb] hover:border-brand-blue hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between h-[420px] relative"
    >
      <div>
        {/* Course Thumbnail Image Layer */}
        <div className={`h-[160px] relative overflow-hidden flex items-center justify-center ${course.thumbnailBg}`}>
          {/* Custom SVG Illustration */}
          {renderSVGIcon(course.thumbnailIconCode)}

          {/* Tag indicating partner on the bottom right of thumbnail */}
          {course.partnerName && (
            <span id={`partner-badge-${course.id}`} className="absolute bottom-3 right-3 bg-black/60 text-white font-mono text-[9px] tracking-wider px-2 py-0.5 rounded backdrop-blur-xs font-semibold">
              {course.partnerName.toUpperCase()}
            </span>
          )}
          {/* Difficulty indicator tag */}
          <span id={`diff-badge-${course.id}`} className={`absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm ${getDifficultyColor(course.difficulty)}`}>
            {course.difficulty}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col">
          {/* Course category/type */}
          <div className="mb-2 flex items-center justify-between">
            <span id={`type-badge-${course.id}`} className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border ${getTypeBadgeStyle(course.type)}`}>
              {course.type}
            </span>
            <span id={`price-badge-${course.id}`} className={`text-[10px] font-mono tracking-wider font-semibold ${course.isPaid ? 'text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded' : 'text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded'}`}>
              {course.isPaid ? `$${course.price}` : 'FREE'}
            </span>
          </div>

          {/* Title */}
          <h3 id={`course-title-${course.id}`} className="text-[#111827] font-sans font-bold text-base leading-snug group-hover:text-brand-blue transition-colors duration-200 line-clamp-2 min-h-[46px]">
            {course.title}
          </h3>

          {/* One-sentence Description */}
          <p id={`course-desc-${course.id}`} className="text-gray-500 text-xs md:text-sm mt-2 line-clamp-2 leading-relaxed min-h-[40px]">
            {course.description}
          </p>
        </div>
      </div>

      {/* Footer Details */}
      <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-neutral-50/50">
        <div id={`instructor-info-${course.id}`} className="flex items-center gap-2">
          {/* Minimalist avatar icon */}
          {course.instructor?.avatar ? (
            <img 
              src={course.instructor.avatar} 
              alt={course.instructorName} 
              className="w-6 h-6 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#111827] text-[#ffffff] flex items-center justify-center font-bold text-[10px]">
              {course.instructorName ? course.instructorName.trim().charAt(0) : '?'}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-gray-800 line-clamp-1 max-w-[120px]" title={course.instructorName}>
              {course.instructorName}
            </span>
            <span className="text-[9px] text-gray-400">
              Instructor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 font-mono font-medium">
          <div id={`duration-${course.id}`} className="flex items-center gap-1" title="Duration">
            <Clock className="w-3.5 h-3.5 text-gray-300" />
            <span>{course.duration}</span>
          </div>
          <div id={`lessons-${course.id}`} className="flex items-center gap-1" title="Lectures">
            <BookOpen className="w-3.5 h-3.5 text-gray-300" />
            <span>{course.lessonCount.split(' ')[0]} lessons</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
