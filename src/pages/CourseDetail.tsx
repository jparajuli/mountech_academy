import React, { useState } from 'react';
import { Course, User } from '../types';
import { 
  ArrowLeft, Clock, BookOpen, Star, CheckCircle, HelpCircle, 
  Award, Play, ChevronRight, Terminal, Sparkles, AlertCircle, 
  Video, Code, FileText, Check, Globe, ShieldCheck, CreditCard, 
  Send, Users, MessageSquare, ChevronLeft, Tv2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface CourseDetailProps {
  course: Course;
  user: User;
  onBack: () => void;
  isEnrolled: boolean;
  onEnroll: (courseId: string) => void;
  syncStatus?: { sheetsSynced: boolean; message?: string } | null;
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

export default function CourseDetail({ course, user, onBack, isEnrolled, onEnroll, syncStatus }: CourseDetailProps) {
  // Page states
  const [classroomMode, setClassroomMode] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  
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
  const [payStep, setPayStep] = useState<'form' | 'secure' | 'success'>('form');
  const [paymentProcessLoading, setPaymentProcessLoading] = useState(false);

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

  // Fetch contextual slides for the current course
  const slides = courseSlidesMap[course.id] || genericSlides;

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

    // Validation passed - initiate simulated payment gateway
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

      {/* Hero Banner Section (Clean Slate Theme) */}
      <section id="course-detail-banner" className="bg-[#f9fafb] text-[#111827] py-12 md:py-16 border-b border-[#e5e7eb] relative overflow-hidden">
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
                <Star className="w-4 h-4 text-[#0070f3] fill-[#0070f3]" />
                <span className="font-bold text-[#111827]">{course.rating}</span>
                <span>/ 5.0</span>
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
        {isEnrolled && (
          <div 
            id="personalized-welcome-banner"
            className="mb-8 p-6 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border border-blue-100 shadow-3xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[#0070f3]">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">ENROLLMENT VERIFIED</span>
                
                {syncStatus?.sheetsSynced ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold px-2 py-0.5 rounded-sm font-mono uppercase tracking-tight">
                    Synced with Sheets Database 🟢
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded-sm font-mono uppercase tracking-tight">
                    Local Cache Only
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-[#111827] tracking-tight">
                Welcome to active files scholar, {user.name}! 📚
              </h2>
              <p className="text-xs text-gray-505 leading-relaxed">
                Your registered learning path is synced securely with email <span className="font-mono text-[#0070f3]">{user.email}</span>. Live broadcasts and container sandboxes are activated.
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
        {classroomMode && isEnrolled ? (
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

              <button
                id="close-classroom-btn"
                onClick={() => setClassroomMode(false)}
                className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-gray-300 hover:text-white transition-all cursor-pointer font-mono font-medium self-end sm:self-center"
              >
                Close Theater
              </button>
            </div>

            {/* TAB ONE: ONLINE LECTURE THEATER BROADCAST WITH SYNCHRONIZED PRESENTATIONS AND STUDENT CHAT */}
            {classroomTab === 'lecture' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="live-lecture-grid">
                
                {/* Visual Projector / Slide Whiteboard Deck (8 columns) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-[#121929] border border-gray-800 rounded-lg p-5 relative overflow-hidden aspect-[16/9] flex flex-col justify-between shadow-inner">
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

                    {/* Widescreen presentation player slide controllers */}
                    <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono font-semibold">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>128 students active in lecture broadcast right now</span>
                      </div>

                      <div className="flex items-center gap-2">
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
                <div className="lg:col-span-4 bg-[#121929] border border-gray-800 rounded-lg p-4 flex flex-col justify-between min-h-[400px]">
                  <div className="space-y-4 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 border-b border-gray-800/80 pb-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
                        <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase">Live Student Q&A Desk</h4>
                      </div>
                      
                      {/* List of questions */}
                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {lectureQuestions.map((q) => (
                          <div key={q.id} className="text-xs bg-slate-950 p-3 rounded border border-gray-850 space-y-1">
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="font-bold text-gray-300">{q.sender}</span>
                              <span className="text-gray-600 font-mono">Synced</span>
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
                    </div>

                    {/* Question Submit Form */}
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
                  </div>
                </div>

              </div>
            ) : (
              /* TAB TWO: ORIGINAL CODE SANDBOX INTEGRATED SCENE */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="code-sandbox-grid">
                {/* Lecture list left (4 cols) */}
                <div className="lg:col-span-4 space-y-2">
                  <h4 className="text-[10px] font-mono font-bold tracking-widest text-[#38bdf8] uppercase mb-3">Syllabus Lab Notebooks</h4>
                  <div className="space-y-1.5">
                    {course.syllabus.map((les, index) => (
                      <button
                        key={index}
                        id={`sandbox-lesson-btn-${index}`}
                        onClick={() => {
                          setActiveLessonIndex(index);
                          setTerminalOutput([`Loaded notebook for chapter: "${les.title}"`, `Double-click items to customize prompts. Run cell to evaluate.`]);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex justify-between items-center cursor-pointer ${
                          activeLessonIndex === index
                            ? 'bg-slate-800 border-[#38bdf8] text-[#38bdf8]'
                            : 'bg-slate-900/60 border-gray-800 hover:bg-slate-800 hover:text-white text-gray-300'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[9px] text-gray-500 uppercase">{les.chapter}</span>
                          <span className="font-medium line-clamp-1">{les.title}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code execution area right (8 cols) */}
                <div className="lg:col-span-8 bg-[#090d16] border border-gray-800 rounded-lg p-5 flex flex-col justify-between min-h-[340px]">
                  {activeLessonIndex !== null ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                        <div>
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">ACTIVE CELL STATE</span>
                          <h4 className="text-sm font-bold text-white">{course.syllabus[activeLessonIndex].title}</h4>
                        </div>

                        <button
                          id="run-sandbox-cell-btn"
                          disabled={runLoading}
                          onClick={() => handleRunCommand(course.syllabus[activeLessonIndex].title)}
                          className="px-4 py-2 bg-[#0070f3] hover:bg-[#0051b3] text-white rounded font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 shadow-sm"
                        >
                          {runLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>Run Cell</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-400 italic">
                          {course.syllabus[activeLessonIndex].description}
                        </p>

                        <div className="p-3.5 bg-slate-900 border border-gray-800 rounded font-mono text-xs text-gray-300">
                          <span className="text-[#38bdf8]">import</span> mountech.genai <span className="text-[#38bdf8]">as</span> ai<br/>
                          prompt = <span className="text-teal-400">"Evaluate user input: {user.name} on {course.syllabus[activeLessonIndex].title}"</span><br/>
                          response = ai.models.generate_content(prompt, temperature=0.1)<br/>
                          <span className="text-[#38bdf8]">print</span>(response)
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">CONSOLE STDOUT/STDERR</span>
                        <pre className="bg-slate-900 p-3 border border-gray-800 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[120px] whitespace-pre-wrap">
                          {terminalOutput.join('\n')}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center my-auto p-8">
                      <Terminal className="w-10 h-10 text-gray-650 mb-3" />
                      <h4 className="text-sm font-bold text-gray-400">No Lesson Loaded</h4>
                      <p className="text-xs text-gray-505 mt-1 max-w-xs">
                        Select a notebook from the sidebar to test prompts dynamically inside the container sandbox.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Syllabus & Requirements & Resources (8 columns) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* RICH ACCESS TO LEARNING MATERIALS (ONLY IF ENROLLED) */}
            {isEnrolled && (
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
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="p-4 bg-white border border-gray-200 hover:border-[#0070f3] rounded-lg transition-all flex flex-col justify-between group h-32 text-left shrink-0"
                  >
                    <div className="flex justify-between items-start">
                      <FileText className="w-6 h-6 text-emerald-600 bg-emerald-50 p-1 rounded" />
                      <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">DOCS</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] line-clamp-1 group-hover:text-[#0070f3]">PDF Course Companion</h4>
                      <p className="text-[10px] text-gray-450 mt-1">Syllabus summaries, mathematics, and code cheat sheets</p>
                    </div>
                  </a>
                </div>
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

              <div id="detail-syllabus-list" className="space-y-4">
                {course.syllabus.map((slice, index) => (
                  <div
                    key={index}
                    id={`syllabus-item-${index}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#0070f3] hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                      <div className="space-y-1.5 flex-1">
                        <span className="font-mono text-[9px] tracking-wider text-gray-400 font-bold uppercase block">
                          {slice.chapter}
                        </span>
                        <h4 className="text-sm md:text-base font-bold text-[#111827]">
                          {slice.title}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                          {slice.description}
                        </p>
                      </div>

                      {/* If enrolled, launch interactive playground */}
                      {isEnrolled && (
                        <button
                          id={`chapter-interactive-trigger-${index}`}
                          onClick={() => {
                            setClassroomMode(true);
                            setClassroomTab('sandbox');
                            setActiveLessonIndex(index);
                            setTerminalOutput([`Successfully loaded classroom context for lesson: "${slice.title}"`]);
                          }}
                          className="text-xs px-3 py-1.5 bg-[#111827] text-white hover:bg-[#0070f3] transition-all rounded-lg font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-center shadow-3xs"
                        >
                          <Play className="w-3 h-3 fill-current animate-pulse" />
                          <span>Launch Sandbox</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                Meet Your Instructor
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="w-14 h-14 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs">
                  {course.instructorName.charAt(0).toUpperCase()}
                </div>
                
                <div className="space-y-1 text-xs md:text-sm">
                  <h4 id="detail-instructor-name" className="text-[#111827] font-bold text-sm tracking-tight md:text-base">
                    {course.instructorName}
                  </h4>
                  <p id="detail-instructor-title" className="text-gray-400 font-mono text-xs">
                    {course.instructorTitle}
                  </p>
                  <p className="text-gray-500 mt-2 leading-relaxed">
                    Pioneering educator in advanced code architectures and machine learning systems. Our Mountech faculty works alongside industry lead developers to verify rigorous standards.
                  </p>
                </div>
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
                    className="w-full bg-[#111827] text-white hover:bg-[#0070f3] font-bold rounded-lg text-xs transition-all py-3 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Tv2 className="w-4 h-4 text-[#38bdf8]" />
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
                  }}
                  className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Form & Loader Container processes */}
              <div className="p-6">
                
                {payStep === 'form' && (
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="text-center pb-2">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Purchasing Course</span>
                      <h3 className="text-base font-extrabold text-[#111827] line-clamp-1">{course.title}</h3>
                      <div className="text-2xl font-black text-blue-650 mt-1">${course.price}</div>
                    </div>

                    {payError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex gap-2 items-center" id="payment-error-toast">
                        <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
                        <span className="font-semibold">{payError}</span>
                      </div>
                    )}

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

                    {/* Disclaimer and secure seal */}
                    <div className="flex items-center justify-between text-[10px] text-gray-450 pt-1">
                      <span className="flex items-center gap-1">
                        🔑 256-bit SSL secure encryption
                      </span>
                      <span>Card network verified</span>
                    </div>

                    {/* Action trigger button */}
                    <button
                      type="submit"
                      disabled={paymentProcessLoading}
                      className="w-full py-3 bg-[#0070f3] hover:bg-[#0051b3] text-white rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Authorize Payment (${course.price})</span>
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
                      <h4 className="text-sm font-bold text-[#111827]">Contacting Card Issuer Bank...</h4>
                      <p className="text-xs text-gray-500 max-w-xsLeading-relaxed">
                        Establishing secure handshake protocols. Verifying 3D-Secure tokens and checking available credit balance limits.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP THREE: SECURE ENROLLMENT SUCCESS TRANSITIONS */}
                {payStep === 'success' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-[#111827]">Payment Authorization Approved! 🟢</h4>
                      <p className="text-xs text-gray-505 max-w-xs leading-relaxed">
                        Charged successfully. Synchronizing student learning path credentials securely to Google Sheets Database. Loading course workspace layers...
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

    </div>
  );
}
