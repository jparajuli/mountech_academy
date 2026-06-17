import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Loader2, FileEdit, BookOpen, Clock } from 'lucide-react';
import { updateCourseSyllabus, fetchAdminCoursesList, fetchInstructorDashboard, fetchCoursesList } from '../../api';

interface SyllabusEditorProps {
  courseId: string;
  initialSyllabus?: string;
  initialSyllabusContent?: string; // Fallback to handle alternate prop names gracefully
  onSyllabusSaved?: (newContent: string) => void;
}

export const SyllabusEditor: React.FC<SyllabusEditorProps> = ({
  courseId,
  initialSyllabus = '',
  initialSyllabusContent = '',
  onSyllabusSaved,
}) => {
  const incomingInitialContent = initialSyllabus || initialSyllabusContent || '';
  const [syllabus, setSyllabus] = useState<string>(incomingInitialContent);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<{ date: string; user: string } | null>(null);

  // Sync initial content on props change
  useEffect(() => {
    setSyllabus(incomingInitialContent);
  }, [incomingInitialContent]);

  // Fetch coordination audit details from the backend on load
  const loadCoordinationAudit = async () => {
    try {
      // 1. Try fetching admin list first
      try {
        const res = await fetchAdminCoursesList();
        if (res.success && res.courses) {
          const match = res.courses.find(c => String(c.id) === String(courseId));
          if (match && match.syllabus_last_updated_at && match.syllabus_last_updated_by_name) {
            setLastUpdated({
              date: match.syllabus_last_updated_at,
              user: match.syllabus_last_updated_by_name
            });
            return;
          }
        }
      } catch (_) {}

      // 2. Try fetching instructor dashboard list
      try {
        const res = await fetchInstructorDashboard();
        if (res.success && res.courses) {
          const match = res.courses.find(c => String(c.id) === String(courseId));
          if (match && match.syllabus_last_updated_at && match.syllabus_last_updated_by_name) {
            setLastUpdated({
              date: match.syllabus_last_updated_at,
              user: match.syllabus_last_updated_by_name
            });
            return;
          }
        }
      } catch (_) {}

      // 3. Fallback to public catalog
      try {
        const res = await fetchCoursesList();
        if (res.success && res.courses) {
          const match = res.courses.find(c => String(c.id) === String(courseId));
          if (match && match.syllabus_last_updated_at && match.syllabus_last_updated_by_name) {
            setLastUpdated({
              date: match.syllabus_last_updated_at,
              user: match.syllabus_last_updated_by_name
            });
            return;
          }
        }
      } catch (_) {}
    } catch (err: any) {
      console.warn("Failed retrieving course auditing coordinates:", err);
    }
  };

  useEffect(() => {
    loadCoordinationAudit();
  }, [courseId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateCourseSyllabus(courseId, syllabus);
      if (res.success) {
        setSuccess(true);
        
        // Update local coordination state immediately with the saved values
        if (res.syllabus_last_updated_at && res.syllabus_last_updated_by_name) {
          setLastUpdated({
            date: res.syllabus_last_updated_at,
            user: res.syllabus_last_updated_by_name
          });
        } else {
          // Re-fetch coordination audit if they aren't directly returned
          await loadCoordinationAudit();
        }

        if (onSyllabusSaved) {
          onSyllabusSaved(syllabus);
        }
        
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.message || 'Error occurred while saving course syllabus.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed connecting to server. Ensure you have proper instructor/admin credentials.');
    } finally {
      setSaving(false);
    }
  };

  const loadSampleMarkdown = () => {
    const sample = `### Course Syllabus & Learning Path

#### Week 1: Foundations & Core Paradigms
- Introduction to architectural principles and foundational systems layout.
- Designing modular files, avoiding single-resource compilation bottlenecks.
- Hands-on Lab: Spinning up multi-stage SQLite relational setups.

#### Week 2: Routing Security & Auth Gates
- Restricting controllers using token validations and join checks.
- Building custom validation pipelines with Zod schemas.
- Hands-on Lab: Writing a course-ownership gate middleware.

#### Week 3: Interactive Visualizations & Exam Systems
- Implementing responsive d3 canvas elements.
- Constructing question pipelines (MCQs, True/False, Short answers).
- Final Project Submission & Peer Grading.`;
    setSyllabus(sample);
  };

  return (
    <div className="bg-white border border-gray-150 rounded-xl shadow-sm p-6 space-y-6 animate-fade-in" id="unified-syllabus-editor-container">
      
      {/* Coordination / Auditing UI Banner */}
      {lastUpdated ? (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 shadow-3xs" id="syllabus-audit-banner">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-700 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold block text-indigo-950">Syllabus Coordination Tracker</span>
              <span className="text-indigo-805 text-[11px]">
                Last updated on <span className="font-bold">{new Date(lastUpdated.date).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' })}</span> by <span className="font-bold text-indigo-950 font-sans">{lastUpdated.user}</span>
              </span>
            </div>
          </div>
          <span className="text-[9px] font-bold font-mono text-indigo-600 bg-indigo-100/80 px-2.5 py-1 rounded-md border border-indigo-200 uppercase tracking-wider select-none shrink-0 w-fit self-start sm:self-auto">
            Synced with Backend
          </span>
        </div>
      ) : (
        <div className="bg-slate-50 border border-gray-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-4 h-4 italic text-gray-300" />
          <span>Syllabus coordination data not yet set. Save to publish your first tracked revision.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-md font-bold text-gray-900 flex items-center gap-1.5">
            <FileEdit className="w-5 h-5 text-indigo-600" />
            <span>Syllabus & Curriculum Editor</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Customize the instructional syllabus using Markdown. This syllabus is shown directly on the student course details page.</p>
        </div>

        <button
          type="button"
          onClick={loadSampleMarkdown}
          className="px-3 py-1.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start"
        >
          Insert Template Structure
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 font-sans">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-950">Syllabus Published Successfully</p>
            <p className="text-gray-500 text-[11px] mt-0.5">The course profile description and syllabus are synchronized. Students have immediate access.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-mono">
          Curriculum Markdown Editor
        </label>
        <textarea
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          placeholder="Type your course syllabus here (supports Markdown format)..."
          rows={14}
          className="w-full text-xs font-mono border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 leading-relaxed"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-gray-150 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
          <span>Supports standard headers, bolding, bullet points, and paragraphs.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Publishing Changes...' : 'Save Syllabus'}</span>
        </button>
      </div>
    </div>
  );
};
