import React, { useState, useEffect } from 'react';
import { Course, User, LiveSession, InstructorProfile, Lesson } from '../types';
import { 
  ArrowLeft, Clock, BookOpen, Star, CheckCircle, HelpCircle, 
  Award, Play, ChevronRight, Terminal, Sparkles, AlertCircle, AlertTriangle, 
  Video, Code, FileText, Check, Globe, Shield, ShieldCheck, CreditCard, 
  Send, Users, MessageSquare, ChevronLeft, Tv2, Smartphone,
  Lock, Unlock, Trophy, RefreshCw, Radio, Pin, Download, Plus, Trash2, Copy, Bookmark, CheckCircle2, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getToken, getCourseRatings, submitCourseRating, ReviewRating, fetchLiveSessions, joinLiveSessionRequest, fetchInstructors, fetchStudentExams, checkoutManual, fetchCourseLessons } from '../api';
import InstructorCard from '../components/InstructorCard';
import { StudentExamTaker } from '../components/StudentExamTaker';
import { PythonSandbox } from '../components/PythonSandbox';
import { InteractiveLiveClassroom } from '../components/InteractiveLiveClassroom';
import { EXAM_DATABASE, ExamQuestion } from '../exams';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CourseDetailProps {
  course: Course;
  user: User;
  onBack: () => void;
  isEnrolled: boolean;
  onEnroll: (courseId: string) => void;
  isCompleted?: boolean;
  onComplete?: (courseId: string) => void;
  syncStatus?: { sheetsSynced: boolean; message?: string } | null;
  rawEnrollments?: any[];
  onRefreshEnrollments?: () => Promise<void>;
}

// Map of custom course slides to give context-aware simulation to the online lecture theater
const courseSlidesMap: Record<string, Array<{ t: string; d: string; code: string }>> = {
  'chatgpt-prompt-engineering': [
    { 
      t: "Principles of Clear & Specific Prompts", 
      d: "Always supply clear context and define explicit output schemas. Never confuse direct instructions with verbose requests; use delimiters to separate instructions from variables.", 
      code: "system_instruction = \"You are an API formatting assistant.\"\nprompt = \"Format the text inside <data> tags into valid clean JSON.\"" 
    },
    { 
      t: "Iterative Prompt Prototyping Lifecycle", 
      d: "Prompt creation is highly iterative. Write a prototype, test outputs, analyze discrepancies, and refine prompt constraints using temperature boundaries (e.g. 0.0 for deterministic classification).", 
      code: "response = client.models.generate_content(\n    model='gemini-2.5-flash',\n    contents=prompt,\n    config=GenerateContentConfig(temperature=0.0)\n)" 
    },
    { 
      t: "Few-Shot Classification Methods", 
      d: "Seed semantic model memories by feeding a series of input-output exemplars. This teaches the transformer desired weights and context rules instantly.", 
      code: "few_shot_prompt = \"\"\"\nTweet: 'I love this compiler!' -> Sentiment: Positive\nTweet: 'This vector index crashes.' -> Sentiment: Negative\nTweet: 'Code is okay.' -> Sentiment: Neutral\n\"\"\"" 
    }
  ],
  'ai-agentic-design-patterns': [
    { 
      t: "Multi-Agent Conversation Paradigms", 
      d: "Decouple a monolithic task into smaller routines operated by specialized, cooperative AI agent personas. Each agent possesses private prompt instructions, tools, and sandboxes.", 
      code: "assistant = AssistantAgent(name=\"coder\", llm_config=llm_config)\nuser_proxy = UserProxyAgent(name=\"runner\", code_execution_config=True)" 
    },
    { 
      t: "Autonomous Debugging Chains", 
      d: "Enable agents to collaborate securely. If Coder output fails compilation, Executor agent captures stderr and pipes back to Coder to self-correct code autonomously.", 
      code: "init_chat = user_proxy.initiate_chat(\n    assistant, \n    message=\"\"\"Write a Python script to fetch stock prices and save to spreadsheet.\"\"\"\n)" 
    },
    { 
      t: "Human-in-the-Loop Safeguards", 
      d: "Implement dynamic execution pauses when agents perform high-risk write tasks. The loop intercepts scripts, alerts the student console, and awaits physical approval keys.", 
      code: "def confirm_action_middleware(action_payload):\n    # Pause loop, print payload, wait for physical input\n    return user_proxy.confirm_with_student(action_payload)" 
    }
  ],
  'deep-learning-specialization': [
    { 
      t: "Mathematical Foundations of Artificial Neurones", 
      d: "A neural node takes inputs X, multiplies by weight matrix W, adds a bias b, and runs through a non-linear activation metric σ (e.g. ReLU or Sigmoid) to map weights.", 
      code: "Z = np.dot(W, X) + b\nA = 1 / (1 + np.exp(-Z)) # Sigmoid activation" 
    },
    { 
      t: "Backpropagation via Gradient Descent", 
      d: "Map error rates backwards through hidden layer dimensions using Matrix Calculus. Adjust W and b in opposition to gradient dimensions multiplied by learning rate α.", 
      code: "dZ2 = A2 - Y\ndW2 = (1 / m) * np.dot(dZ2, A1.T)\ndb2 = (1 / m) * np.sum(dZ2, axis=1, keepdims=True)\nW2 = W2 - learning_rate * dW2" 
    },
    { 
      t: "Self-Attention Mechanism & Transformers", 
      d: "Eliminate sequential bottlenecks of RNN loops. The self-attention blueprint computes correlations between Query (Q), Key (K), and Value (V) word vectors in parallel.", 
      code: "def self_attention(Q, K, V):\n    scores = np.dot(Q, K.T) / np.sqrt(d_k)\n    weights = softmax(scores)\n    return np.dot(weights, V)" 
    }
  ]
};

// Fallback slides for other courses
const genericSlides = [
  {
    t: "Foundational Lecture Overview",
    d: "In this online lecture, we cover the core architectural pathways, file configurations, and container-level dependencies necessary to construct production grade pipelines.",
    code: "import mountech.core as mnc\nprint(\"System ready. Syncing learning records...\")"
  },
  {
    t: "Implementation Best Practices",
    d: "Deploying enterprise models requires strict input sanitization, API key hidden environment variables, and localized database or vector caching loops.",
    code: "api_key = os.getenv(\"GEMINI_API_KEY\")\nif not api_key:\n    raise SystemError(\"Secure secret variable missing!\")"
  }
];

