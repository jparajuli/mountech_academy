import React, { useState, useEffect } from 'react';
import { 
  fetchCourseExams, 
  createCourseExam, 
  deleteCourseExam, 
  createExamQuestion, 
  updateExamQuestion, 
  deleteExamQuestion 
} from '../api';
import { Exam, ExamQuestion } from '../types';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  X, 
  Sparkles, 
  HelpCircle, 
  Save, 
  AlertCircle, 
  ToggleLeft, 
  ToggleRight, 
  ArrowLeft,
  Briefcase,
  Layers,
  ChevronRight,
  Sparkle,
  Loader2
} from 'lucide-react';

interface InstructorExamBuilderProps {
  courseId: string;
}

export const InstructorExamBuilder: React.FC<InstructorExamBuilderProps> = ({ courseId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create Exam Form state
  const [showCreateExam, setShowCreateExam] = useState<boolean>(false);
  const [examTitle, setExamTitle] = useState<string>('');
  const [examDescription, setExamDescription] = useState<string>('');
  const [examIsPublished, setExamIsPublished] = useState<boolean>(false);
  const [examQuestionsToDisplay, setExamQuestionsToDisplay] = useState<number>(5);
  const [examPassingScorePercentage, setExamPassingScorePercentage] = useState<number>(70);
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(30);
  const [submittingExam, setSubmittingExam] = useState<boolean>(false);

  // Selected Exam for builder interaction
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Question Form states
  const [activeQuestion, setActiveQuestion] = useState<Partial<ExamQuestion> | null>(null);
  const [questionText, setQuestionText] = useState<string>('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [options, setOptions] = useState<string[]>(['', '']); // default MCQ options list
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [points, setPoints] = useState<number>(1);
  const [savingQuestion, setSavingQuestion] = useState<boolean>(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null);

  // Load course exams
  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCourseExams(courseId);
      if (res.success) {
        setExams(res.exams || []);
        // Preserve selected exam reference if already selected to refresh the question list
        if (selectedExam) {
          const fresh = (res.exams || []).find(e => e.id === selectedExam.id);
          if (fresh) setSelectedExam(fresh);
        }
      } else {
        setError('Failed to fetch exams assigned to this course.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while fetching course exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [courseId]);

  // Handle Exam Creation
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      setError('Please input a valid exam title.');
      return;
    }

    setSubmittingExam(true);
    setError(null);

    try {
      const res = await createCourseExam(courseId, {
        title: examTitle.trim(),
        description: examDescription.trim(),
        is_published: examIsPublished,
        questions_to_display: Number(examQuestionsToDisplay) || 5,
        passing_score_percentage: Number(examPassingScorePercentage) || 70,
        duration_minutes: Number(examDurationMinutes) || 30,
      } as any);

      if (res.success) {
        setExamTitle('');
        setExamDescription('');
        setExamIsPublished(false);
        setExamQuestionsToDisplay(5);
        setExamPassingScorePercentage(70);
        setExamDurationMinutes(30);
        setShowCreateExam(false);
        await loadExams();
      } else {
        setError('Failed to publish the new exam.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while saving exam registry.');
    } finally {
      setSubmittingExam(false);
    }
  };

  // Handle Exam Delete
  const handleDeleteExam = async (examId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this exam? This will erase all integrated question nodes.')) {
      return;
    }

    try {
      const res = await deleteCourseExam(examId);
      if (res.success) {
        if (selectedExam?.id === examId) {
          setSelectedExam(null);
          setActiveQuestion(null);
        }
        await loadExams();
      } else {
        setError('Failed to remove exam.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not execute exam erasure.');
    }
  };

  // Trigger editing/adding question form
  const handleAddNewQuestion = (type: 'multiple_choice' | 'true_false' | 'short_answer') => {
    setQuestionError(null);
    setQuestionSuccess(null);
    setQuestionText('');
    setQuestionType(type);
    setPoints(5);
    
    if (type === 'multiple_choice') {
      setOptions(['Option A', 'Option B', 'Option C', 'Option D']);
      setCorrectAnswer('Option A');
    } else if (type === 'true_false') {
      setOptions(['True', 'False']);
      setCorrectAnswer('True');
    } else {
      setOptions([]);
      setCorrectAnswer('');
    }

    setActiveQuestion({
      question_text: '',
      question_type: type,
      options: type === 'multiple_choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : type === 'true_false' ? ['True', 'False'] : [],
      correct_answer: type === 'multiple_choice' ? 'Option A' : 'True',
      points: 5
    });
  };

  const handleEditQuestion = (q: ExamQuestion) => {
    setQuestionError(null);
    setQuestionSuccess(null);
    setActiveQuestion(q);
    setQuestionText(q.question_text);
    setQuestionType(q.question_type);
    setOptions(q.options || []);
    setCorrectAnswer(q.correct_answer);
    setPoints(q.points || 5);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setQuestionError('Multiple choice questions require at least 2 options.');
      return;
    }
    const val = options[index];
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    if (correctAnswer === val) {
      setCorrectAnswer(updated[0] || '');
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    const prevVal = updated[index];
    updated[index] = val;
    setOptions(updated);
    if (correctAnswer === prevVal) {
      setCorrectAnswer(val);
    }
  };

  // Save question (Submit POST or PUT)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError(null);
    setQuestionSuccess(null);

    if (!questionText.trim()) {
      setQuestionError('Question text cannot be left blank.');
      return;
    }

    if (questionType === 'multiple_choice') {
      const emptyCheck = options.some(o => !o.trim());
      if (emptyCheck) {
        setQuestionError('All MCQ choice options must contain text.');
        return;
      }
      if (!options.includes(correctAnswer)) {
        setQuestionError('Please designate one of the options as the correct answer.');
        return;
      }
    }

    if (questionType === 'true_false') {
      if (correctAnswer !== 'True' && correctAnswer !== 'False') {
        setQuestionError('True/False questions must designate "True" or "False" as the correct answer.');
        return;
      }
    }

    if (questionType === 'short_answer' && !correctAnswer.trim()) {
      setQuestionError('Please specify the acceptable correct answer string.');
      return;
    }

    if (!selectedExam || !selectedExam.id) return;

    setSavingQuestion(true);

    try {
      const payload = {
        question_text: questionText.trim(),
        question_type: questionType,
        options: questionType !== 'short_answer' ? options : [],
        correct_answer: correctAnswer.trim(),
        points: Number(points)
      };

      if (activeQuestion && activeQuestion.id) {
        // Edit existing
        const res = await updateExamQuestion(selectedExam.id, activeQuestion.id, payload);
        if (res.success) {
          setQuestionSuccess('Question details stored securely.');
          setActiveQuestion(null);
          await loadExams();
        } else {
          setQuestionError('Error occurred while updating the question.');
        }
      } else {
        // Create new
        const res = await createExamQuestion(selectedExam.id, payload);
        if (res.success) {
          setQuestionSuccess('New question node appended to exam.');
          setActiveQuestion(null);
          await loadExams();
        } else {
          setQuestionError('Failed to append question.');
        }
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Server error occurred during save.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Handle Question Delete
  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedExam || !selectedExam.id) return;
    if (!window.confirm('Delete this exam question permanently?')) return;

    try {
      const res = await deleteExamQuestion(selectedExam.id, questionId);
      if (res.success) {
        if (activeQuestion?.id === questionId) {
          setActiveQuestion(null);
        }
        await loadExams();
      } else {
        setQuestionError('Failed to delete question.');
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Connection lost.');
    }
  };

  // Main UI layout
  return (
    <div className="space-y-6" id="exams-builder-system">
      {/* Upper layout: Exam Header */}
      {!selectedExam ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-md font-bold text-gray-950 flex items-center gap-1.5">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span>Exam Management Portal</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure course examinations, toggle published nodes, and author question sets.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateExam(!showCreateExam)}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Exam</span>
            </button>
          </div>

          {/* Exam Creation Box Overlay */}
          {showCreateExam && (
            <div className="bg-slate-50 border border-gray-200 p-5 rounded-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-gray-700">Configure Draft Exam</h4>
                <button 
                  onClick={() => setShowCreateExam(false)}
                  className="text-gray-400 hover:text-gray-650"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1">Exam Title</label>
                    <input
                      type="text"
                      required
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="e.g. Midterm Evaluation: Fundamentals of AI Architecture"
                      className="w-full text-xs border border-gray-250 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setExamIsPublished(!examIsPublished)}
                      className="text-gray-600 flex items-center gap-2 text-xs font-semibold select-none bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      {examIsPublished ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                      <span>Published to Students</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1">Description / Guidelines</label>
                  <textarea
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    placeholder="Provide description, time limits, scoring protocols..."
                    rows={3}
                    className="w-full text-xs border border-gray-250 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1">
                      Random Question Limit (From Bank)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={examQuestionsToDisplay}
                      onChange={(e) => setExamQuestionsToDisplay(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="e.g. 5"
                      className="w-full text-xs border border-gray-250 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">How many random questions are pulled for each student's attempt.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1">
                      Passing Score Percentage (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={examPassingScorePercentage}
                      onChange={(e) => setExamPassingScorePercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 70)))}
                      placeholder="e.g. 70"
                      className="w-full text-xs border border-gray-250 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">The threshold of correct answers required to pass the exam.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-1">
                      Duration Timer (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={examDurationMinutes}
                      onChange={(e) => setExamDurationMinutes(Math.max(1, parseInt(e.target.value) || 30))}
                      placeholder="e.g. 30"
                      className="w-full text-xs border border-gray-250 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Time limit before automatic answer submission.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateExam(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExam}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    {submittingExam ? 'Saving Exam...' : 'Create Exam Registry'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center bg-white border border-gray-150 rounded-xl shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Synchronizing Exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="py-16 text-center bg-white border border-gray-150 rounded-xl shadow-xs max-w-xl mx-auto p-8">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-gray-900 font-bold text-sm mb-1">No Exam Schemes Configured</h4>
              <p className="text-xs text-gray-500">Currently, no evaluation tests are loaded on this classroom. click "Add New Exam" to format your first knowledge test node.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between hover:shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{exam.title}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded-full uppercase shrink-0 select-none ${exam.is_published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                      {exam.description || <span className="italic text-gray-400">No descriptive guidelines documented yet.</span>}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-5 flex items-center justify-between text-xs font-semibold font-mono text-gray-500 select-none">
                    <div className="flex flex-col gap-0.5">
                      <span>{exam.questions?.length || 0} Questions in Bank</span>
                      <span className="text-[10px] text-gray-400">Draw limit: {exam.questions_to_display || 5} • Required: {exam.passing_score_percentage || 70}% • Duration: {exam.duration_minutes || 30} mins</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id!)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedExam(exam)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Build Questions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Question Builder Node Panel */
        <div className="space-y-6">
          {/* Back button and selected metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <button
              onClick={() => {
                setSelectedExam(null);
                setActiveQuestion(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 font-bold tracking-wide transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Course Exam Schemes</span>
            </button>

            <div className="text-right">
              <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full select-none inline-block">
                Assigned: {selectedExam.title}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Dynamic Question Authoring Form */}
            <div className="lg:col-span-5 space-y-6 bg-slate-50/50 border border-gray-150 rounded-xl p-5 shadow-2xs">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{activeQuestion ? (activeQuestion.id ? 'Edit Question Node' : 'Format New Question') : 'Evaluate Exam Node'}</span>
                </h4>
                <p className="text-[11px] text-gray-500">Author and validate evaluation formulas before indexing them inside Mountech tables.</p>
              </div>

              {/* Add Question Category Selectors */}
              {!activeQuestion && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center space-y-3">
                  <HelpCircle className="w-8 h-8 text-indigo-100 mx-auto" />
                  <p className="text-xs text-gray-600 font-semibold">Choose Question Format to Begin</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddNewQuestion('multiple_choice')}
                      className="p-2 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 font-semibold text-[11px] text-gray-700 rounded-lg cursor-pointer transition-all"
                    >
                      Multiple Choice (MCQ)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNewQuestion('true_false')}
                      className="p-2 border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 font-semibold text-[11px] text-gray-700 rounded-lg cursor-pointer transition-all"
                    >
                      True / False
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIVE QUESTION FORM */}
              {activeQuestion && (
                <form onSubmit={handleSaveQuestion} className="space-y-4 font-sans text-xs">
                  {questionError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-1.5 leading-relaxed text-[10px]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>{questionError}</span>
                    </div>
                  )}

                  {questionSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-1.5 leading-relaxed text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      <span>{questionSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-1">
                      Question Text
                    </label>
                    <textarea
                      required
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="e.g. Which of the following best describes the core utility of a deep-reasoning multi-stage template?"
                      rows={4}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none bg-white p-3 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-1">
                        Question Format
                      </label>
                      <span className="block border border-gray-150 p-2.5 rounded-lg bg-gray-50 text-[11px] font-semibold text-gray-700 font-mono capitalize">
                        {questionType.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-1">
                        Score Awarded (Points)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={points}
                        onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-xs font-semibold border border-gray-200 rounded-lg p-2.5 focus:border-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* MCQ OPTIONS BUILDER */}
                  {questionType === 'multiple_choice' && (
                    <div className="space-y-3.5 bg-white border border-gray-150 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold font-mono text-gray-500 uppercase tracking-widest">
                          Configure MCQ Choices
                        </label>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-[10px] font-bold font-mono text-indigo-600 hover:text-indigo-850 flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Choice Option</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="mcq-correct-toggle"
                              checked={correctAnswer === opt && opt !== ''}
                              onChange={() => {
                                if (opt.trim() !== '') {
                                  setCorrectAnswer(opt);
                                }
                              }}
                              className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              placeholder={`Option text #${idx + 1}`}
                              className="flex-1 text-xs border border-gray-200 rounded-md p-1.5 focus:border-indigo-500 bg-slate-50/50"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1 hover:bg-gray-100 rounded text-red-500 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg bg-indigo-50/50 border border-indigo-150 p-2.5 text-[9px] text-indigo-700 leading-normal flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-indigo-600" />
                        <span>The checked radio button designates the correct answer. Ensure it is populated with custom text.</span>
                      </div>
                    </div>
                  )}

                  {/* True / False Selection */}
                  {questionType === 'true_false' && (
                    <div className="space-y-2 bg-white border border-gray-150 p-4 rounded-xl shadow-xs">
                      <label className="block text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest mb-1">
                        Correct Option Designation
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['True', 'False'].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setCorrectAnswer(tf)}
                            className={`p-2.5 border text-xs font-semibold rounded-lg cursor-pointer transition-colors ${correctAnswer === tf ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveQuestion(null)}
                      className="flex-1 py-2.5 bg-gray-150 hover:bg-gray-200 font-semibold text-gray-700 text-xs rounded-lg cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={savingQuestion}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-2xs"
                    >
                      {savingQuestion ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Question</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT COLUMN: Active Questions list under builder */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="text-xs font-extrabold font-mono text-gray-400 uppercase tracking-widest">
                  Evaluations Nodes List ({selectedExam.questions?.length || 0})
                </h4>
              </div>

              {(!selectedExam.questions || selectedExam.questions.length === 0) ? (
                <div className="p-12 text-center bg-white border border-gray-150 rounded-xl max-w-md mx-auto">
                  <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-semibold">No questions configured.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Select an MCQ or T/F in the left sidebar to add questions immediately.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedExam.questions.map((q, qIndex) => (
                    <div
                      key={q.id || qIndex}
                      className="bg-white border border-gray-150 rounded-xl p-4 shadow-3xs flex flex-col justify-between relative hover:border-indigo-150 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase bg-slate-100 text-gray-500 border border-gray-150 px-1.5 py-0.2 rounded">
                            Q{qIndex + 1} • {q.question_type.replace('_', ' ')}
                          </span>

                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/75 border border-indigo-100 px-2 py-0.5 rounded-full select-none">
                            {q.points || 5} Points
                          </span>
                        </div>

                        <p className="font-bold text-gray-950 text-xs leading-relaxed leading-normal">{q.question_text}</p>

                        {/* Rendering choices */}
                        {q.question_type !== 'short_answer' && q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-2.5 pl-1.5 select-none text-[11px]">
                            {q.options.map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-lg border text-left flex items-start gap-1.5 ${q.correct_answer === opt ? 'bg-emerald-50/50 border-emerald-250 text-emerald-800 font-semibold' : 'bg-slate-50/50 border-gray-100 text-gray-500'}`}
                              >
                                {q.correct_answer === opt ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0 mt-0.5 bg-white" />
                                )}
                                <span className="truncate leading-normal">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.question_type === 'short_answer' && (
                          <div className="pt-2">
                            <span className="text-[10px] font-semibold text-gray-400">Acceptable solution:</span>
                            <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded ml-2">
                              {q.correct_answer}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-3 mt-4 flex justify-end gap-2 text-xs font-mono">
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.2 hover:bg-slate-100 border border-gray-200 text-gray-600 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.2 hover:bg-red-50 hover:text-red-700 border border-red-100 text-red-600 font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
