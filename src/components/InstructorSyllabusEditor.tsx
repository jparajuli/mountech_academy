import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Loader2, FileEdit, BookOpen } from 'lucide-react';
import { updateCourseSyllabus } from '../api';

interface InstructorSyllabusEditorProps {
  courseId: string;
  initialSyllabusContent?: string;
  onSyllabusSaved?: (newContent: string) => void;
}

export const InstructorSyllabusEditor: React.FC<InstructorSyllabusEditorProps> = ({
  courseId,
  initialSyllabusContent = '',
  onSyllabusSaved,
}) => {
  const [syllabus, setSyllabus] = useState<string>(initialSyllabusContent);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    setSyllabus(initialSyllabusContent);
  }, [initialSyllabusContent]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateCourseSyllabus(courseId, syllabus);
      if (res.success) {
        setSuccess(true);
        if (onSyllabusSaved) {
          onSyllabusSaved(syllabus);
        }
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.message || 'Error occurred while saving course syllabus.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed connecting to server. Ensure you have proper instructor credentials.');
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
    <div className="bg-white border border-gray-150 rounded-xl shadow-sm p-6 space-y-6" id="syllabus-editor-container">
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-805">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Syllabus Published Successfully</p>
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
          rows={16}
          className="w-full text-xs font-mono border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 leading-relaxed"
        />
      </div>

      <div className="flex justify-between items-center bg-slate-50 border border-gray-150 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <BookOpen className="w-4 h-4 text-gray-450" />
          <span>Supports standard headers, bolding, bullet points, and paragraphs.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
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