// Phase 3: Smart Button with dynamic live countdown
export function LiveSessionButton({ session }: { session: LiveSession }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkTime = () => {
      const now = Date.now();
      const start = new Date(session.start_time).getTime();
      const end = new Date(session.end_time).getTime();
      const unlockTime = start - 5 * 60 * 1000; // Unlocked 5 minutes early

      if (now > end) {
        setTimeLeft('Meeting ended');
        setIsUnlocked(false);
        return;
      }

      if (now >= unlockTime) {
        setIsUnlocked(true);
        setTimeLeft('Join Class Now');
      } else {
        setIsUnlocked(false);
        const diffMs = unlockTime - now;
        const totalSecs = Math.floor(diffMs / 1000);
        
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        let parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
        parts.push(`${secs}s`);

        setTimeLeft(`Unlocks in ${parts.join(' ')}`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleJoin = async () => {
    if (!isUnlocked || joining) return;
    setJoining(false); // Clear lock
    setJoining(true);
    setError('');

    try {
      const res = await joinLiveSessionRequest(session.id);
      if (res.success && res.meetUrl) {
        window.open(res.meetUrl, '_blank');
      } else {
        setError('Unable to fetch Google Meet link.');
      }
    } catch (err: any) {
      setError(err?.message || 'Access denied or meeting closed.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch sm:items-end">
      <button
        type="button"
        onClick={handleJoin}
        disabled={!isUnlocked || joining}
        className={`px-4 py-2 font-mono text-[11px] font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 select-none shadow-3xs ${
          isUnlocked
            ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 animate-pulse'
            : 'bg-gray-100 hover:bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Video className="w-3.5 h-3.5 shrink-0" />
        {joining ? 'Connecting...' : timeLeft}
      </button>
      {error && (
        <span className="text-[10px] text-red-500 font-mono font-medium max-w-[200px] text-right mt-1.5 leading-snug">
          {error}
        </span>
      )}
    </div>
  );
}

export default function CourseDetail({ course, user, onBack, isEnrolled, onEnroll, isCompleted = false, onComplete, syncStatus, rawEnrollments = [], onRefreshEnrollments }: CourseDetailProps) {
  const hasEnrolledAccess = isEnrolled || (user && user.role === 'admin');

  // Course Sunset & Certificate Confirmation states
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmDownloadedAt, setConfirmDownloadedAt] = useState<string>('');
  const [downloadingCert, setDownloadingCert] = useState<boolean>(false);
  const [activeLiveRoomSession, setActiveLiveRoomSession] = useState<LiveSession | null>(null);

  // Find enrollment metadata for current course
  const currentEnrollment = rawEnrollments.find(e => e.courseId === course.id);
  const certDownloadedAt = currentEnrollment?.certificate_downloaded_at;

  const getRemainingDays = () => {
    if (!certDownloadedAt) return null;
    const downloadedAt = new Date(certDownloadedAt);
    const now = new Date();
    const diffTime = now.getTime() - downloadedAt.getTime();
    const diffDays = 15 - diffTime / (1000 * 60 * 60 * 24);
    return diffDays;
  };

  const remainingDays = getRemainingDays();
  const isStaff = user?.role === 'admin' || user?.role === 'instructor';
  const isExpired = remainingDays !== null && remainingDays <= 0 && !isStaff;

  const handleDownloadCertificate = async (confirm: boolean = false) => {
    setDownloadingCert(true);
    const token = getToken();

    try {
      if (!token) {
        alert("Verification failure: Please sign in again.");
        return;
      }

      let downloadUrl = `/api/courses/${course.id}/certificate?token=${encodeURIComponent(token)}`;
      if (confirm) {
        downloadUrl += `&confirm=true`;
      }
      
      const response = await fetch(downloadUrl);
      if (response.status === 409) {
        const data = await response.json();
        setConfirmDownloadedAt(data.downloadedAt);
        setShowConfirmModal(true);
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        alert(`Error: ${text || response.statusText}`);
        return;
      }

      // Blob conversion and trigger native download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${course.id}_mountech_certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // Refresh enrollments to start/update sunset countdown banner!
      if (onRefreshEnrollments) {
        await onRefreshEnrollments();
      }
    } catch (e) {
      console.error("Certificate download error:", e);
      alert("Failed to secure PDF payload. Contact administrator.");
    } finally {
      setDownloadingCert(false);
    }
  };

  // Database Ratings States
  const [ratings, setRatings] = useState<ReviewRating[]>([]);
  const [averageRating, setAverageRating] = useState<number>(course.rating);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Instructor Profiles States
  const [instructorsList, setInstructorsList] = useState<InstructorProfile[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  // Live Sessions States
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [userRating, setUserRating] = useState<number>(5);
  const [userHoverRating, setUserHoverRating] = useState<number | null>(null);
  const [userReview, setUserReview] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadRatings = async () => {
    setLoadingRatings(true);
    try {
      const res = await getCourseRatings(course.id);
      setRatings(res.ratings || []);
      if (res.count > 0) {
        setAverageRating(res.average);
        setRatingCount(res.count);
      } else {
        setAverageRating(course.rating);
        setRatingCount(0);
      }
      
      // If current logged-in user already rated, we pre-populate the rating form
      if (user?.email) {
        const myRating = res.ratings?.find((r: any) => r.email.toLowerCase() === user.email.toLowerCase());
        if (myRating) {
          setUserRating(myRating.rating);
          setUserReview(myRating.review);
        }
      }
    } catch (err) {
      console.error("Failed to load course ratings from DB:", err);
    } finally {
      setLoadingRatings(false);
    }
  };

  const loadInstructors = async () => {
    setLoadingInstructors(true);
    try {
      const res = await fetchInstructors();
      if (res && res.success) {
        setInstructorsList(res.profiles || []);
      }
    } catch (err) {
      console.warn("Failed to retrieve dynamic instructor profiles:", err);
    } finally {
      setLoadingInstructors(false);
    }
  };

  // SQLite Student Exams custom state loaders
  const [dbStudentExams, setDbStudentExams] = useState<any[]>([]);
  const [loadingDbStudentExams, setLoadingDbStudentExams] = useState<boolean>(false);
  const [activeDbExam, setActiveDbExam] = useState<any | null>(null);

  const [dbLessons, setDbLessons] = useState<Lesson[]>([]);
  const [loadingDbLessons, setLoadingDbLessons] = useState<boolean>(false);

  const loadDbLessons = async () => {
    if (!hasEnrolledAccess) return;
    setLoadingDbLessons(true);
    try {
      const res = await fetchCourseLessons(course.id);
      if (res.success) {
        setDbLessons(res.lessons || []);
      }
    } catch (err) {
      console.error("Failed to load student lessons list:", err);
    } finally {
      setLoadingDbLessons(false);
    }
  };

  const loadDbStudentExams = async () => {
    if (!hasEnrolledAccess) return;
    setLoadingDbStudentExams(true);
    try {
      const res = await fetchStudentExams(course.id);
      if (res.success) {
        setDbStudentExams(res.exams || []);
      }
    } catch (err) {
      console.error("Failed to load student exams list:", err);
    } finally {
      setLoadingDbStudentExams(false);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchLiveSessions(course.id);
      if (res.success) {
        setLiveSessions(res.sessions || []);
      }
    } catch (err) {
      console.warn("Failed to load live sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadRatings();
    loadInstructors();
    if (hasEnrolledAccess) {
      loadSessions();
      loadDbStudentExams();
      loadDbLessons();
    }
    // Reset submission feedback states on course switch
    setSubmitSuccess('');
    setSubmitError('');
  }, [course.id, user?.email, hasEnrolledAccess]);

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmittingRating(true);

    try {
      const res = await submitCourseRating(course.id, userRating, userReview);
      if (res.success) {
        setSubmitSuccess(res.message);
        await loadRatings();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Page states
  const [classroomMode, setClassroomMode] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);

  // Lesson progress tracking state (persisted per course & scholar)
  const [completedLessons, setCompletedLessons] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`mountech_completed_lessons_${user?.email || 'guest'}_${course.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Multiple Choice Exam states
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(`mountech_exam_answers_${user?.email || 'guest'}_${course.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [examSubmitted, setExamSubmitted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`mountech_exam_submitted_${user?.email || 'guest'}_${course.id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [currentScore, setCurrentScore] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`mountech_exam_score_${user?.email || 'guest'}_${course.id}`);
      return saved ? parseInt(saved) : null;
    } catch {
      return null;
    }
  });

  const [examPassed, setExamPassed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`mountech_exam_passed_${user?.email || 'guest'}_${course.id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const hasExamsDesigned = dbStudentExams.length > 0;
  const dbFinalExams = dbStudentExams.filter(e => e.exam_type === 'final');
  const hasDbFinalExams = dbFinalExams.length > 0;
  const dbFinalPassed = hasDbFinalExams && dbFinalExams.every(exam => exam.passed || (exam.bestAttempt && exam.bestAttempt.passed === 1));
  const isExamRequirementPassed = hasExamsDesigned ? dbFinalPassed : examPassed;
  const hasPassedFinalExam = isExamRequirementPassed;

  // Helper helper to flag lesson as finished
  const markLessonCompleted = (idx: number) => {
    if (!completedLessons.includes(idx)) {
      const updated = [...completedLessons, idx];
      setCompletedLessons(updated);
      localStorage.setItem(`mountech_completed_lessons_${user?.email || 'guest'}_${course.id}`, JSON.stringify(updated));
    }
  };

  const handleToggleLesson = (idx: number) => {
    let updated: number[];
    if (completedLessons.includes(idx)) {
      updated = completedLessons.filter(i => i !== idx);
    } else {
      updated = [...completedLessons, idx];
    }
    setCompletedLessons(updated);
    localStorage.setItem(`mountech_completed_lessons_${user?.email || 'guest'}_${course.id}`, JSON.stringify(updated));
  };

  const examQuestions = EXAM_DATABASE[course.id] || [];
  const completionPercentage = course.syllabus.length > 0 
    ? Math.round((completedLessons.length / course.syllabus.length) * 100) 
    : 0;

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (examSubmitted) return; // Locked on submission
    const updated = { ...examAnswers, [questionId]: optionIndex };
    setExamAnswers(updated);
    localStorage.setItem(`mountech_exam_answers_${user?.email || 'guest'}_${course.id}`, JSON.stringify(updated));
  };

  const handleSubmitExam = () => {
    if (examQuestions.length === 0) return;

    if (Object.keys(examAnswers).length < examQuestions.length) {
      alert(`Completeness Check: Please provide an answer for all ${examQuestions.length} questions before scoring.`);
      return;
    }

    let correctCount = 0;
    examQuestions.forEach((q) => {
      if (examAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / examQuestions.length) * 100);
    const passed = score >= 80;

    setCurrentScore(score);
    setExamSubmitted(true);
    setExamPassed(passed);

    localStorage.setItem(`mountech_exam_submitted_${user?.email || 'guest'}_${course.id}`, 'true');
    localStorage.setItem(`mountech_exam_score_${user?.email || 'guest'}_${course.id}`, score.toString());
    localStorage.setItem(`mountech_exam_passed_${user?.email || 'guest'}_${course.id}`, passed ? 'true' : 'false');
  };

  const handleResetExam = () => {
    setExamAnswers({});
    setExamSubmitted(false);
    setCurrentScore(null);
    setExamPassed(false);

    localStorage.removeItem(`mountech_exam_answers_${user?.email || 'guest'}_${course.id}`);
    localStorage.removeItem(`mountech_exam_submitted_${user?.email || 'guest'}_${course.id}`);
    localStorage.removeItem(`mountech_exam_score_${user?.email || 'guest'}_${course.id}`);
    localStorage.removeItem(`mountech_exam_passed_${user?.email || 'guest'}_${course.id}`);
  };
  
  // Custom states to deliver high-fidelity "Lectures"
  const [classroomTab, setClassroomTab] = useState<'lecture' | 'sandbox'>('lecture');
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Payment gateway checkout states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [payError, setPayError] = useState('');
  const [payStep, setPayStep] = useState<'form' | 'secure' | 'otp' | 'success' | 'pending_verification'>('form');
  const [paymentProcessLoading, setPaymentProcessLoading] = useState(false);

  // Nepalese Gateways States
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'esewa' | 'khalti' | 'manual_bank'>('card');
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [esewaID, setEsewaID] = useState('');
  const [esewaPassword, setEsewaPassword] = useState('');
  const [khaltiNumber, setKhaltiNumber] = useState('');
  const [khaltiPIN, setKhaltiPIN] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [smsNotification, setSmsNotification] = useState('');

  // Terminal state for sandbox play
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '[System Info] Live Jypiter environment listening...',
    '>>> Ready to evaluate prompt arrays.'
  ]);
  const [runLoading, setRunLoading] = useState(false);

  // Interactive Online Q&A Desk State
  const [lectureQuestions, setLectureQuestions] = useState<Array<{ id: number; sender: string; text: string; answer?: string; isApproved?: boolean }>>([
    { 
      id: 1, 
      sender: 'Marcus Chen (AI Practitioner)', 
      text: 'Do these design patterns apply to smaller models like Llama-3-8B?', 
      answer: 'Instructor: Excellent question. Yes! But expect lower reasoning thresholds, meaning few-shot templates must be significantly more explicit to prevent prompt drift.'
    },
    { 
      id: 2, 
      sender: 'Elena Rostova (DevOps Engineer)', 
      text: 'Are slides and mathematical formulas available offline?', 
      answer: 'Instructor: Yes, all formulas and PDF companions can be downloaded directly from the resources hub on the left.'
    }
  ]);
  const [myQuestion, setMyQuestion] = useState('');
  const [qaSubmitting, setQaSubmitting] = useState(false);

  // Downloadable Lecture Study Summary States
  const [lectureSideTab, setLectureSideTab] = useState<'chat' | 'summary'>('chat');
  const [pinnedQAs, setPinnedQAs] = useState<{ id: number; question: string; answer: string; author: string }[]>([
    {
      id: 1,
      question: "What does JAX compiles numerical grids mean?",
      answer: "JAX compiles standard Python + NumPy code into highly optimized XLA machine code that can target GPUs and TPUs for rapid parallel processing.",
      author: "Dr. Evelyn Carter"
    },
    {
      id: 2,
      question: "Is pyodide actually running Python locally?",
      answer: "Yes! Pyodide loads the fully operational Python interpreter inside WebAssembly, ensuring assertions and evaluations happen directly inside your secure browser sandbox.",
      author: "System"
    }
  ]);

  const [sharedSnippets, setSharedSnippets] = useState<{ id: number; title: string; code: string; language: string; description: string }[]>([
    {
      id: 1,
      title: "JAX Simple Analytical Gradient",
      code: `import jax.numpy as jnp\nfrom jax import grad\n\ndef f(x):\n    return jnp.sin(x) / x\n\ngrad_f = grad(f)\nprint("Gradient at x=1.0:", grad_f(1.0))`,
      language: "python",
      description: "Mathematical representation of a target derivative in standard python format, reviewed by JAX compiles."
    }
  ]);

  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);
  
  // For manual Q&A input form
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');
  const [showAddQAForm, setShowAddQAForm] = useState<boolean>(false);

  // Handlers for pinned study notes
  const handlePinLectureQuestion = (q: { id: number; sender: string; text: string; answer?: string }) => {
    if (pinnedQAs.some(p => p.question === q.text)) {
      setSummaryNotice("This question has already been pinned to your Lecture Summary!");
      setTimeout(() => setSummaryNotice(null), 3500);
      return;
    }
    
    setPinnedQAs(prev => [
      ...prev,
      {
        id: Date.now(),
        question: q.text,
        answer: q.answer || "Discussed and verified live during group discussion.",
        author: q.sender
      }
    ]);
    
    setSummaryNotice("Question pinned to Lecture Study Summary!");
    setTimeout(() => setSummaryNotice(null), 3500);
    setLectureSideTab('summary');
  };

  const handleAddNewQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setPinnedQAs(prev => [
      ...prev,
      {
        id: Date.now(),
        question: newQuestion.trim(),
        answer: newAnswer.trim() || "Discussed in depth during lecture.",
        author: user?.name || "Self Notes"
      }
    ]);

    setNewQuestion('');
    setNewAnswer('');
    setShowAddQAForm(false);
    setSummaryNotice("Custom Q&A entry added to Study Summary!");
    setTimeout(() => setSummaryNotice(null), 3500);
  };

  const handleRemoveQA = (id: number) => {
    setPinnedQAs(prev => prev.filter(q => q.id !== id));
  };

  const handleSaveSnippetToSummary = (code: string, title?: string) => {
    if (!code.trim()) return;
    
    if (sharedSnippets.some(s => s.code === code)) {
      setSummaryNotice("This exact code block is already in your summary notes!");
      setTimeout(() => setSummaryNotice(null), 3500);
      return;
    }

    setSharedSnippets(prev => [
      ...prev,
      {
        id: Date.now(),
        title: title || "Interactive Sandbox Implementation Draft",
        code: code,
        language: "python",
        description: "Custom Python algorithm snippet written during slide presentations"
      }
    ]);

    setSummaryNotice("Saved editor code snippet directly to Lecture Summary!");
    setTimeout(() => setSummaryNotice(null), 3550);
  };

  const handleDownloadSummary = () => {
    const timestampStr = new Date().toLocaleString();
    let md = `# Live Lecture Study Summary: ${course.title}\n\n`;
    md += `| Metadata Field | Value |\n`;
    md += `| --- | --- |\n`;
    md += `| **Session Topic** | ${course.title} |\n`;
    md += `| **Date** | ${new Date().toLocaleDateString()} |\n`;
    md += `| **Downloaded At** | ${timestampStr} |\n`;
    md += `| **Student Name** | ${user?.name || 'Academic Scholar'} (${user?.email}) |\n`;
    md += `| **Academic Course ID** | ${course.id} |\n\n`;
    md += `--- \n\n`;
    
    md += `## 💡 Pinned Q&A\n\n`;
    if (pinnedQAs.length === 0) {
      md += `*No QA elements pinned during this live stream.*\n\n`;
    } else {
      pinnedQAs.forEach((item, index) => {
        md += `### Q${index + 1}: ${item.question}\n`;
        md += `**Answer:** ${item.answer}\n`;
        md += `*Pinned by:* ${item.author}\n\n`;
      });
    }

    md += `---\n\n`;
    md += `## 💻 Shared Code Snippets\n\n`;
    if (sharedSnippets.length === 0) {
      md += `*No core snippets shared during this session.*\n\n`;
    } else {
      sharedSnippets.forEach((item, index) => {
        md += `### Snippet ${index + 1}: ${item.title}\n`;
        if (item.description) {
          md += `*Overview:* ${item.description}\n\n`;
        }
        md += `\`\`\`${item.language || 'python'}\n${item.code}\n\`\`\`\n\n`;
      });
    }

    md += `---\n\n## 📝 Study Review Checklist\n\n`;
    md += `- [ ] Test the shared recursive algorithms and Whitespace Tokenizer locally\n`;
    md += `- [ ] Read through the execution assert statements\n`;
    md += `- [ ] Solve any follow-up challenges in the main course console\n\n`;
    md += `*Study sheet compiled automatically by Mountech Academy Live Workspace Synthesizer.*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedTitle = course.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("download", `lecture_summary_${sanitizedTitle}_course_${course.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic slide customization states for instructors and testing scholars
  const [customCourseSlides, setCustomCourseSlides] = useState<Record<string, Array<{ t: string; d: string; code: string }>>>(() => {
    try {
      const saved = localStorage.getItem(`mountech_custom_slides_${user?.email || 'guest'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showSlideStudio, setShowSlideStudio] = useState<boolean>(false);
  const [slideInputText, setSlideInputText] = useState<string>('');
  const [slideFormat, setSlideFormat] = useState<'markdown' | 'json'>('markdown');
  const [slideStudioError, setSlideStudioError] = useState<string | null>(null);
  const [slideStudioSuccess, setSlideStudioSuccess] = useState<string | null>(null);

  const parseMarkdownToSlides = (mdText: string): Array<{ t: string; d: string; code: string }> => {
    let blocks: string[] = [];
    // Normalize line endings
    const normalizedText = mdText.replace(/\r\n/g, '\n');
    
    if (normalizedText.includes('\n---')) {
      blocks = normalizedText.split(/\n---\s*\n/);
    } else if (normalizedText.includes('## ')) {
      const parts = normalizedText.split(/\n(?=##\s)/);
      blocks = parts.map(p => p.trim()).filter(Boolean);
    } else {
      blocks = [normalizedText];
    }

    const slidesList: Array<{ t: string; d: string; code: string }> = [];

    for (let block of blocks) {
      block = block.trim();
      if (!block) continue;

      const titleMatch = block.match(/^(?:#+\s*)(.*)$/m);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled Slide";

      const codeMatch = block.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : "";

      let description = block;
      if (titleMatch) {
        description = description.replace(titleMatch[0], "");
      }
      if (codeMatch) {
        description = description.replace(codeMatch[0], "");
      }

      description = description
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^\s*[\r\n]/gm, "")
        .trim();

      slidesList.push({
        t: title,
        d: description || "No further details provided for this slide segment.",
        code: code
      });
    }

    return slidesList;
  };

  const handleApplyCustomSlides = (textToParse: string, format: 'markdown' | 'json') => {
    setSlideStudioError(null);
    setSlideStudioSuccess(null);
    
    if (!textToParse.trim()) {
      setSlideStudioError("Please provide slide content first!");
      return;
    }

    try {
      let parsedList: Array<{ t: string; d: string; code: string }> = [];

      if (format === 'json') {
        const obj = JSON.parse(textToParse);
        if (!Array.isArray(obj)) {
          throw new Error("JSON must be an array of slide objects: [ { t, d, code } ]");
        }
        for (let idx = 0; idx < obj.length; idx++) {
          const s = obj[idx];
          if (!s.t) {
            throw new Error(`Slide at index ${idx} is missing a title ("t" property)`);
          }
          parsedList.push({
            t: String(s.t),
            d: String(s.d || ""),
            code: String(s.code || "")
          });
        }
      } else {
        parsedList = parseMarkdownToSlides(textToParse);
      }

      if (parsedList.length === 0) {
        throw new Error("Could not extract any valid slides from the input text!");
      }

      const updated = {
        ...customCourseSlides,
        [course.id]: parsedList
      };

      setCustomCourseSlides(updated);
      localStorage.setItem(`mountech_custom_slides_${user?.email || 'guest'}`, JSON.stringify(updated));
      setActiveSlide(0);
      setSlideStudioSuccess(`Successfully compiled and activated ${parsedList.length} slides!`);
      
      // Auto close after brief success delay
      setTimeout(() => {
        setShowSlideStudio(false);
        setSlideStudioSuccess(null);
      }, 1500);

    } catch (err: any) {
      setSlideStudioError(err.message || "Failed to parse slides. Please verify format schema.");
    }
  };

  const handleResetCourseSlides = () => {
    const updated = { ...customCourseSlides };
    delete updated[course.id];
    setCustomCourseSlides(updated);
    localStorage.setItem(`mountech_custom_slides_${user?.email || 'guest'}`, JSON.stringify(updated));
    setActiveSlide(0);
    setSlideInputText('');
    setSlideStudioSuccess("Restored default course slide deck.");
    setTimeout(() => setSlideStudioSuccess(null), 1500);
  };

  // Fetch contextual slides for the current course (custom slide deck takes precedence)
  const slides = customCourseSlides[course.id] || courseSlidesMap[course.id] || genericSlides;

  // Formatting credit card input automatically
  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    const matches = cleaned.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(' ') : cleaned);
  };

  const handleExpiryChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  // Submit payment checkout
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setSmsNotification('');

    if (paymentMethod === 'card') {
      const rawCard = cardNumber.replace(/\s+/g, '');
      if (rawCard.length < 16) {
        setPayError('Please enter a valid 16-digit credit card number.');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        setPayError('Expiry date must match MM/YY format.');
        return;
      }
      const [month, year] = expiry.split('/').map(Number);
      if (month < 1 || month > 12) {
        setPayError('Invalid month in expiry date.');
        return;
      }
      if (cvc.length < 3) {
        setPayError('Please provide a valid 3-digit CVC code.');
        return;
      }
      if (!cardName.trim()) {
        setPayError('Cardholder name is required.');
        return;
      }
      if (!postalCode.trim()) {
        setPayError('Billing Post Code or Zip is required.');
        return;
      }

      setPaymentProcessLoading(true);
      setPayStep('secure');

      setTimeout(() => {
        setPaymentProcessLoading(false);
        setPayStep('success');

        // Finalize enrollment after approved credit transaction
        setTimeout(() => {
          onEnroll(course.id);
          setShowPaymentModal(false);
          // Clear payment state
          setCardNumber('');
          setExpiry('');
          setCvc('');
          setCardName('');
          setPostalCode('');
          setPayStep('form');
        }, 1500);
      }, 2000);
    } else if (paymentMethod === 'esewa') {
      if (!esewaID.trim()) {
        setPayError('Please enter your eSewa ID mobile number or email address.');
        return;
      }
      if (!esewaPassword.trim()) {
        setPayError('Please enter your secure eSewa Web Login Password or MPIN.');
        return;
      }

      setPaymentProcessLoading(true);
      const randomOTP = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(randomOTP);

      setTimeout(() => {
        setPaymentProcessLoading(false);
        setPayStep('otp');
        setSmsNotification(`eSewa Transaction SMS: Use OTP [ ${randomOTP} ] to authorize NPR ${(course.price * 133).toLocaleString()} payment to Mountech Academy.`);
      }, 1500);
    } else if (paymentMethod === 'khalti') {
      const isNepMobile = khaltiNumber.trim().length === 10;
      if (!isNepMobile) {
        setPayError('Please enter a valid 10-digit Nepalese mobile number for Khalti ID.');
        return;
      }
      if (khaltiPIN.length < 4) {
        setPayError('Please enter your 4-digit Khalti Transaction PIN.');
        return;
      }

      setPaymentProcessLoading(true);
      const randomOTP = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(randomOTP);

      setTimeout(() => {
        setPaymentProcessLoading(false);
        setPayStep('otp');
        setSmsNotification(`Khalti Multi-Factor Authentication: Your OTP security pin is [ ${randomOTP} ] for booking Mountech Academy.`);
      }, 1500);
    } else if (paymentMethod === 'manual_bank') {
      setPaymentProcessLoading(true);
      checkoutManual(course.id, course.title)
        .then((res: any) => {
          setPaymentProcessLoading(false);
          setBankInfo(res);
          setPayStep('pending_verification');
        })
        .catch((err: any) => {
          setPaymentProcessLoading(false);
          setPayError(err.message || 'Failed to initiate bank transfer checkout request.');
        });
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    if (enteredOtp.trim() !== otpCode) {
      setPayError('Invalid dynamic OTP code. Please enter the OTP code captured in the SMS banner above.');
      return;
    }

    setPaymentProcessLoading(true);
    setPayStep('secure');
    setSmsNotification('');

    setTimeout(() => {
      setPayStep('success');
      setTimeout(() => {
        setShowPaymentModal(false);
        setEsewaID('');
        setEsewaPassword('');
        setKhaltiNumber('');
        setKhaltiPIN('');
        setEnteredOtp('');
        setOtpCode('');
        onEnroll(course.id);
        setPayStep('form');
        setPaymentProcessLoading(false);
      }, 1500);
    }, 2000);
  };

  const handleEnrollClick = () => {
    if (course.isPaid) {
      setShowPaymentModal(true);
    } else {
      onEnroll(course.id);
    }
  };

  const handleRunCommand = (lessonTitle: string) => {
    setRunLoading(true);
    setTerminalOutput((prev) => [...prev, `\n>>> Executing automated environment checks for: "${lessonTitle}"...`]);
    
    setTimeout(() => {
      setRunLoading(false);
      setTerminalOutput((prev) => [
        ...prev,
        `[SUCCESS] Connected to OpenAI/Mountech API gateway. Checked service worker.`,
        `[INFO] Inferred sentiment scoring completed with temperature=0.1`,
        `[STATUS] Model Response: Hello, ${user.name}! Welcome to Mountech Academy Course "${course.title}". Execution complete (0.31s).`,
        `>>> Active sandbox sandbox-v2 is listening for custom prompts...`
      ]);
    }, 1000);
  };

  // Student submits question inside the online lecture chat queue
  const handleQAFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myQuestion.trim()) return;

    setQaSubmitting(true);
    const newIdx = lectureQuestions.length + 1;
    const studentQ = {
      id: newIdx,
      sender: `${user.name} (You)`,
      text: myQuestion.trim()
    };

    setLectureQuestions((prev) => [...prev, studentQ]);
    const inputSaved = myQuestion;
    setMyQuestion('');

    // Simulate real-time instructor answering in the lecture stream
    setTimeout(() => {
      setQaSubmitting(false);
      let generatedAnswer = "Instructor: Thanks for raising that. We cover this exact performance bottleneck in the next slide deck. Keep scaling!";
      
      if (inputSaved.toLowerCase().includes('database') || inputSaved.toLowerCase().includes('sheet')) {
        generatedAnswer = `Instructor: Great question, ${user.name}. We synchronize sheets asynchronously. The Google Sheets API is triggered securely server-side so keys are hidden from malicious inspect panels.`;
      } else if (inputSaved.toLowerCase().includes('paid') || inputSaved.toLowerCase().includes('payment') || inputSaved.toLowerCase().includes('stripe')) {
        generatedAnswer = `Instructor: High-grade security, indeed. All payment data is validated server-side and approved via isolated 3D-Secure tokens.`;
      } else if (inputSaved.toLowerCase().includes('lecture') || inputSaved.toLowerCase().includes('video')) {
        generatedAnswer = `Instructor: Yes, ${user.name}! Delivering online lectures gives students immediate synchronization of drawing coordinates, code nodes, and Q&A chat alongside raw streaming video content.`;
      }

      setLectureQuestions((prev) => 
        prev.map((q) => q.id === newIdx ? { ...q, answer: generatedAnswer } : q)
      );
    }, 2000);
  };

  if (activeLiveRoomSession) {
    return (
      <div id="course-detail-root" className="min-h-screen bg-[#030712] text-slate-100 font-sans p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          <InteractiveLiveClassroom
            session={activeLiveRoomSession}
            user={user}
            onBack={() => setActiveLiveRoomSession(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="course-detail-root" className="min-h-screen bg-white text-[#111827] font-sans flex flex-col justify-between">
      
      {/* Detail Header bar */}
      <header className="bg-white border-b border-[#e5e7eb] h-16 flex items-center sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex items-center justify-between">
          <button
            id="detail-back-btn"
            onClick={onBack}
            className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider font-bold text-[#4b5563] hover:text-[#0070f3] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#0070f3] bg-[#0070f3]/5 px-3 py-1 rounded-md border border-[#0070f3]/10 flex items-center gap-1.5">
              <img src={brandLogo} alt="Mountech Academy" className="w-5 h-5 rounded-md object-cover border border-gray-150" referrerPolicy="no-referrer" />
              MOUNTECH LABS : <span className="font-semibold text-emerald-600">ONLINE</span>
            </span>
          </div>
        </div>
      </header>

      {isExpired ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#f9fafb] text-center space-y-6 py-28 relative">
          <div className="p-5 bg-red-50 text-red-650 border border-red-200 rounded-3xl shadow-xs">
            <Lock className="w-12 h-12 stroke-[2.5]" />
          </div>
          <div className="max-w-md space-y-3">
            <h2 className="text-2xl font-extrabold text-[#111827] tracking-tight">Post-Completion Access Expired</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your 15-day post-completion access for <strong>{course.title}</strong> has expired. Congratulations on finishing the course!
            </p>
            <p className="text-xs text-gray-400">
              You can still generate and download your official academic completion certificate below.
            </p>
          </div>
          <div className="pt-4 border-t border-gray-200 max-w-xs w-full flex flex-col gap-3">
            <button
              onClick={() => handleDownloadCertificate()}
              disabled={downloadingCert || !hasPassedFinalExam}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Award className="w-4 h-4" />
              <span>{downloadingCert ? 'Generating Certificate...' : 'Download Official Certificate'}</span>
            </button>
            {!hasPassedFinalExam && (
              <p className="text-[10px] text-red-500 font-semibold text-center mt-1">
                🔒 Pass the Final Exam to unlock your certificate.
              </p>
            )}
            <button
              onClick={onBack}
              className="py-3 px-6 bg-white hover:bg-gray-50 border border-gray-250 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Return to Catalog
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Banner Section (Clean Slate Theme) */}
          <section id="course-detail-banner" className="bg-[#f9fafb] text-[#111827] py-12 md:py-16 border-b border-[#e5e7eb] relative overflow-hidden">
            
            {/* Countdown Sunset Banner */}
            {remainingDays !== null && (
              <div className="bg-amber-50 border border-amber-200 px-6 py-3.5 mb-8 text-amber-955 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto rounded-xl shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold block text-amber-950">
                      Course Completed!
                    </span>
                    <span className="text-amber-700">
                      You have <strong className="text-amber-950 font-black">{Math.ceil(remainingDays)}</strong> days of access remaining to review these course materials and assignments.
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  <button
                    onClick={() => handleDownloadCertificate()}
                    disabled={downloadingCert}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] uppercase font-mono tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {downloadingCert ? 'Reindexing...' : 'Refresh Certificate'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Hero Left Content (8 columns) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span id="detail-type-badge" className="text-[10px] font-mono tracking-wider text-[#0070f3] border border-[#0070f3]/25 bg-[#0070f3]/5 px-2.5 py-0.5 rounded font-bold uppercase">
                {course.type}
              </span>
              <span id="detail-topic-badge" className="text-[10px] font-mono tracking-wider text-emerald-600 border border-emerald-500/25 bg-emerald-50 px-2.5 py-0.5 rounded font-bold uppercase">
                {course.topic}
              </span>
              <span id="detail-diff-badge" className="text-[10px] font-mono tracking-wider text-slate-700 border border-slate-200 bg-slate-50 px-2.5 py-0.5 rounded font-bold uppercase">
                {course.difficulty}
              </span>
            </div>

            <h1 id="detail-course-title" className="text-3xl md:text-5xl font-sans font-extrabold text-[#111827] tracking-tight leading-tight">
              {course.title}
            </h1>

            <p id="detail-course-desc" className="text-[#4b5563] text-sm md:text-base leading-relaxed max-w-3xl">
              {course.fullDescription}
            </p>

            {/* Ratings & Metadata Row */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-mono text-gray-500">
              <div className="flex items-center gap-1" id="detail-rating">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-[#111827]">{averageRating.toFixed(1)}</span>
                <span>/ 5.0</span>
                {ratingCount > 0 ? (
                  <span className="text-blue-600 font-semibold opacity-90">({ratingCount} verified scholar {ratingCount === 1 ? 'rating' : 'ratings'})</span>
                ) : (
                  <span className="text-gray-400 font-normal opacity-80">(historic benchmark)</span>
                )}
              </div>
              <div className="h-3.5 w-px bg-gray-200" />
              <div id="detail-duration">
                <span>Duration: </span>
                <span className="text-[#111827] font-semibold">{course.duration}</span>
              </div>
              <div className="h-3.5 w-px bg-gray-200" />
              <div id="detail-lessons">
                <span>Lectures: </span>
                <span className="text-[#111827] font-semibold">{course.lessonCount}</span>
              </div>
              <div className="h-3.5 w-px bg-gray-200" />
              <div id="detail-students">
                <span className="text-[#111827] font-semibold">{course.enrolledCount} trained</span>
              </div>
            </div>

            {/* In partnership with row */}
            {course.partnerName && (
              <div id="detail-partner-row" className="flex items-center gap-2 pt-4 border-t border-gray-200 max-w-md">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">Curriculum Partner:</span>
                <span className="text-xs font-bold text-[#0070f3] tracking-widest font-mono">
                  {course.partnerName.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Hero Right Visual Column - Card Illustration with Price badge */}
          <div className="lg:col-span-4 hidden lg:flex justify-end items-center">
            <div className={`w-full max-w-[300px] aspect-video rounded-xl overflow-hidden shadow-sm relative ${course.thumbnailBg} border border-gray-200 flex flex-col items-center justify-center p-6`}>
              <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center">
                <Tv2 className="w-12 h-12 text-white/50 mb-1" />
                <span className="text-white text-xs font-mono font-bold uppercase tracking-wider bg-black/35 px-2.5 py-0.5 rounded backdrop-blur-md">
                  {course.isPaid ? 'PREMIUM ACCESS' : 'PUBLIC WORKSPACE'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 flex-grow w-full">
        
        {/* ENROLLMENT WELCOME HEADER WITH PERSONALIZED ACCOUNT MESSAGE */}
        {hasEnrolledAccess && (
          <div 
            id="personalized-welcome-banner"
            className="mb-8 p-6 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border border-blue-100 shadow-3xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[#0070f3]">
                <Shield className="w-5 h-5 text-rose-650 shrink-0" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700">
                  {isEnrolled ? "ENROLLMENT VERIFIED" : "ADMIN OVERRIDE ACTIVE"}
                </span>
                
                {isEnrolled ? (
                  syncStatus?.sheetsSynced ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-950 border border-emerald-200 font-bold px-2 py-0.5 rounded-sm font-mono uppercase tracking-tight">
                      Synced with Sheets Database 🟢
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-100 text-amber-950 border border-amber-200 font-bold px-2 py-0.5 rounded-sm font-mono uppercase tracking-tight">
                      Local Cache Only
                    </span>
                  )
                ) : (
                  <span className="text-[9px] bg-rose-105 text-rose-955 border border-rose-200 font-bold px-2 py-0.5 rounded-sm font-mono uppercase tracking-tight">
                    Administrative Bypass
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-[#111827] tracking-tight">
                {isEnrolled ? `Welcome to active files scholar, ${user.name}! 📚` : `Administrative Course Viewer: ${course.title} 🔍`}
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isEnrolled 
                  ? `Your registered learning path is synced securely with email ${user.email}. Live broadcasts and container sandboxes are activated.`
                  : "As an administrator of MountTech Academy, you have complete override clearance to view sandbox files, test syllabus chapters, and inspect premium files without enrolling."}
              </p>
            </div>
            
            <button
              id="detail-workspace-quicklaunch-btn"
              onClick={() => {
                setClassroomMode(true);
                window.scrollTo({ top: 320, behavior: 'smooth' });
                if (activeLessonIndex === null) {
                  setActiveLessonIndex(0);
                }
              }}
              className="px-4 py-2 bg-[#111827] text-white hover:bg-[#0070f3] text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Enter Lecture Classroom
            </button>
          </div>
        )}

        {/* HIGH FIDELITY LECTURE THEATER CLASSROOM MODE PANEL */}
        {classroomMode && hasEnrolledAccess ? (
          <div
            id="sandbox-classroom-panel"
            className="bg-[#0b101d] border border-gray-800 rounded-xl p-5 md:p-6 mb-10 text-white shadow-xl"
          >
            {/* Header and Tab Toggle Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0070f3]/10 border border-[#0070f3]/25 text-brand-blue flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#38bdf8] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Mountech Academic Lecture Hall</h3>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                    Course: <span className="text-blue-400 font-semibold">{course.title}</span>
                  </p>
                </div>
              </div>

              {/* Tab options button toggle */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-gray-800">
                <button
                  onClick={() => setClassroomTab('lecture')}
                  className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-wider uppercase rounded transition-all cursor-pointer ${
                    classroomTab === 'lecture'
                      ? 'bg-slate-800 text-[#38bdf8] shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📡 Live Lecture Stream
                </button>
                <button
                  onClick={() => setClassroomTab('sandbox')}
                  className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-wider uppercase rounded transition-all cursor-pointer ${
                    classroomTab === 'sandbox'
                      ? 'bg-slate-800 text-[#38bdf8] shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  💻 Code Playground Sandbox
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {isCompleted ? (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => handleDownloadCertificate()}
                      disabled={downloadingCert || !hasPassedFinalExam}
                      className="text-[11px] px-3 py-1.5 bg-blue-600 border border-blue-500 rounded-md text-white hover:bg-blue-700 font-mono font-bold flex items-center gap-1 cursor-pointer transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Award className="w-3.5 h-3.5 animate-bounce" />
                      <span>{downloadingCert ? 'Downloading...' : 'Download Cert'}</span>
                    </button>
                    {!hasPassedFinalExam && (
                      <p className="text-[9px] text-red-500 font-mono font-semibold">
                        🔒 Pass Final Exam to unlock
                      </p>
                    )}
                  </div>
                ) : isExamRequirementPassed ? (
                  <button
                    onClick={() => onComplete && onComplete(course.id)}
                    className="text-[11px] px-3 py-1.5 bg-[#10b981] border border-emerald-500 rounded-md text-white hover:bg-[#059669] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all select-none"
                  >
                    <Check className="w-3.5 h-3.5 animate-pulse" />
                    <span>Complete Course</span>
                  </button>
                ) : (
                  <button
                    disabled={true}
                    className="text-[11px] px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-gray-500 font-mono font-bold flex items-center gap-1 cursor-not-allowed select-none"
                    title="You must pass the Final Exam with at least an 80% score before completing this course."
                  >
                    <Lock className="w-3.5 h-3.5 text-gray-550 mr-0.5" />
                    <span>Exam Needed</span>
                  </button>
                )}

                <button
                  id="close-classroom-btn"
                  onClick={() => setClassroomMode(false)}
                  className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-gray-300 hover:text-white transition-all cursor-pointer font-mono font-medium"
                >
                  Close Theater
                </button>
              </div>
            </div>

            {/* TAB ONE: ONLINE LECTURE THEATER BROADCAST WITH SYNCHRONIZED PRESENTATIONS AND STUDENT CHAT */}
            {classroomTab === 'lecture' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="live-lecture-grid">
                
                {/* Visual Projector / Slide Whiteboard Deck (8 columns) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-[#121929] border border-gray-800 rounded-lg p-5 relative overflow-hidden aspect-[16/9] flex flex-col justify-between shadow-inner">
                    {showSlideStudio && (user?.role === 'instructor' || user?.role === 'admin') ? (
                      /* SLIDE STUDIO EDITOR VIEW */
                      <div className="flex-grow flex flex-col justify-between h-full space-y-2 overflow-y-auto pr-1">
                        <div className="flex justify-between items-center border-b border-gray-800 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#38bdf8]">
                              Live Slide Studio & Scribe
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSlideFormat('markdown')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono rounded font-bold transition-all cursor-pointer ${
                                slideFormat === 'markdown'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-950 text-gray-400 border border-slate-900 hover:text-white'
                              }`}
                            >
                              Markdown (.md)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSlideFormat('json')}
                              className={`px-2 py-0.5 text-[8.5px] font-mono rounded font-bold transition-all cursor-pointer ${
                                slideFormat === 'json'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-950 text-gray-400 border border-slate-900 hover:text-white'
                              }`}
                            >
                              JSON (.json)
                            </button>
                          </div>
                        </div>

                        {/* Format instructions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9.5px] leading-relaxed">
                          <div className="bg-slate-950/80 p-1.5 border border-slate-900 rounded space-y-0.5">
                            <span className="font-semibold text-indigo-400 block font-mono text-[8px] uppercase">Format Guidelines</span>
                            {slideFormat === 'markdown' ? (
                              <p className="text-gray-400">
                                Start each slide with `# Title` or `## Title`. Separate slides with <code className="text-cyan-400">---</code>. Wrap code in standard triple-backticks code blocks.
                              </p>
                            ) : (
                              <p className="text-gray-400">
                                Paste a JSON array containing objects with <code className="text-cyan-400">"t"</code> (title), <code className="text-cyan-400">"d"</code> (description), and <code className="text-cyan-400">"code"</code> keys.
                              </p>
                            )}
                          </div>

                          <div className="bg-slate-950/80 p-1.5 border border-slate-900 rounded space-y-0.5 flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-indigo-400 font-mono text-[8px] uppercase">Slide Draft Tools</span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (slideFormat === 'markdown') {
                                      setSlideInputText(
`# 1. Principles of Prompt Alignment
Supply clear context, role criteria, and specify the desired format schema. Keep models safe from leakage.
\`\`\`python
system_prompt = "Format output in clean, valid standard JSON arrays."
\`\`\`

---
# 2. Autonomous Reasoning Engines
Design cooperative loops of agents holding isolated local directories and file structures.
\`\`\`python
agent = Agent(name="Researcher", tools=[google_search])
\`\`\``
                                      );
                                    } else {
                                      setSlideInputText(
`[
  {
    "t": "1. Multi-Agent Systems",
    "d": "Isolate system objectives into separate cooperative micro-agent threads.",
    "code": "print('Multi-Agent ready')"
  }
]`
                                      );
                                    }
                                  }}
                                  className="px-1 py-0.5 bg-slate-900 hover:bg-slate-800 text-[8px] font-mono text-[#38bdf8] rounded cursor-pointer border border-slate-800"
                                >
                                  Load Sample
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSlideInputText('')}
                                  className="px-1 py-0.5 bg-slate-900 hover:bg-slate-800 text-[8px] font-mono text-gray-400 rounded cursor-pointer border border-slate-800"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <label className="text-[8px] font-mono text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline">
                              <input
                                type="file"
                                accept={slideFormat === 'markdown' ? '.md,.txt' : '.json'}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const r = new FileReader();
                                  r.onload = (evt) => {
                                    const text = evt.target?.result;
                                    if (typeof text === 'string') {
                                      setSlideInputText(text);
                                      setSlideStudioSuccess(`Loaded file "${file.name}"! Click Compile to launch.`);
                                      setTimeout(() => setSlideStudioSuccess(null), 3000);
                                    }
                                  };
                                  r.readAsText(file);
                                }}
                              />
                              <Upload className="w-2.5 h-2.5 shrink-0" />
                              <span>Import .md / .json file directly</span>
                            </label>
                          </div>
                        </div>

                        {/* Slide editor text container */}
                        <div className="flex-grow space-y-1">
                          <div className="flex justify-between items-center text-[8px] font-mono">
                            <span className="text-gray-400 uppercase font-bold">Write or Paste Slides Content</span>
                            {customCourseSlides[course.id] && (
                              <button
                                type="button"
                                onClick={handleResetCourseSlides}
                                className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                              >
                                Restore Original Slides
                              </button>
                            )}
                          </div>
                          <textarea
                            value={slideInputText}
                            onChange={(e) => setSlideInputText(e.target.value)}
                            placeholder={
                              slideFormat === 'markdown'
                                ? "# Slide 1 Title\nSlide details...\n\n```python\n# code companion\n```\n\n---\n# Slide 2 Title..."
                                : "[\n  {\n    \"t\": \"Slide 1\",\n    \"d\": \"Details...\",\n    \"code\": \"print('hello')\"\n  }\n]"
                            }
                            className="w-full h-24 bg-slate-950 border border-slate-900 rounded p-1.5 text-[9px] text-slate-100 font-mono focus:border-indigo-500 outline-none resize-none"
                          />
                        </div>

                        {/* Messages */}
                        {slideStudioError && (
                          <div className="p-1.5 bg-rose-950/40 border border-rose-500/25 rounded text-[9px] text-rose-400 font-mono flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{slideStudioError}</span>
                          </div>
                        )}
                        {slideStudioSuccess && (
                          <div className="p-1.5 bg-emerald-950/40 border border-emerald-500/25 rounded text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                            <span>{slideStudioSuccess}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 text-[9.5px] font-mono">
                          <button
                            type="button"
                            onClick={() => setShowSlideStudio(false)}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-gray-400 rounded border border-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyCustomSlides(slideInputText, slideFormat)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer transition-all"
                          >
                            Compile & Present Deck
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ORIGINAL PROJECTOR VIEW */
                      <>
                        {/* Top Watermark bar */}
                        <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse inline-block" />
                            Live Lecture Presentation Broadcast
                          </span>
                          <span>Mountech Lecture Node #00{activeSlide + 1}</span>
                        </div>

                        {/* Central Slide Context Area */}
                        <div className="my-auto py-4 space-y-4">
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-mono font-bold text-blue-400 block tracking-wider">
                              Slide Module {activeSlide + 1} of {slides.length}
                            </span>
                            <h4 className="text-lg md:text-2xl font-bold tracking-tight text-white leading-tight">
                              {slides[activeSlide]?.t}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-300 leading-relaxed max-w-2xl">
                              {slides[activeSlide]?.d}
                            </p>
                          </div>

                          {/* Code companion illustration inside presentation screen */}
                          <div className="bg-[#080d16] border border-gray-850 p-4 rounded font-mono text-[10px] md:text-xs text-emerald-400 overflow-x-auto shadow-inner select-all relative">
                            <span className="absolute top-2 right-2 text-[8px] text-gray-600 uppercase font-mono select-none">Whiteboard Code Segment</span>
                            {slides[activeSlide]?.code}
                          </div>

                          {/* Interactive Live Whiteboard SVG Node Map graph (Changes visually on Slide clicks!) */}
                          <div className="border border-gray-800 bg-[#070c17]/40 rounded-md p-3 max-h-[110px] hidden md:flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block">Live Synced Structural Diagram</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {activeSlide === 0 ? 'W_matrix values mapped against Input Tensor arrays' : 
                                 activeSlide === 1 ? 'Gradient Backpropagation derivatives tracking chain variables' : 
                                                     'Self-Attention softmax scoring correlating Q-K-V word vectors'}
                              </span>
                            </div>
                            <svg className="w-24 h-12 stroke-current text-blue-400/40" viewBox="0 0 100 50">
                              {activeSlide === 0 ? (
                                <g fill="none" strokeWidth="1.5">
                                  <circle cx="20" cy="25" r="4" className="text-blue-500" />
                                  <circle cx="50" cy="25" r="4" className="text-emerald-500" />
                                  <circle cx="80" cy="25" r="4" className="text-indigo-500" />
                                  <line x1="24" y1="25" x2="46" y2="25" strokeDasharray="2,2" />
                                  <line x1="54" y1="25" x2="76" y2="25" />
                                </g>
                              ) : activeSlide === 1 ? (
                                <g fill="none" strokeWidth="1">
                                  <path d="M 10 10 L 40 40 L 90 20" />
                                  <circle cx="40" cy="40" r="3" fill="#000" />
                                  <line x1="40" y1="40" x2="40" y2="10" strokeDasharray="3,3" />
                                </g>
                              ) : (
                                <g fill="none" strokeWidth="1.5">
                                  <circle cx="50" cy="25" r="15" className="text-rose-500" strokeDasharray="5,2" />
                                  <line x1="10" y1="10" x2="90" y2="40" />
                                  <line x1="10" y1="40" x2="90" y2="10" />
                                </g>
                              )}
                            </svg>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Widescreen presentation player slide controllers */}
                  <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono font-semibold">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>128 students active in lecture broadcast right now</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Interactive Slide Studio trigger */}
                      {(user?.role === 'instructor' || user?.role === 'admin') && (
                        <button
                          onClick={() => {
                            setShowSlideStudio(!showSlideStudio);
                            // Initialize text field if empty with current custom deck or default template
                            if (!slideInputText) {
                              if (customCourseSlides[course.id]) {
                                setSlideInputText(customCourseSlides[course.id].map(s => `# ${s.t}\n${s.d}\n\n\`\`\`python\n${s.code}\n\`\`\``).join('\n\n---\n\n'));
                                setSlideFormat('markdown');
                              } else {
                                const defaultMd = slides.map(s => `# ${s.t}\n${s.d}\n\n\`\`\`python\n${s.code}\n\`\`\``).join('\n\n---\n\n');
                                setSlideInputText(defaultMd);
                                setSlideFormat('markdown');
                              }
                            }
                          }}
                          className={`px-2 py-1 text-[10px] font-mono rounded border flex items-center gap-1 cursor-pointer transition-all ${
                            showSlideStudio
                              ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-indigo-400 hover:text-white hover:border-slate-700'
                          }`}
                          title="Upload, draft, or edit slides for this live session"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Slide Studio</span>
                          <span className="bg-amber-400 text-slate-950 font-extrabold text-[8px] px-1 rounded scale-90 select-none">INST</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                        disabled={activeSlide === 0}
                        className="p-1.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 rounded cursor-pointer text-xs"
                        title="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono font-medium tracking-widest text-[#38bdf8]">
                        {activeSlide + 1} / {slides.length}
                      </span>
                      <button
                        onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                        disabled={activeSlide === slides.length - 1}
                        className="p-1.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 rounded cursor-pointer text-xs"
                        title="Next Slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Synchronized supplementary notes widget */}
                  <div className="p-4 bg-slate-900 border border-gray-800 rounded-lg space-y-1.5 text-xs">
                    <span className="font-mono text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider block">Lecturer Audio Summary Notes 🔊</span>
                    <p className="text-gray-300 leading-relaxed italic">
                      "Make sure you understand the difference between parameter updates in standard Adam optimizer versus memory saving parameters of LoRA. The attention scoring matrix we see here maps word correlations statically before weights projection."
                    </p>
                  </div>
                </div>

                {/* Live Chat / Lecture Q&A desk (4 columns) - Highly interactive! */}
                <div className="lg:col-span-4 bg-[#121929] border border-gray-800 rounded-lg p-4 flex flex-col justify-between min-h-[420px]">
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      {/* Side Tab Bar */}
                      <div className="flex items-center justify-between border-b border-gray-850 pb-2 mb-3 gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-lg border border-gray-900">
                          <button
                            onClick={() => setLectureSideTab('chat')}
                            className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                              lectureSideTab === 'chat'
                                ? 'bg-[#0070f3] text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            💬 Q&A Desk
                          </button>
                          <button
                            onClick={() => setLectureSideTab('summary')}
                            className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded transition-all cursor-pointer flex items-center gap-1 ${
                              lectureSideTab === 'summary'
                                ? 'bg-[#0070f3] text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            📚 Study Summary
                            {pinnedQAs.length > 0 && (
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            )}
                          </button>
                        </div>
                      </div>

                      {lectureSideTab === 'chat' ? (
                        <>
                          {/* List of questions */}
                          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                            {lectureQuestions.map((q) => (
                              <div key={q.id} className="text-xs bg-slate-950 p-3 rounded border border-gray-850 space-y-2 group relative">
                                <div className="flex justify-between items-center text-[9px]">
                                  <span className="font-bold text-gray-300">{q.sender}</span>
                                  <span className="text-gray-650 font-mono">Synced</span>
                                </div>
                                <p className="text-gray-250 font-medium leading-relaxed">{q.text}</p>
                                
                                {/* Instructor's response */}
                                {q.answer ? (
                                  <div className="mt-2 pt-2 border-t border-gray-900 text-blue-300 pl-2 border-l-2 border-blue-500 text-[11px] leading-relaxed">
                                    {q.answer}
                                  </div>
                                ) : (
                                  <div className="mt-2 pt-2 border-t border-gray-900 text-[10px] text-gray-500 font-mono italic flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                    Waiting for instructor approval...
                                  </div>
                                )}

                                {/* Pin option */}
                                <div className="flex items-center justify-between pt-1 border-t border-gray-900/50 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handlePinLectureQuestion(q)}
                                    className="text-[9.5px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Pin question to Study Summary"
                                  >
                                    <Pin className="w-2.5 h-2.5 rotate-45" />
                                    <span>Pin to Summary Notes</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            {qaSubmitting && (
                              <div className="text-[10px] text-gray-500 italic font-mono flex items-center gap-1 text-center py-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-bounce delay-100" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-bounce delay-200" />
                                <span>Instructor is typing response...</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* LECTURE STUDY SUMMARY PANEL */
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                          {summaryNotice && (
                            <div className="p-2 bg-emerald-950/60 border border-emerald-500/25 rounded-lg text-center text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{summaryNotice}</span>
                            </div>
                          )}

                          {/* Companion Banner */}
                          <div className="p-3 bg-gradient-to-br from-indigo-950/20 to-slate-950 border border-indigo-950/40 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5 shadow">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-[#38bdf8] block">Automatic Study Companion</span>
                              <h4 className="text-[11px] font-bold text-slate-100">Study Summary & Compiler</h4>
                              <p className="text-[9.5px] text-gray-400 leading-snug">
                                Save lecture whiteboard codes, pin active questions, and export a beautifully compiled Study Sheet (.md) instantly!
                              </p>
                            </div>

                            <button
                              onClick={handleDownloadSummary}
                              type="button"
                              className="w-full py-1.5 bg-[#0070f3] hover:bg-blue-600 text-white font-mono font-bold text-[10px] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 tracking-wider shadow"
                            >
                              <Download className="w-3 h-3 text-white" />
                              <span>Download Summary (.md)</span>
                            </button>
                          </div>

                          {/* Pinned QA block */}
                          <div className="space-y-2 border-t border-gray-800/80 pt-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono text-indigo-400 uppercase font-black flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5 text-indigo-400 rotate-45" /> Pinned Q&A ({pinnedQAs.length})
                              </span>
                              <button
                                onClick={() => setShowAddQAForm(!showAddQAForm)}
                                className="text-[8.5px] font-mono text-[#38bdf8] hover:text-[#0ea5e9] hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Q&A Entry</span>
                              </button>
                            </div>

                            {showAddQAForm && (
                              <form onSubmit={handleAddNewQA} className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg space-y-2">
                                <div className="space-y-1">
                                  <label className="text-[8.5px] font-mono text-gray-400 uppercase block font-semibold">Question</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. What is JAX compilation?"
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-slate-200 outline-none focus:border-indigo-500 font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8.5px] font-mono text-gray-400 uppercase block font-semibold">Answer Details</label>
                                  <textarea
                                    placeholder="Enter corresponding notes..."
                                    value={newAnswer}
                                    rows={2}
                                    onChange={(e) => setNewAnswer(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-slate-200 outline-none focus:border-indigo-500 font-mono"
                                  />
                                </div>
                                <div className="flex justify-end gap-1.5 text-[9.5px] font-mono">
                                  <button
                                    type="button"
                                    onClick={() => setShowAddQAForm(false)}
                                    className="px-1.5 py-0.5 text-gray-500 hover:text-white cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="bg-[#0070f3] text-white px-2 py-0.5 rounded font-bold cursor-pointer"
                                  >
                                    Add Note
                                  </button>
                                </div>
                              </form>
                            )}

                            {pinnedQAs.length === 0 ? (
                              <p className="text-[9px] font-mono text-gray-550 italic p-1.5 bg-slate-950/40 border border-dashed border-slate-800 rounded">No pinned discussions yet. Click "Pin to Summary Notes" under any question in the Q&A Desk!</p>
                            ) : (
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                                {pinnedQAs.map((item) => (
                                  <div key={item.id} className="p-2 bg-slate-950 border border-slate-900 rounded-lg space-y-1 relative group">
                                    <button
                                      onClick={() => handleRemoveQA(item.id)}
                                      type="button"
                                      className="absolute top-1.5 right-1.5 text-gray-600 hover:text-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                      title="Delete QA item from notes"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    <div className="flex items-start gap-1">
                                      <span className="text-[9px] font-mono font-bold text-indigo-400 shrink-0">Q:</span>
                                      <p className="text-[10px] text-slate-200 leading-normal font-bold font-sans">{item.question}</p>
                                    </div>
                                    <div className="flex items-start gap-1 border-t border-slate-900 pt-1 mt-1">
                                      <span className="text-[9px] font-mono font-bold text-emerald-400 shrink-0">A:</span>
                                      <p className="text-[9.5px] text-slate-300 leading-normal font-mono">{item.answer}</p>
                                    </div>
                                    <span className="text-[8px] font-mono text-gray-500 block">Speaker: {item.author}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Code snippets block */}
                          <div className="space-y-2 border-t border-gray-800/80 pt-2.5">
                            <span className="text-[9px] font-mono text-indigo-400 uppercase font-black block">
                              💻 Shared Code Scribes ({sharedSnippets.length})
                            </span>

                            {sharedSnippets.length === 0 ? (
                              <p className="text-[9px] font-mono text-gray-500 italic p-1.5 bg-slate-950/40 border border-dashed border-slate-800 rounded">No snippets shared. Hit "Save to Summary" inside the Code Playground tab!</p>
                            ) : (
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                                {sharedSnippets.map((snippet) => (
                                  <div key={snippet.id} className="p-2 bg-slate-950 border border-slate-900 rounded-lg space-y-1 relative group">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-200 font-sans tracking-tight">{snippet.title}</span>
                                      <span className="text-[8px] font-mono text-indigo-400 font-bold uppercase bg-indigo-950/40 px-1 border border-indigo-900/20 rounded">{snippet.language}</span>
                                    </div>
                                    {snippet.description && (
                                      <p className="text-[8.5px] text-gray-400 leading-relaxed italic">{snippet.description}</p>
                                    )}
                                    <pre className="p-1.5 bg-[#090f1e] rounded border border-slate-900 font-mono text-[8.5px] text-cyan-400 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[80px]">
                                      {snippet.code}
                                    </pre>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(snippet.code);
                                        setSummaryNotice("Snippet code copied directly to clipboard!");
                                        setTimeout(() => setSummaryNotice(null), 3000);
                                      }}
                                      type="button"
                                      className="text-[8.5px] text-[#38bdf8] hover:underline cursor-pointer flex items-center gap-0.5 mt-1 font-mono transition-all"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>Copy Code Block</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Submit Form (only show on chat tab) */}
                    {lectureSideTab === 'chat' && (
                      <form onSubmit={handleQAFormSubmit} className="pt-3 border-t border-gray-850 mt-4">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1.5">Submit question to active Queue</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={myQuestion}
                            onChange={(e) => setMyQuestion(e.target.value)}
                            placeholder="Type query to lecturer..."
                            className="flex-1 bg-slate-950 px-3 py-2 text-xs border border-gray-850 hover:border-gray-700 focus:border-[#38bdf8] focus:outline-none rounded text-white"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-[#0070f3] hover:bg-[#0051b3] text-white rounded cursor-pointer transition-all flex items-center justify-center shrink-0"
                            title="Send to lecture table"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* TAB TWO: INTERACTIVE PYTHON SANDBOX (WEBASSEMBLY) */
              <div id="code-sandbox-grid" className="w-full">
                {(() => {
                  const activeLessonDb = activeLessonIndex !== null ? (dbLessons[activeLessonIndex] || dbLessons.find((l: any) => l.chapter === course.syllabus[activeLessonIndex]?.chapter)) : null;
                  const activeLessonId = activeLessonDb?.id || null;
                  return <PythonSandbox lessonId={activeLessonId} onSaveToSummary={handleSaveSnippetToSummary} />;
                })()}
              </div>
            )}

          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Syllabus & Requirements & Resources (8 columns) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* RICH ACCESS TO LEARNING MATERIALS (ONLY IF ENROLLED) */}
            {hasEnrolledAccess && (
              <div id="enrolled-learning-resources-hub" className="bg-[#f9fafb] border border-blue-50/80 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                  <Video className="w-5 h-5 text-[#0070f3]" />
                  <h3 className="text-lg font-bold text-[#111827] tracking-tight">
                    Syllabus Materials & Resources Hub
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Item 1 */}
                  <a 
                    href="#sandbox-classroom-panel"
                    onClick={() => {
                      setClassroomMode(true);
                      setClassroomTab('lecture');
                    }}
                    className="p-4 bg-white border border-gray-200 hover:border-[#0070f3] rounded-lg transition-all flex flex-col justify-between group h-32 text-left shrink-0 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <Video className="w-6 h-6 text-[#0070f3] bg-[#0070f3]/5 p-1 rounded animate-pulse" />
                      <span className="text-[9px] font-mono bg-[#0070f3]/10 text-[#0070f3] px-1.5 py-0.5 rounded font-bold uppercase">LIVE NOW</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] line-clamp-1 group-hover:text-[#0070f3]">Live Interactive Lectures</h4>
                      <p className="text-[10px] text-gray-450 mt-1">HD whiteboard projections and instructor chat sessions</p>
                    </div>
                  </a>

                  {/* Item 2 */}
                  <a 
                    href="https://github.com/mountech-academy-labs" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-4 bg-white border border-gray-200 hover:border-[#0070f3] rounded-lg transition-all flex flex-col justify-between group h-32 text-left shrink-0"
                  >
                    <div className="flex justify-between items-start">
                      <Code className="w-6 h-6 text-indigo-600 bg-indigo-50 p-1 rounded" />
                      <span className="text-[9px] font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">REPOS</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] line-clamp-1 group-hover:text-[#0070f3]">GitHub Lab Assignments</h4>
                      <p className="text-[10px] text-gray-450 mt-1">Clean Python configurations & container deployment code</p>
                    </div>
                  </a>

                  {/* Item 3 */}
                  <a 
                    href="/api/download/syllabus"
                    download="mountech_lab_companion.pdf"
                    className="p-4 bg-white border border-gray-200 hover:border-[#0070f3] rounded-lg transition-all flex flex-col justify-between group h-32 text-left shrink-0"
                  >
                    <div className="flex justify-between items-start">
                      <FileText className="w-6 h-6 text-emerald-600 bg-emerald-50 p-1 rounded" />
                      <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">DOCS</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] line-clamp-1 group-hover:text-[#0070f3]">PDF Course Companion</h4>
                      <p className="text-[10px] text-gray-455 mt-1 animate-none">Syllabus summaries, mathematics, and code cheat sheets</p>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Phase 3 Student UI: Live Sessions card */}
            {hasEnrolledAccess && (
              <div id="enrolled-live-sessions-hub" className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 space-y-5 animate-fade-in animate-duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                      <span>Live Classroom & Online Seminars</span>
                    </h3>
                    <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">
                      Register to attend live interactive review sessions. The virtual classroom unlocks exactly 5 minutes before scheduled startup.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadSessions}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-[#0070f3] hover:border-[#0070f3]/30 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 select-none text-[10px] font-bold"
                    title="Refresh schedule calendar"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                    <span>Sync Calendar</span>
                  </button>
                </div>

                {loadingSessions ? (
                  <div className="py-8 flex flex-col items-center justify-center text-xs text-gray-400 font-mono gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    <span>Syncing active schedule...</span>
                  </div>
                ) : liveSessions.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-gray-100 rounded-xl">
                    <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No live sessions scheduled</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">Check back later or contact your instructor/board member for individualized training schedules.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 font-sans text-xs">
                    {liveSessions.map((session) => {
                      const startDate = new Date(session.start_time);
                      const endDate = new Date(session.end_time);
                      
                      const dateStr = startDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const timeStr = `${startDate.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - ${endDate.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`;

                      const hasEnded = Date.now() > endDate.getTime();

                      return (
                        <div
                          key={session.id}
                          className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 ${
                            hasEnded ? 'opacity-50' : ''
                          }`}
                          id={`live-session-${session.id}`}
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-[#111827] text-xs md:text-sm flex items-center gap-2">
                              <span>{session.title}</span>
                              {hasEnded && (
                                <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border border-gray-200">
                                  ENDED
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">
                              <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{dateStr}</span>
                              <span className="text-slate-600 bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded">{timeStr}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setActiveLiveRoomSession(session)}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-sm font-sans"
                            >
                              <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                              <span>Join Live Classroom</span>
                            </button>
                            <LiveSessionButton session={session} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Syllabus Section */}
            <div id="syllabus-section-box">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-gray-805" />
                <h2 className="text-xl md:text-2xl font-bold text-[#111827] tracking-tight">
                  Course Syllabus & Chapters ({course.syllabus.length})
                </h2>
              </div>

              <div id="detail-syllabus-list" className="space-y-4 relative">
                {!hasEnrolledAccess && (
                  <div className="absolute inset-x-0 top-0 bottom-0 z-10 bg-white/75 backdrop-blur-[4px] rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-gray-200">
                    <div className="p-3.5 bg-slate-100 text-[#111827] border border-gray-300 rounded-2xl mb-4 shrink-0 shadow-3xs">
                      <Lock className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-base md:text-lg font-sans font-extrabold text-gray-900 tracking-tight">
                      Curriculum Syllabus & Chapters Locked
                    </h3>
                    
                    <p className="text-xs text-gray-500 max-w-sm mt-2 leading-relaxed">
                      This course content details are restricted to enrolled scholars. Let's enroll in this course to unlock complete lecture checklists, interactive sandboxes, companion PDF handbooks, and standard coding homework.
                    </p>
                    
                    <div className="mt-5">
                      <button
                        onClick={handleEnrollClick}
                        className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Enroll & Register Course</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Progress Bar Banner */}
                {isEnrolled && (
                  <div className="bg-slate-50 border border-gray-200 rounded-xl p-5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="syllabus-progress-tracker-bar">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-wider font-bold text-[#0070f3] uppercase">COURSE PROGRESS DETECTOR</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{completionPercentage}% Completed</span>
                        <span className="text-xs text-gray-500">({completedLessons.length} of {course.syllabus.length} lessons reviewed)</span>
                      </div>
                    </div>
                    <div className="flex-1 max-w-md w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-150">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className={!hasEnrolledAccess ? "opacity-35 select-none pointer-events-none filter blur-[3px] space-y-4" : "space-y-4"}>
                  {course.syllabus.map((slice, index) => {
                    const isLesCompleted = completedLessons.includes(index);
                    const dbLes = dbLessons[index] || dbLessons.find(l => l.chapter === slice.chapter);
                    const isLesLocked = dbLes ? dbLes.isLocked : (index > 0 && !completedLessons.includes(index - 1));
                    return (
                      <div
                        key={index}
                        id={`syllabus-item-${index}`}
                        className={`bg-white rounded-xl border p-5 transition-all duration-200 ${
                          isLesLocked
                            ? 'border-gray-150 bg-gray-50/20 opacity-65'
                            : 'border-gray-200 hover:border-[#0070f3] hover:shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[9px] tracking-wider text-gray-455 font-bold uppercase block">
                                {slice.chapter}
                              </span>
                              {isLesCompleted && (
                                <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded uppercase">COMPLETED</span>
                              )}
                              {isLesLocked && (
                                <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded uppercase inline-flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> CHAPTER LOCKED
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm md:text-base font-bold text-[#111827]">
                              {slice.title}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                              {slice.description}
                            </p>
                          </div>

                          {/* Interactive Buttons for Enrolled Scholars */}
                          {hasEnrolledAccess && (
                            <div className="flex sm:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto">
                              {isLesLocked ? (
                                <>
                                  <button
                                    disabled
                                    className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-not-allowed font-sans select-none"
                                  >
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                    <span>Locked</span>
                                  </button>
                                  <button
                                    disabled
                                    className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg font-semibold flex items-center justify-center gap-1 cursor-not-allowed font-sans select-none"
                                  >
                                    <span>Locked</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    id={`chapter-interactive-trigger-${index}`}
                                    onClick={() => {
                                      setClassroomMode(true);
                                      setClassroomTab('lecture');
                                      setActiveLessonIndex(index);
                                      markLessonCompleted(index);
                                      setTerminalOutput([`Successfully loaded classroom context for lesson: "${slice.title}"`]);
                                      setTimeout(() => {
                                        const panel = document.getElementById('sandbox-classroom-panel');
                                        if (panel) {
                                          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        } else {
                                          window.scrollTo({ top: 320, behavior: 'smooth' });
                                        }
                                      }, 80);
                                    }}
                                    className="text-xs px-3 py-1.5 bg-[#111827] text-white hover:bg-[#0070f3] transition-all rounded-lg font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                                  >
                                    <Play className="w-3 h-3 fill-current animate-pulse" />
                                    <span>Launch Sandbox</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleLesson(index)}
                                    className={`text-xs px-3 py-1.5 rounded-lg font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                                      isLesCompleted
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100 font-normal text-gray-500'
                                    }`}
                                  >
                                    <Check className={`w-3.5 h-3.5 ${isLesCompleted ? 'opacity-100 text-emerald-600 font-black' : 'opacity-30'}`} />
                                    <span>{isLesCompleted ? 'Completed' : 'Review Unit'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GRADUATION EXAM SECTION */}
            {hasEnrolledAccess && (
              <div id="graduation-exam-panel" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827] tracking-tight flex items-center gap-2">
                        Course Assessment Portal
                      </h3>
                      <p className="text-xs text-gray-500">
                        Secure course evaluations, randomized question banks, and server-side grading.
                      </p>
                    </div>
                  </div>
                </div>

                {/* If the instructor has designed SQLite Exams in this course */}
                {dbStudentExams.length > 0 ? (
                  <div className="space-y-6">
                    {/* If there is an active exam being taken */}
                    {activeDbExam ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                        <StudentExamTaker
                          courseId={course.id}
                          exam={activeDbExam}
                          completedLessons={completedLessons}
                          onClose={async (completedAttempt) => {
                            const isFinal = !activeDbExam?.exam_type || activeDbExam?.exam_type === 'final';
                            setActiveDbExam(null);
                            await loadDbStudentExams();
                            await loadDbLessons();
                            if (completedAttempt?.passed && isFinal && onComplete && !isCompleted) {
                              onComplete(course.id);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      /* List of available exams designed by instructors */
                      <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex gap-2.5">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">SQLite Examination Suite Enabled</span>
                            The instructor has author-configured formal assessments for this course. Click **"Launch Assessment"** to begin your test attempt. Correctly resolving responses above the configured threshold will approve your graduation status!
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {dbStudentExams.map((exam) => {
                            const hasPassedThis = exam.passed || (exam.bestAttempt && exam.bestAttempt.passed === 1);
                            
                            // Client-side & Server-side dual lock calculation
                            const isExamFinal = !exam.exam_type || exam.exam_type === 'final';
                            let isExamLocked = exam.isLocked === 1 || exam.isLocked === true;
                            let examRequiredChapters: string[] = [];

                            if (!isExamLocked) {
                              if (exam.exam_type === 'lesson') {
                                isExamLocked = false;
                              } else if (course.syllabus) {
                                let targetIndex = course.syllabus.length;
                                if (exam.chapter_id) {
                                  const matchIndex = course.syllabus.findIndex(
                                    (item: any) => item.chapter && item.chapter.trim().toLowerCase() === exam.chapter_id.trim().toLowerCase()
                                  );
                                  if (matchIndex !== -1) {
                                    targetIndex = matchIndex + 1; // Require current chapter completed
                                  } else {
                                    targetIndex = 0; // Unknown chapter is unlocked
                                  }
                                }

                                // Find missing chapters
                                for (let i = 0; i < targetIndex; i++) {
                                  if (!completedLessons.includes(i)) {
                                    isExamLocked = true;
                                    examRequiredChapters.push(course.syllabus[i].chapter || `Lesson ${i + 1}`);
                                  }
                                }
                              }
                            } else {
                              if (exam.exam_type === 'final') {
                                examRequiredChapters = ['all lesson-level quizzes inside the syllabus'];
                              } else {
                                examRequiredChapters = [`the previous quiz (${exam.lesson_reference || 'prior lesson chapter'})`];
                              }
                            }

                            return (
                              <div key={exam.id} className={`bg-white border rounded-xl p-5 transition-all space-y-4 ${
                                isExamLocked ? 'border-gray-250 bg-gray-50/40 opacity-85' : 'border-gray-150 hover:border-indigo-200'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-sm flex flex-wrap items-center gap-2">
                                      <span>{exam.title}</span>
                                      {hasPassedThis && (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                                          Passed & Approved
                                        </span>
                                      )}
                                      {isExamLocked && (
                                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                                          <Lock className="w-2.5 h-2.5 shrink-0" />
                                          Locked Check
                                        </span>
                                      )}
                                      {!isExamLocked && !hasPassedThis && (
                                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
                                          <Unlock className="w-2.5 h-2.5 shrink-0" />
                                          Ready
                                        </span>
                                      )}
                                    </h4>

                                    <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                                      {exam.exam_type === 'lesson' ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                          <BookOpen className="w-2.5 h-2.5" />
                                          Lesson Quiz • {exam.lesson_reference || "Lesson Level"}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded">
                                          <Award className="w-2.5 h-2.5" />
                                          Final Exam
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-550 mt-1">{exam.description || <span className="italic text-gray-400">No descriptive requirements set.</span>}</p>

                                    {isExamLocked && (
                                      <div className="mt-2.5 p-2.5 bg-red-50/60 border border-red-100 rounded-lg text-[11px] text-red-800 flex items-center gap-1.5 font-sans">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-650 shrink-0" />
                                        <span>
                                          <strong>Prerequisite Required:</strong> Complete {
                                            isExamFinal 
                                              ? 'all syllabus lessons to unlock the Final Exam.' 
                                              : `lessons: ${examRequiredChapters.join(', ')}`
                                          }
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-1 rounded">
                                      Passing standard: {exam.passing_score_percentage || 70}%
                                    </span>
                                  </div>
                                </div>

                                <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-500">
                                  <span>Pool draw: {exam.questions_to_display || 5} random questions</span>
                                  
                                  {isExamLocked ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 border border-gray-200 text-gray-400 font-semibold text-xs rounded-lg cursor-not-allowed font-sans select-none"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Locked</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveDbExam(exam)}
                                      className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer select-none font-sans"
                                    >
                                      <span>Launch Assessment</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Previous attempts listing */}
                                {exam.attempts && exam.attempts.length > 0 && (
                                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-2">
                                    <h5 className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">Attempt history</h5>
                                    <div className="space-y-1.5 divide-y divide-gray-150">
                                      {exam.attempts.map((att: any) => (
                                        <div key={att.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs text-gray-650 font-sans">
                                          <div className="flex items-center gap-2 animate-fade-in">
                                            <span className="font-mono text-[10px] text-gray-400">ID #{att.id}</span>
                                            <span>
                                              Date: {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'Incomplete'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 font-mono">
                                            <span className={`font-bold ${att.passed === 1 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                              {att.score}% {att.passed === 1 ? 'Passed' : 'Failed'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* LEGACY HARDCODED FALLBACK EXAM SYSTEM */
                  completionPercentage < 100 && !examPassed ? (
                    /* LOCKED STATE */
                    <div className="text-center py-10 px-4 flex flex-col items-center justify-center space-y-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
                      <div className="p-3 bg-gray-100 text-gray-400 rounded-full border border-gray-200">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 max-w-sm">
                        <h4 className="text-sm font-bold text-gray-800">Examination Locked</h4>
                        <p className="text-xs text-gray-550 leading-relaxed">
                          To unlock the 5-question academic graduation test, please finish reviewing all syllabus chapters first.
                        </p>
                      </div>
                      
                      {/* Visual progress bar inside locked panel */}
                      <div className="w-full max-w-xs space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-mono text-gray-500">
                          <span>Syllabus units reviewed: {completedLessons.length}/{course.syllabus.length}</span>
                          <span>{completionPercentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* UNLOCKED & ACTIVE EXAM STATE */
                    <div className="space-y-6">
                      <div className="p-4 bg-teal-50 border border-teal-100 rounded-lg text-xs leading-relaxed text-teal-950 flex gap-2.5">
                        <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="font-bold block text-teal-950">Examination Unlocked</span>
                          All syllabus lessons completed! Review the questions below carefully. Correctly matching 4 or more answers (80%+) will activate your verified parchment record.
                        </div>
                      </div>

                      <div className="space-y-6 divide-y divide-gray-100">
                        {examQuestions.map((q, qIndex) => {
                          const isCorrect = examAnswers[q.id] === q.correctIndex;
                          const hasSelected = examAnswers[q.id] !== undefined;

                          return (
                            <div key={q.id} className={`pt-6 ${qIndex === 0 ? 'pt-0 border-t-0' : ''} space-y-3`}>
                              <div className="font-medium text-sm text-[#111827] flex gap-2">
                                <span className="font-mono font-bold text-[#0070f3]">Q{qIndex + 1}.</span>
                                <span className="leading-relaxed text-slate-800">{q.question}</span>
                              </div>

                              <div className="grid grid-cols-1 gap-2 pl-6">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = examAnswers[q.id] === oIdx;
                                  let optionStyle = "border-gray-200 hover:border-gray-300 bg-white text-gray-700";
                                  
                                  if (examSubmitted) {
                                    if (oIdx === q.correctIndex) {
                                      optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium";
                                    } else if (isSelected) {
                                      optionStyle = "border-rose-500 bg-rose-50 text-rose-950";
                                    } else {
                                      optionStyle = "border-gray-150 bg-gray-55/50 text-gray-400 opacity-60";
                                    }
                                  } else if (isSelected) {
                                    optionStyle = "border-[#0070f3] bg-[#0070f3]/5 text-[#0070f3] font-medium shadow-3xs";
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      disabled={examSubmitted}
                                      onClick={() => handleSelectAnswer(q.id, oIdx)}
                                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                                        !examSubmitted ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                                      } ${optionStyle}`}
                                    >
                                      <span className="flex-1 leading-normal pr-3">{opt}</span>
                                      <div className="shrink-0 flex items-center justify-center">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                          examSubmitted 
                                            ? oIdx === q.correctIndex 
                                              ? 'border-emerald-500 bg-emerald-500' 
                                              : isSelected 
                                                ? 'border-rose-500 bg-rose-500' 
                                                : 'border-gray-300'
                                            : isSelected 
                                              ? 'border-[#0070f3] bg-[#0070f3]' 
                                              : 'border-gray-300'
                                        }`}>
                                          {(isSelected || (examSubmitted && oIdx === q.correctIndex)) && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-scaleIn" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* EXPLANATION BOX */}
                              {examSubmitted && (
                                <div className="pl-6 pt-1.5">
                                  <div className={`p-3 rounded-lg border text-[11px] leading-relaxed flex gap-2 items-start ${
                                    isCorrect 
                                      ? 'bg-emerald-50/50 border-emerald-100 text-emerald-850' 
                                      : 'bg-rose-50/50 border-rose-100 text-rose-850'
                                  }`}>
                                    <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`} />
                                    <div>
                                      <span className="font-bold block uppercase tracking-wider text-[9px] mb-0.5">
                                        {isCorrect ? 'Correct Answer' : 'Explanation Feedback'}
                                      </span>
                                      <p>{q.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ACTIONS BAR */}
                      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {!examSubmitted ? (
                          <>
                            <div className="text-xs text-gray-500 font-mono">
                              {Object.keys(examAnswers).length} of {examQuestions.length} answers submitted.
                            </div>
                            <button
                              type="button"
                              onClick={handleSubmitExam}
                              className="px-5 py-2.5 bg-[#0070f3] hover:bg-[#0051b3] text-white font-mono font-bold rounded-lg text-xs uppercase tracking-wider select-none cursor-pointer transition-all shadow-sm"
                            >
                              Submit & Score Examination
                            </button>
                          </>
                        ) : (
                          <div className="w-full space-y-4">
                            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              examPassed 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-rose-50 border-rose-200'
                            }`}>
                              <div className="flex items-center gap-3">
                                {examPassed ? (
                                  <div className="p-2 bg-emerald-500 text-white rounded-full">
                                    <Check className="w-6 h-6 shrink-0" />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-rose-500 text-white rounded-full">
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900">
                                    {examPassed ? 'PASSED with Honors!' : 'Unsuccessful Attempt'}
                                  </h4>
                                  <p className="text-xs text-gray-650 leading-relaxed mt-0.5">
                                    {examPassed 
                                      ? `Institution Result: ${currentScore}% score recorded. You are fully eligible to lock completion & claim certification.` 
                                      : `Institution Result: ${currentScore}% score recorded. 80% passing standard is required. Let's do a quick review and try again.`}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-mono text-gray-500 block uppercase">GRADUATION SCORE</span>
                                <span className={`text-2xl font-black ${examPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {currentScore}%
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 text-xs w-full">
                              <button
                                type="button"
                                onClick={handleResetExam}
                                className="px-4 py-2 text-gray-650 hover:text-black border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reset and Re-take Test</span>
                              </button>

                              {examPassed && !isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => onComplete && onComplete(course.id)}
                                  className="px-5 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs select-none"
                                >
                                  <Award className="w-4 h-4 text-white" />
                                  <span>Lock Completion & Claim Certificate</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Student Requirements Box */}
            <div id="requirements-section-box" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-3xs">
              <div className="flex items-center gap-2 mb-5">
                <AlertCircle className="w-5 h-5 text-gray-805" />
                <h2 className="text-lg md:text-xl font-bold text-[#111827] tracking-tight">
                  Pre-requisites & Target Audience
                </h2>
              </div>
              
              <ul className="list-inside space-y-3">
                {course.requirements.map((req, index) => (
                  <li key={index} id={`req-item-${index}`} className="text-xs md:text-sm text-gray-600 flex gap-2.5 items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Meet the Instructor Box */}
            <div id="instructor-profile-box" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-3xs">
              <h2 className="text-lg md:text-xl font-bold text-[#111827] tracking-tight mb-5">
                Meet Your Instructors
              </h2>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {(() => {
                  const instructorsToRender = (course.instructors && course.instructors.length > 0)
                    ? course.instructors
                    : [{ id: course.instructor_profile_id, name: course.instructorName, title: course.instructorTitle, avatar: undefined as string | undefined }];

                  return instructorsToRender.map((inst: any, index) => {
                    const matchInst = instructorsList.find(
                      (p) =>
                        (inst.id && p.id === Number(inst.id)) ||
                        p.full_name.trim().toLowerCase() === (inst.name || '').trim().toLowerCase() ||
                        p.user_email.trim().toLowerCase() === (inst.name || '').trim().toLowerCase() ||
                        (inst.name || '').toLowerCase().includes(p.full_name.trim().toLowerCase())
                    );

                    if (matchInst) {
                      return (
                        <div key={index} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                          <InstructorCard profile={matchInst} />
                        </div>
                      );
                    }

                    if (!inst.name) return null;

                    return (
                      <div key={index} className="flex flex-col sm:flex-row gap-5 items-start sm:items-center border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                        {inst.avatar ? (
                          <img
                            src={inst.avatar}
                            alt={inst.name}
                            className="w-14 h-14 rounded-full object-cover shrink-0 shadow-2xs"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#111827] text-[#ffffff] flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs">
                            {inst.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        <div className="space-y-1 text-xs md:text-sm">
                          <h4 className="text-[#111827] font-bold text-sm tracking-tight md:text-base">
                            {inst.name}
                          </h4>
                          <p className="text-gray-405 font-mono text-xs">
                            {inst.title || "Academic Facilitator"}
                          </p>
                          <p className="text-gray-500 mt-2 leading-relaxed text-xs">
                            Pioneering educator in advanced code architectures and machine learning systems. Our Mountech faculty works alongside industry lead developers to verify rigorous standards.
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Scholar Feedback & Star Rating Box */}
            <div id="course-rating-reviews-hub" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-3xs space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                    <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827] tracking-tight">
                      Scholar Reviews & Ratings
                    </h3>
                    <p className="text-xs text-gray-500">
                      Authentic peer feedback recorded to the laboratory registry.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating Stats Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50 border border-gray-150 rounded-xl p-6">
                <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-4">
                  <span className="text-[10px] font-mono tracking-wider text-gray-400 font-bold uppercase block">AVERAGE SCORE</span>
                  <div className="text-5xl font-extrabold text-[#111827] mt-1">
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-1 my-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(averageRating)
                            ? "text-amber-500 fill-amber-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-gray-500">
                    {ratingCount} verified {ratingCount === 1 ? 'review' : 'reviews'}
                  </span>
                </div>

                <div className="md:col-span-8 flex flex-col justify-center space-y-2 text-xs font-mono text-gray-600 pl-0 md:pl-4">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const matches = ratings.filter((r) => r.rating === score).length;
                    const percent = ratingCount > 0 ? (matches / ratingCount) * 100 : 0;
                    return (
                      <div key={score} className="flex items-center gap-3">
                        <span className="w-3 text-right">{score}★</span>
                        <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-400 font-bold">
                          {matches}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Star Rating Submission Form */}
              <div className="bg-gradient-to-r from-blue-50/20 to-indigo-50/10 border border-blue-100/50 rounded-xl p-5 md:p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Submit Your Course Rating</h4>
                  <p className="text-xs text-slate-500">
                    Share your technical and laboratory study experience with future scholars.
                  </p>
                </div>

                <form onSubmit={handleRatingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-wide text-slate-500 uppercase block">
                      Select Rating Standard
                    </label>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setUserHoverRating(star)}
                          onMouseLeave={() => setUserHoverRating(null)}
                          className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= (userHoverRating ?? userRating)
                                ? 'text-amber-500 fill-amber-500 scale-105'
                                : 'text-slate-200 hover:text-amber-700'
                            } transition-all`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-mono text-slate-500 ml-3 font-semibold">
                        {(userHoverRating ?? userRating) === 5 && 'Excellent (5/5)'}
                        {(userHoverRating ?? userRating) === 4 && 'Very Good (4/5)'}
                        {(userHoverRating ?? userRating) === 3 && 'Average (3/5)'}
                        {(userHoverRating ?? userRating) === 2 && 'Below Par (2/5)'}
                        {(userHoverRating ?? userRating) === 1 && 'Unsatisfactory (1/5)'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-wide text-slate-500 uppercase block">
                      Write Review (Optional)
                    </label>
                    <textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Discuss the structures, coding whiteboards, play labs, or final exams..."
                      rows={3}
                      className="w-full text-xs border border-gray-200 hover:border-blue-300 focus:border-[#0070f3] rounded-lg p-3 outline-none transition-all placeholder:text-gray-400 focus:ring-1 focus:ring-blue-100 font-sans"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-mono flex gap-1.5 items-center">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-semibold flex gap-1.5 items-center animate-pulse">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{submitSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingRating}
                      className="px-4 py-2 bg-[#0070f3] hover:bg-[#0051b3] disabled:bg-slate-300 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all focus:outline-none cursor-pointer flex items-center gap-1.5"
                    >
                      {submittingRating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Scholar Review</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase block">
                  SCHOLAR REGISTRY ENTRIES ({ratings.length})
                </span>

                {ratings.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-slate-50/50">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium font-sans">No reviews submitted yet.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Be the first to rate this course and share feedback!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2 space-y-4">
                    {ratings.map((ratingItem) => (
                      <div key={ratingItem.id} className="pt-4 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900 block leading-none font-sans">
                              {ratingItem.name || 'Anonymous Student'}
                            </span>
                            <span className="text-[10px] font-mono text-[#0070f3] mt-1 block">
                              {ratingItem.email === user?.email?.toLowerCase() ? 'You' : 'Verified Scholar'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-0.5 justify-end">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= ratingItem.rating
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 mt-1 block">
                              {new Date(ratingItem.timestamp).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {ratingItem.review && (
                          <p className="text-xs text-gray-650 leading-relaxed font-sans mt-1 p-2 bg-slate-50/60 rounded-md border border-slate-100 italic">
                            "{ratingItem.review}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Action Widget (4 columns) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            
            <div id="detail-sticky-enroll-box" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
              
              <div className="space-y-1 text-center md:text-left">
                <span className="text-[10px] font-mono tracking-wider text-gray-400 font-bold uppercase block">
                  {course.isPaid ? 'ACADEMY TUITION & PREMIUM MEMBERSHIP' : 'ACADEMY TUITION & LABORATORY TESTS'}
                </span>
                <div className="text-3xl font-sans font-black text-[#111827] flex items-center gap-1.5 justify-center md:justify-start">
                  <span>{course.isPaid ? `$${course.price}` : 'FREE'}</span>
                  {course.isPaid ? (
                    <span className="text-gray-400 font-semibold text-xs font-mono mt-2 uppercase tracking-wide">One-Time Fee</span>
                  ) : (
                    <span className="text-neutral-300 font-normal text-xs font-mono line-through mt-2">($39/mo)</span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-gray-400 block leading-tight">
                  {course.isPaid 
                    ? 'Premium course with authorized labs, live lecture access and verified certificates.' 
                    : 'Courtesy of global Mountech Academy development partnerships'}
                </span>
              </div>

              {/* Action Button Trigger */}
              {isEnrolled ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-850 rounded-lg text-xs leading-relaxed flex gap-2 items-start" id="enrollment-status-toast">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-emerald-950">Enrollment Verified</span>
                      Registered via Google Sheets. Access active lecture rooms below.
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs space-y-3" id="completion-status-box">
                      <div className="flex gap-2 items-start">
                        <Award className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-bold block text-blue-950 text-sm">Course Completed!</span>
                          <p className="text-gray-650 mt-0.5 leading-tight">Your formal graduation record has been logged in Google Sheets. Download your official PDF certificate below.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadCertificate()}
                        disabled={downloadingCert || !hasPassedFinalExam}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap px-4 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Award className="w-4 h-4 text-white shrink-0" />
                        <span>{downloadingCert ? 'Generating...' : 'Download PDF Certificate'}</span>
                      </button>
                      {!hasPassedFinalExam && (
                        <p className="text-[10px] text-red-500 font-semibold text-center mt-1">
                          🔒 Pass the Final Exam to unlock your certificate.
                        </p>
                      )}
                    </div>
                  ) : isExamRequirementPassed ? (
                    <button
                      id="complete-course-action-btn"
                      onClick={() => onComplete && onComplete(course.id)}
                      className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-mono font-bold rounded-lg text-[10px] uppercase tracking-wider py-3.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all duration-250 select-none animate-shimmer"
                    >
                      <CheckCircle className="w-4 h-4 text-white shrink-0 animate-pulse" />
                      <span>Complete Course & Claim Cert</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        id="complete-course-action-btn"
                        disabled={true}
                        className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-mono font-bold rounded-lg text-[10px] uppercase tracking-wider py-3.5 flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                        title="You must pass the Final Exam with at least an 80% passing score before completing this course."
                      >
                        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>85% Exam Pass Required</span>
                      </button>
                      <p className="text-[10px] text-center text-gray-500 leading-relaxed">
                        To unlock graduation, review all syllabus units and achieve 80%+ on the multiple-choice final exam below.
                      </p>
                    </div>
                  )}

                  <button
                    id="launch-playground-widget-btn"
                    onClick={() => {
                      setClassroomMode(true);
                      setClassroomTab('lecture');
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                      if (activeLessonIndex === null) {
                        setActiveLessonIndex(0);
                      }
                    }}
                    className="w-full bg-[#111827] text-white hover:bg-black font-bold rounded-lg text-xs transition-all py-3 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap select-none"
                  >
                    <Tv2 className="w-4 h-4 text-[#38bdf8]" />
                    <span>Enter Lecture Classroom</span>
                  </button>
                </div>
              ) : user && user.role === 'admin' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-lg text-xs leading-relaxed flex gap-2 items-start" id="admin-override-toast">
                    <Shield className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-rose-950">Administrative Clearance</span>
                      You hold an administrator account. Full syllabus chapters and developer sandboxes are unlocked autonomously.
                    </div>
                  </div>

                  <button
                    id="launch-playground-widget-btn"
                    onClick={() => {
                      setClassroomMode(true);
                      setClassroomTab('lecture');
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                      if (activeLessonIndex === null) {
                        setActiveLessonIndex(0);
                      }
                    }}
                    className="w-full bg-rose-600 text-white hover:bg-rose-700 font-bold rounded-lg text-xs transition-all py-3 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap select-none"
                  >
                    <Tv2 className="w-4 h-4 text-rose-200" />
                    <span>Enter Lecture Classroom</span>
                  </button>
                </div>
              ) : (
                <button
                  id="enroll-course-action-btn"
                  onClick={handleEnrollClick}
                  className="w-full bg-[#0070f3] hover:bg-[#0051b3] text-white font-bold rounded-lg text-xs transition-all duration-200 py-3 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider font-mono text-[10px]"
                >
                  <Award className="w-4 h-4 text-white shrink-0" />
                  <span>{course.isPaid ? 'Purchase & Enroll' : 'Enroll in Course'}</span>
                </button>
              )}

              {/* Syllabus inclusions list */}
              <div className="pt-4 border-t border-gray-150 text-xs text-gray-550 space-y-3">
                <span className="font-mono text-[9px] text-gray-400 font-bold tracking-wider uppercase block">
                  THIS LEARNING PATH INCLUDES:
                </span>
                
                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                  <span>100% online self-paced study dashboard</span>
                </div>

                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                  <span>Simultaneous live streaming whiteboard lecture</span>
                </div>

                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                  <span>Jupyter terminal interactive playground</span>
                </div>

                <div className="flex gap-2 items-center">
                  <Check className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                  <span>Official Certificate of Completion</span>
                </div>
              </div>

            </div>

            {/* Quick help context card */}
            <div id="sticky-help-box" className="bg-[#f9fafb] rounded-xl border border-gray-250 p-5 space-y-2">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-gray-450" />
                <h4 className="text-[10px] font-mono font-bold text-gray-700 uppercase">Need assistance?</h4>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Problems running model cell scripts, processing cards, or saving spreadsheet logs? Reach us at: <span className="font-semibold text-brand-blue">support@mountech.academy</span>
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* STYLISH MODAL DIALOG PRESET: PREMIUM MEMEBRSHIP SECURE CHECKOUT GATEWAY */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-150 overflow-hidden"
              id="payment-modal-box"
            >
              {/* Modal header branding */}
              <div className="bg-[#f9fafb] px-6 py-4 border-b border-gray-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={brandLogo} alt="Mountech Academy Logo" className="w-6 h-6 rounded object-cover select-none border border-gray-200" referrerPolicy="no-referrer" />
                  <span className="text-xs uppercase font-mono tracking-wider text-gray-700 font-bold">Mountech Secure Checkout</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPayError('');
                    setPayStep('form');
                    setSmsNotification('');
                  }}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form & Loader Container processes */}
              <div className="p-6">

                {/* SMS incoming OTP notification preview */}
                {smsNotification && (
                  <div className="mb-4 p-4 bg-amber-500 text-neutral-950 rounded-xl border border-amber-600 shadow-md flex items-start gap-2 relative overflow-hidden animate-pulse">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-700" />
                    <Smartphone className="w-5 h-5 shrink-0 text-amber-950 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <strong className="text-[9px] font-mono uppercase tracking-widest text-amber-950 block">💬 Incoming Sandbox SMS</strong>
                      <p className="text-[11px] leading-relaxed font-semibold font-mono">
                        {smsNotification}
                      </p>
                    </div>
                  </div>
                )}
                
                {payStep === 'form' && (
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="text-center pb-2 border-b border-gray-100">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Purchasing Course</span>
                      <h3 className="text-base font-extrabold text-[#111827] line-clamp-1">{course.title}</h3>
                      <div className="text-2xl font-black text-blue-650 mt-1">${course.price} <span className="text-xs font-normal text-gray-500">(NPR {(course.price * 133).toLocaleString()})</span></div>
                    </div>

                    {/* Payment Method Selector Grid */}
                    <div className="grid grid-cols-4 gap-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('card'); setPayError(''); }}
                        className={`py-2.5 px-0.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'card'
                            ? 'border-[#0070f3] bg-blue-50/50 text-[#0070f3] font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider font-mono">Card</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('esewa'); setPayError(''); }}
                        className={`py-2.5 px-0.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'esewa'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider font-mono">eSewa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('khalti'); setPayError(''); }}
                        className={`py-2.5 px-0.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'khalti'
                            ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider font-mono">Khalti</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('manual_bank'); setPayError(''); }}
                        className={`py-2.5 px-0.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'manual_bank'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                        id="btn-manual-bank-select"
                      >
                        <Globe className="w-4 h-4 text-indigo-600" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider font-mono">Bank</span>
                      </button>
                    </div>

                    {payError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex gap-2 items-center" id="payment-error-toast">
                        <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
                        <span className="font-semibold">{payError}</span>
                      </div>
                    )}

                    {/* DYNAMIC FORMS BASED ON STRATEGY */}
                    {paymentMethod === 'card' && (
                      <div className="space-y-4">
                        {/* Cardholder name input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="e.g. Alexis Jordan"
                            className="w-full px-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-[#0070f3] focus:outline-none rounded text-xs"
                          />
                        </div>

                        {/* Credit Card digits input wrapper */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Credit Card Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => handleCardNumberChange(e.target.value)}
                              placeholder="0000 0000 0000 0000"
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-[#0070f3] focus:outline-none rounded text-xs font-mono"
                            />
                            <CreditCard className="w-4 h-4 text-gray-450 absolute left-3 top-2.5" />
                          </div>
                        </div>

                        {/* Expiry and CVC grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Expiration</label>
                            <input
                              type="text"
                              value={expiry}
                              onChange={(e) => handleExpiryChange(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full px-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-[#0070f3] focus:outline-none rounded text-xs font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">CVC Security Code</label>
                            <input
                              type="password"
                              value={cvc}
                              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                              placeholder="•••"
                              maxLength={3}
                              className="w-full px-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-[#0070f3] focus:outline-none rounded text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Postal/Zip code input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block">Billing Postal Code / Zip</label>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value.slice(0, 10))}
                            placeholder="e.g. 90210"
                            className="w-full px-3 py-2 border border-gray-200 hover:border-gray-300 focus:border-[#0070f3] focus:outline-none rounded text-xs uppercase"
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'esewa' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-lg flex items-center gap-2 text-emerald-800 text-[11px] border border-emerald-100">
                          <Smartphone className="w-4 h-4 shrink-0 text-emerald-600 animate-bounce" />
                          <span>Pay securely using your registered eSewa Nepalese digital wallet account.</span>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase block">eSewa ID (Mobile or Email)</label>
                          <input
                            type="text"
                            value={esewaID}
                            onChange={(e) => setEsewaID(e.target.value)}
                            placeholder="98xxxxxxxx / scholar@esewa.np"
                            required
                            className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 focus:outline-none rounded text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-emerald-700 uppercase block">eSewa Web Password / MPIN</label>
                          <input
                            type="password"
                            value={esewaPassword}
                            onChange={(e) => setEsewaPassword(e.target.value)}
                            placeholder="••••"
                            required
                            className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 focus:outline-none rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'khalti' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-50 rounded-lg flex items-center gap-2 text-purple-800 text-[11px] border border-purple-100">
                          <Smartphone className="w-4 h-4 shrink-0 text-purple-600 animate-bounce" />
                          <span>Direct instant charge to your Khalti Nepal mobile wallet credentials.</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-purple-700 uppercase block">Khalti Nepal Mobile ID</label>
                          <input
                            type="text"
                            value={khaltiNumber}
                            onChange={(e) => setKhaltiNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="98xxxxxxxx / 97xxxxxxxx"
                            required
                            className="w-full px-3 py-2 border border-purple-200 focus:border-purple-500 focus:outline-none rounded text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-purple-700 uppercase block">4-Digit wallet PIN</label>
                          <input
                            type="password"
                            value={khaltiPIN}
                            onChange={(e) => setKhaltiPIN(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            required
                            className="w-full px-3 py-2 border border-purple-200 focus:border-purple-500 focus:outline-none rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'manual_bank' && (
                      <div className="space-y-3" id="manual-checkout-preview-pane">
                        <div className="p-3 bg-indigo-50 rounded-lg flex items-start gap-2 text-indigo-800 text-[11px] border border-indigo-100">
                          <Globe className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5 animate-pulse" />
                          <div className="space-y-1">
                            <span className="font-bold block text-indigo-950">Manual Bank Transfer Gateway</span>
                            <span>Initiate a secure manual transaction to our local bank. Click <strong>Confirm Order</strong> to register your request and view account coordinates.</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center flex flex-col items-center justify-center space-y-1 text-gray-500">
                          <ShieldCheck className="w-7 h-7 text-indigo-500" />
                          <span className="text-[11px] font-semibold leading-normal font-sans">Our team will verify the payment within 24 hours.</span>
                        </div>
                      </div>
                    )}

                    {/* Disclaimer and secure seal */}
                    <div className="flex items-center justify-between text-[10px] text-gray-450 pt-1">
                      <span className="flex items-center gap-1">
                        🔑 256-bit SSL secure encryption
                      </span>
                      <span>Mountech Gateway Approved</span>
                    </div>

                    {/* Action trigger button */}
                    <button
                      type="submit"
                      disabled={paymentProcessLoading}
                      className={`w-full py-3 text-white rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'card' ? 'bg-[#0070f3] hover:bg-[#0051b3]' :
                        paymentMethod === 'esewa' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        paymentMethod === 'khalti' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {paymentProcessLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>{paymentMethod === 'manual_bank' ? 'Confirm Order' : `Authorize Payment ($${course.price})`}</span>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP TWO: SECURING BANK 3D-SECURE SECURE LOOPS */}
                {payStep === 'secure' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      {/* Animated gateway spinner */}
                      <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#111827]">Contacting Payment Gateway...</h4>
                      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                        Establishing secure handshake protocols with core clearing servers. Checking balance thresholds and approving registration credentials...
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP THREE: SMS OTP ENTRY INTERACTION */}
                {payStep === 'otp' && (
                  <form onSubmit={handleOtpVerify} className="space-y-5">
                    <div className="text-center pb-2">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Smartphone className="w-6 h-6 animate-pulse text-amber-600" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Two-Factor Authentication</span>
                      <h3 className="text-sm font-extrabold text-[#111827]">Enter Transaction OTP</h3>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                        We dispatched a verification passcode via SMS. Simply enter it below to securely authorize the Nepalese gateway payment.
                      </p>
                    </div>

                    {payError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
                        <span className="font-semibold">{payError}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-gray-500 uppercase block text-center">6-Digit Verification PIN</label>
                      <input
                        type="text"
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        required
                        className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold px-3 py-2.5 border border-gray-350 focus:border-[#0070f3] focus:ring-1 focus:ring-[#0070f3] focus:outline-none rounded-lg"
                      />
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <button
                        type="submit"
                        disabled={paymentProcessLoading}
                        className="w-full py-3 bg-[#0070f3] hover:bg-[#0051b3] text-white rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        {paymentProcessLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Verify OTP & Authorize</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnteredOtp(otpCode)}
                        className="w-full py-1.5 bg-[#f9fafb] hover:bg-gray-100 text-[#111827] rounded text-[10px] font-mono font-bold transition-all border border-gray-200 cursor-pointer"
                      >
                        ⚡ Autofill Sandbox OTP: {otpCode}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPayStep('form');
                          setPayError('');
                          setSmsNotification('');
                        }}
                        className="w-full text-center text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                      >
                        ← Back to Payment Methods
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP FOUR: SECURE ENROLLMENT SUCCESS TRANSITIONS */}
                {payStep === 'success' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-[#111827]">Payment Authorization Approved! 🟢</h4>
                      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                        Charged successfully. Synchronizing student learning path credentials securely to Google Sheets Database. Loading course workspace layers...
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP FIVE: PENDING MANUAL BANK VERIFICATION SCREEN */}
                {payStep === 'pending_verification' && bankInfo && (
                  <div className="space-y-4 py-2" id="pending-bank-verification-screen">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-5 h-5 animate-spin text-amber-600" style={{ animationDuration: '4s' }} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-amber-600 uppercase tracking-widest block">In Queue</span>
                      <h3 className="text-sm font-extrabold text-[#111827]">Order Pending Verification</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Please initiate the bank transfer using the details provided below.
                      </p>
                    </div>

                    {/* Bank Details Table Card */}
                    <div className="bg-[#f9fafb] rounded-xl border border-gray-200 p-4 space-y-2 text-xs">
                      <div className="text-[10px] font-mono font-bold uppercase text-gray-500 border-b border-gray-200 pb-1.5 flex justify-between items-center">
                        <span>Official Bank Coordinates</span>
                        <span className="text-[#0070f3] font-bold">NPR {(bankInfo.bankDetails.amount * 133).toLocaleString()} (or ${bankInfo.bankDetails.amount})</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-y-2 text-[11px] pt-1">
                        <div className="text-gray-400 font-medium">Bank Name:</div>
                        <div className="col-span-2 text-gray-900 font-bold font-mono text-right">{bankInfo.bankDetails.bankName}</div>
                        
                        <div className="text-gray-450 font-medium">Account Name:</div>
                        <div className="col-span-2 text-gray-900 font-bold font-mono text-right">{bankInfo.bankDetails.accountName}</div>
                        
                        <div className="text-gray-450 font-medium font-sans">IBAN Block:</div>
                        <div className="col-span-2 text-gray-900 font-bold font-mono text-right select-all bg-white px-1.5 py-0.5 border border-gray-200 rounded">{bankInfo.bankDetails.iban}</div>
                        
                        <div className="text-gray-450 font-medium">SWIFT Code:</div>
                        <div className="col-span-2 text-gray-900 font-bold font-mono text-right select-all bg-white px-1.5 py-0.5 border border-gray-200 rounded">{bankInfo.bankDetails.swift}</div>
                      </div>
                    </div>

                    {/* Unique Reference Code Box */}
                    <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4 text-center space-y-1.5 relative overflow-hidden" id="bank-memo-reference-container">
                      <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest block">Bank transfer message / memo reference</span>
                      <div className="text-xl font-black text-indigo-950 font-mono tracking-widest select-all bg-white py-1.5 px-6 rounded-lg border border-indigo-200 inline-block">
                        {bankInfo.payment_reference}
                      </div>
                      <p className="text-[10px] text-indigo-900 leading-relaxed font-sans px-1">
                        ⚠️ <strong>Warning:</strong> You <strong className="text-red-700">MUST</strong> include this exact Reference Code in your bank transfer memo/notes, or your enrollment will be delayed.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentModal(false);
                          setPayStep('form');
                          setPayError('');
                          setBankInfo(null);
                        }}
                        className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer shadow-sm text-center block hover:opacity-90"
                      >
                        I've Transferred, Return to Catalog
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
      )}

      {/* Footer Bar */}
      <footer className="bg-[#f9fafb] text-gray-400 py-8 border-t border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400">
          <div>
            © 2026 Mountech Academy. All rights reserved. Designed with clean minimalism.
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-gray-600 font-semibold" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#" className="hover:text-gray-600 font-semibold" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
          </div>
        </div>
      </footer>

      {showConfirmModal && confirmDownloadedAt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="expired-cert-confirm-modal-detail">
          <div className="bg-white border border-gray-100 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-start gap-4 text-left">
              <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#111827] tracking-tight">Certificate Already Issued</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You previously downloaded this official certificate on <strong className="text-gray-800">{new Date(confirmDownloadedAt).toLocaleString()}</strong>.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Would you like to generate and download a fresh copy? Note: This will not re-trigger or extend your 15-day sunset access countdown.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmDownloadedAt('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer select-none transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  setConfirmDownloadedAt('');
                  await handleDownloadCertificate(true);
                }}
                className="px-4 py-2 bg-[#0070f3] hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer select-none transition-colors"
                id="btn-confirm-download-again-detail"
              >
                Download Again
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
