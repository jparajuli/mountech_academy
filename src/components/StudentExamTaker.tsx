import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Play, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  FileText,
  BadgeAlert,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startStudentExam, submitStudentExamAnswers } from '../api';
import { Exam, ExamQuestion } from '../types';

interface StudentExamTakerProps {
  courseId: string;
  exam: Exam;
  onClose: (completedAttempt?: any) => void;
  completedLessons?: number[];
}

export const StudentExamTaker: React.FC<StudentExamTakerProps> = ({ courseId, exam, onClose, completedLessons }) => {
  const [step, setStep] = useState<'pre' | 'active' | 'post'>('pre');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Refs to avoid stale state in interval closure
  const answersRef = useRef(answers);
  const attemptIdRef = useRef(attemptId);
  
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  // Scored state (returned from secure server-side evaluation)
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    earnedPoints: number;
    totalPoints: number;
    questions: Array<{
      id: number;
      question_text: string;
      question_type: string;
      submitted_answer: string;
      correct_answer: string;
      is_correct: boolean;
      points: number;
    }>;
  } | null>(null);

  // Time formatter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe Auto-Submit logic
  const handleAutoSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const currentAnswers = answersRef.current;
      const currentAttemptId = attemptIdRef.current;

      if (!currentAttemptId) {
        setError("Attempt reference not active. Unable to trigger auto-submit.");
        return;
      }

      // Map state Record to server-appropriate array
      const answerPayload = Object.keys(currentAnswers).map(qIdStr => {
        const qId = parseInt(qIdStr);
        return {
          questionId: qId,
          answer: currentAnswers[qId] || ""
        };
      });

      const res = await submitStudentExamAnswers(currentAttemptId, answerPayload);
      if (res.success) {
        setResult({
          score: res.percentage,
          passed: res.passed,
          earnedPoints: res.earnedPoints,
          totalPoints: res.totalPoints,
          questions: res.questions || []
        });
        setStep('post');
      } else {
        setError(res.message || 'An error occurred during server-side score calculation.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection lost during automatic submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (step !== 'active' || timeLeft === null) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev > 0) {
          return prev - 1;
        } else {
          clearInterval(intervalId);
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step, timeLeft]);

  // Handle Start Exam Session
  const handleStartExam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await startStudentExam(courseId, exam.id!, completedLessons);
      if (res.success && res.attemptId) {
        setAttemptId(res.attemptId);
        setQuestions(res.questions || []);
        // Initialize answer state map
        const initialAnswers: Record<number, string> = {};
        (res.questions || []).forEach(q => {
          initialAnswers[q.id!] = '';
        });
        setAnswers(initialAnswers);
        
        // Setup initial countdown timer seconds
        const examMinutes = res.exam?.duration_minutes || exam.duration_minutes || 30;
        setTimeLeft(examMinutes * 60);
        
        setStep('active');
      } else {
        setError(res.message || 'Failed to initialize a secure exam attempt node.');
      }
    } catch (err: any) {
      setError(err?.message || 'Server connection lost. Unable to authenticate and lock attempt.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId: number, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  // Handle Submission with verification checks
  const handleSubmitAttempt = async () => {
    // Audit completeness
    const unansweredCount = questions.filter(q => !answers[q.id!]).length;
    if (unansweredCount > 0) {
      if (!window.confirm(`Audit Log Alert: You have ${unansweredCount} unanswered questions remaining. Are you sure you wish to submit the current responses?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Map state Record to server-appropriate array
      const answerPayload = Object.keys(answers).map(qIdStr => {
        const qId = parseInt(qIdStr);
        return {
          questionId: qId,
          answer: answers[qId] || ""
        };
      });

      const res = await submitStudentExamAnswers(attemptId!, answerPayload);
      if (res.success) {
        setResult({
          score: res.percentage,
          passed: res.passed,
          earnedPoints: res.earnedPoints,
          totalPoints: res.totalPoints,
          questions: res.questions || []
        });
        setStep('post');
      } else {
        setError(res.message || 'An error occurred during server-side score calculation.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection lost. Grade calculation aborted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-55 border border-gray-200 rounded-xl p-6 md:p-8 space-y-6" id="student-exam-taking-suite">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: PRE-EXAM OVERVIEW */}
        {step === 'pre' && (
          <motion.div 
            key="pre-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                <p className="text-xs text-gray-500">Secure University Evaluation Node</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
              <h4 className="text-xs font-bold font-mono tracking-wider text-gray-700 uppercase">Assessment Procedures & Guidelines</h4>
              
              <div className="text-xs text-gray-650 leading-relaxed space-y-3">
                <p>
                  {exam.description || "No specific guidelines provided."}
                </p>
                <ul className="list-disc pl-5 space-y-1.5 font-sans">
                  <li>This assessment utilizes a **localized database Question Bank system**.</li>
                  <li>Questions are randomly drawn upon initiation so each candidate receives a custom-ordered pool.</li>
                  <li>Correct answers are evaluated **strictly server-side** on submit.</li>
                  <li>The exam threshold requires a passing grade of **{exam.passing_score_percentage || 70}%** to pass.</li>
                  <li>This attempt pulls exactly **{exam.questions_to_display || 5} questions** from the bank.</li>
                  <li>A strict countdown time limit of **{exam.duration_minutes || 30} minutes** applies. The exam will automatically submit when time expires.</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-4 text-xs font-mono">
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-lg text-gray-650 font-semibold">
                  Passing Standard: <span className="font-bold text-indigo-600">{exam.passing_score_percentage || 70}%</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-lg text-gray-650 font-semibold">
                  Draw Volume: <span className="font-bold text-indigo-600">{exam.questions_to_display || 5} Questions</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-150 rounded-lg text-gray-650 font-semibold">
                  Allowed Duration: <span className="font-bold text-indigo-600">{exam.duration_minutes || 30} Minutes</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <BadgeAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-250 text-gray-500 hover:text-gray-800 text-xs font-semibold rounded-lg BackButton transition-colors cursor-pointer select-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Assessment</span>
              </button>

              <button
                type="button"
                onClick={handleStartExam}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 select-none animate-pulse"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Spinning up secure environment...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-white fill-current" />
                    <span>Start Secure Assessment</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: ACTIVE QUESTION SOLVER CONTAINER */}
        {step === 'active' && (
          <motion.div 
            key="active-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row border-b border-gray-150 pb-4 items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  Assessment in Session
                </span>
                <h3 className="text-md font-bold text-gray-900 mt-1">{exam.title}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {timeLeft !== null && (
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs shrink-0 select-none ${
                    timeLeft < 60 
                      ? 'bg-rose-50 border-rose-250 text-rose-700 animate-pulse' 
                      : 'bg-amber-50 border-amber-250 text-amber-700 font-bold'
                  }`}>
                    <span className={`h-2 w-2 rounded-full bg-current ${timeLeft < 60 ? 'animate-ping' : ''}`} />
                    <span>Time Remaining: {formatTime(timeLeft)}</span>
                  </div>
                )}
                <div className="text-right text-xs font-mono font-bold text-gray-400">
                  Ref: <span className="font-semibold text-gray-700">#{attemptId}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <BadgeAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6 divide-y divide-gray-100">
              {questions.map((q, qIndex) => {
                const isSelected = answers[q.id!] !== undefined && answers[q.id!] !== '';
                
                return (
                  <div key={q.id!} className={`pt-6 ${qIndex === 0 ? 'pt-0 border-t-0' : ''} space-y-4`}>
                    <div className="font-semibold text-sm text-gray-900 flex gap-2 items-start">
                      <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded text-xs shrink-0">
                        Q{qIndex + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{q.question_text}</span>
                    </div>

                    {/* MCQs and True-False options picker */}
                    {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') ? (
                      <div className="grid grid-cols-1 gap-2.5 max-w-2xl pl-1">
                        {(q.options || []).map((opt, oIdx) => {
                          const isOptionChecked = answers[q.id!] === opt;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(q.id!, opt)}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center gap-3 cursor-pointer ${
                                isOptionChecked 
                                ? 'bg-indigo-50/50 border-indigo-500 text-indigo-950 font-medium' 
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isOptionChecked ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'
                              }`}>
                                {isOptionChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Short answer textual input field
                      <div className="max-w-xl pl-1">
                        <label className="block text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider mb-1">
                          Provide Written Candidate Response
                        </label>
                        <input
                          type="text"
                          value={answers[q.id!] || ''}
                          onChange={(e) => handleSelectOption(q.id!, e.target.value)}
                          placeholder="Type your brief definitive answer here..."
                          className="w-full text-xs border border-gray-250 bg-white p-2.5 rounded-lg focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-gray-150 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">
                {questions.filter(q => answers[q.id!]).length} of {questions.length} questions answered
              </span>

              <button
                type="button"
                onClick={handleSubmitAttempt}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer select-none disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Grading Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Grade Assessment</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: POST-EXAM SCORED REVIEW CONSOLE */}
        {step === 'post' && result && (
          <motion.div 
            key="post-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={`p-6 border rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
              result.passed 
              ? 'bg-emerald-50/70 border-emerald-250 text-emerald-950' 
              : 'bg-red-50/70 border-red-250 text-red-950'
            }`}>
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl border ${result.passed ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
                  {result.passed ? <Award className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {result.passed ? 'PASSED with Honors' : 'Assessment Unsatisfactory'}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-md mt-0.5">
                    {result.passed 
                     ? `Congratulations! You scored ${result.score}% which meets the ${exam.passing_score_percentage || 70}% passing requirements. This record is sealed on Mountech Academy servers.`
                     : `You completed with an overall score of ${result.score}%. An eighty-percent standard or higher is required. Please check your incorrect items below, restudy the materials, and attempt again.`
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white/80 border border-gray-200/50 p-4 rounded-xl min-w-[120px] text-center shrink-0">
                <span className="text-[9px] font-bold font-mono text-gray-400 block uppercase">Institution Score</span>
                <span className={`text-3xl font-black ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.score}%
                </span>
                <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                  ({result.earnedPoints}/{result.totalPoints} pts)
                </span>
              </div>
            </div>

            {/* SECURE SUBMISSIONS FEEDBACK CONTAINER */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-500">Secure Submission breakdown</h4>
              
              <div className="space-y-4 divide-y divide-gray-100 bg-white border border-gray-150 p-5 rounded-xl">
                {result.questions.map((item, idx) => (
                  <div key={item.id} className={`pt-4 ${idx === 0 ? 'pt-0 border-t-0' : ''} space-y-2`}>
                    <div className="flex items-start gap-2 text-xs leading-normal font-sans">
                      <div className="mt-0.5 shrink-0">
                        {item.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-950 block">Question {idx + 1}: {item.question_text}</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-[11px] font-mono">
                          <div className={`p-2 rounded-md ${item.is_correct ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-red-50/50 text-red-950 border border-red-100'}`}>
                            Your Response: <span className="font-bold">{item.submitted_answer || <span className="italic text-gray-400">[unanswered]</span>}</span>
                          </div>

                          <div className="p-2 bg-slate-50 border border-slate-150 rounded-md text-gray-700">
                            Correct Answer Key: <span className="font-bold text-slate-900">{item.correct_answer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onClose(result)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer select-none"
              >
                <span>Done Reviewing Results</span>
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
