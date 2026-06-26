import React, { useState, useEffect, useRef, Suspense, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Trash2, Terminal, Cpu, CheckCircle2, AlertTriangle, Sparkles, Copy, Check, Info, RefreshCw, 
  Send, Users, Video, Award, Timer, Radio, Code2, AlertCircle, ChevronRight, BookOpen, X, ArrowLeft,
  Pin, Download, Plus, Bookmark, MessageSquare, ListTodo
} from 'lucide-react';
import { LiveSession, User } from '../types';

// Lazily load the heavy Monaco-based SprintWorkspace component
const SprintWorkspace = React.lazy(() => 
  import('./SprintWorkspace').then(module => ({ default: module.SprintWorkspace }))
);

interface ClassroomTheaterProps {
  session: LiveSession;
  user: User;
  onBack: () => void;
}

interface ChatMessage {
  id: number;
  userEmail: string;
  userName: string;
  userRole: string;
  body: string;
  timestamp: string;
}

interface SolutionSubmission {
  id: number;
  challengeId: number;
  challengeTitle: string;
  studentEmail: string;
  studentName: string;
  durationSecondsTaken: number;
  submittedAt: string;
  status: 'success' | 'failure';
}

interface LiveChallenge {
  id: number;
  title: string;
  description_markdown: string;
  starter_code: string;
  duration_seconds: number;
  pushed_at: string;
}

interface PinnedQA {
  id: number;
  question: string;
  answer: string;
  author: string;
}

interface SharedSnippet {
  id: number;
  title: string;
  code: string;
  language: string;
  description: string;
}

interface OutputLine {
  type: 'log' | 'stdout' | 'stderr' | 'result' | 'status';
  text: string;
}

// ==========================================
// 1. CLASSROOM ERROR BOUNDARY IMPLEMENTATION
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ClassroomErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ClassroomErrorBoundary - ${this.props.moduleName}] Unhandled error caught:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-slate-950 border border-rose-950/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-100 tracking-tight">
              {this.props.moduleName} Module Encountered a Fault
            </h4>
            <p className="text-[11px] text-gray-400 max-w-sm leading-relaxed mx-auto">
              This sandbox runtime isolation layer successfully intercepted an execution failure. Other active modules (including live WebRTC presentation boards and feed streams) continue operating securely.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-[10px] text-indigo-400 font-bold transition-all cursor-pointer"
          >
            Reset Isolated Sandbox
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 2. MAIN CLASSROOM THEATER ENGINE
// ==========================================
export const ClassroomTheater: React.FC<ClassroomTheaterProps> = ({ session, user, onBack }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [activeChallenge, setActiveChallenge] = useState<LiveChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<SolutionSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'stream' | 'chat' | 'summary'>('stream');
  const [joinedAttendeesCount, setJoinedAttendeesCount] = useState<number>(5);

  // Lecture Study Summary compilation states
  const [pinnedQAs, setPinnedQAs] = useState<PinnedQA[]>([
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

  const [sharedSnippets, setSharedSnippets] = useState<SharedSnippet[]>([
    {
      id: 1,
      title: "JAX Simple Analytical Gradient",
      code: `import jax.numpy as jnp\nfrom jax import grad\n\ndef f(x):\n    return jnp.sin(x) / x\n\ngrad_f = grad(f)\nprint("Gradient at x=1.0:", grad_f(1.0))`,
      language: "python",
      description: "Mathematical representation of a target derivative in standard python format, reviewed by JAX compiles."
    }
  ]);

  const [summaryNotice, setSummaryNotice] = useState<string | null>(null);
  
  // Q&A inputs
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');
  const [showAddQAForm, setShowAddQAForm] = useState<boolean>(false);

  // Challenge setup states (Instructor Only)
  const [challengeTitle, setChallengeTitle] = useState<string>('Live Sprint: Naive Tokenizer');
  const [challengeDesc, setChallengeDesc] = useState<string>('Write a Python function `tokenize(text)` that splits a string by whitespace and returns a list of lowercase tokens.');
  const [challengeCode, setChallengeCode] = useState<string>(`def tokenize(text):\n    # Write your solution here\n    return text.split()\n\n# Test logic\nsample = "JAX compiles numerical grids"\nprint("Resulting tokens:", tokenize(sample))\n`);
  const [challengeDuration, setChallengeDuration] = useState<number>(120);

  // Student editor and runtime compilation states
  const [studentCode, setStudentCode] = useState<string>('');
  const [isWasmReady, setIsWasmReady] = useState<boolean>(false);
  const [isWasmRunning, setIsWasmRunning] = useState<boolean>(false);
  const [wasmStatus, setWasmStatus] = useState<string>('Python Engine Offline');
  const [outputs, setOutputs] = useState<OutputLine[]>([]);
  const [challengeTimeRemaining, setChallengeTimeRemaining] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Clipboard copies
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Ref locks
  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // -----------------------------------------------------------------
  // 3. PYODIDE WASM LAZY LOADER (Six Sigma resource control optimization)
  // -----------------------------------------------------------------
  const initPyodideWorker = () => {
    if (workerRef.current) return; // Already running

    console.log("⚙️ [Six Sigma Asset Lazy Loader] Lazily mounting Pyodide WASM sandbox Worker...");
    setWasmStatus('Initializing interpreter...');
    
    try {
      const worker = new Worker('/pyodide.worker.js');
      workerRef.current = worker;

      worker.onmessage = (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'status':
            if (msg.status === 'ready') {
              setIsWasmReady(true);
              setWasmStatus('Interpreter Ready');
            } else {
              setWasmStatus(msg.message || 'Booting environment...');
            }
            break;

          case 'stdout':
            setOutputs(prev => [...prev, { type: 'stdout', text: msg.text }]);
            break;

          case 'stderr':
            setOutputs(prev => [...prev, { type: 'stderr', text: msg.text }]);
            break;

          case 'success':
            setIsWasmRunning(false);
            if (msg.result) {
              setOutputs(prev => [...prev, { type: 'result', text: `Terminal Return:\n${msg.result}` }]);
            } else {
              setOutputs(prev => [...prev, { type: 'status', text: "Completed execution run successfully." }]);
            }
            break;

          case 'error':
            setIsWasmRunning(false);
            setOutputs(prev => [...prev, { type: 'stderr', text: `Syntax/Runtime Error:\n${msg.error}` }]);
            break;

          default:
            break;
        }
      };

      worker.onerror = (err) => {
        console.error("Pyodide web worker crash:", err);
        setWasmStatus('Interpreter Error');
        setIsWasmRunning(false);
        setOutputs(prev => [...prev, { type: 'stderr', text: "WASM Worker thread failed to respond. Resetting sandbox..." }]);
      };
    } catch (err: any) {
      console.error("Failed to spawn pyodide worker thread:", err);
      setWasmStatus('Spawning Failed');
    }
  };

  // -----------------------------------------
  // 4. WEBSOCKET SUBSCRIPTIONS & CLIENT HOOKS
  // -----------------------------------------
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log("🔌 [ClassroomTheater] Establishing main real-time telemetry link:", wsUrl);
    setConnectionStatus('connecting');

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log("✓ telemetry link online.");
      
      ws.send(JSON.stringify({
        type: "join_room",
        data: {
          liveSessionId: session.id,
          userEmail: user?.email || 'student@mountech.academy',
          userName: user?.name || 'Academic Scholar',
          userRole: user?.role || 'student'
        }
      }));

      // Set initial greeting
      setChatMessages([
        {
          id: 1,
          userEmail: 'instructor@mountech.academy',
          userName: 'Dr. Evelyn Carter',
          userRole: 'instructor',
          body: `Welcome ${user?.name || ''} to our masterclass lecture: "${session.title}". Real-time interaction, telemetry feedback, and sandbox compilation are live.`,
          timestamp: new Date(Date.now() - 30 * 1000).toISOString()
        }
      ]);
    };

    ws.onmessage = (event) => {
      const msg = event.data;
      try {
        const payload = JSON.parse(msg);
        const { type, data } = payload;

        switch (type) {
          case 'challenge_pushed': {
            const pushed: LiveChallenge = data.challenge;
            setActiveChallenge(pushed);
            setStudentCode(pushed.starter_code);
            setHasSubmitted(false);
            setSubmissionStatus('idle');
            setSecondsElapsed(0);
            
            // Lazy load the pyodide engine immediately since a coding sprint has arrived!
            initPyodideWorker();

            const startMs = new Date(pushed.pushed_at).getTime();
            const endMs = startMs + pushed.duration_seconds * 1000;
            const diffSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
            setChallengeTimeRemaining(diffSec);

            setOutputs([
              { type: 'status', text: `🚨 SPRINT CHALLENGE INITIATED: "${pushed.title}"` },
              { type: 'status', text: `Formulate a correct Python algorithm and submit before the timer expires.` }
            ]);

            // Save snippet automatically to study notes
            setSharedSnippets(prev => {
              if (prev.some(s => s.title === pushed.title)) return prev;
              return [
                ...prev,
                {
                  id: Date.now(),
                  title: pushed.title,
                  code: pushed.starter_code,
                  language: "python",
                  description: pushed.description_markdown || "Instructor pushed Live Sprint coding challenge starter code lines."
                }
              ];
            });

            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            setJoinedAttendeesCount(prev => Math.min(32, prev + Math.floor(Math.random() * 3) + 1));
            break;
          }

          case 'chat_message': {
            setChatMessages(prev => [...prev, data]);
            break;
          }

          case 'leaderboard_update': {
            setLeaderboard(data.submissions || []);
            break;
          }

          case 'challenge_ended': {
            setOutputs(prev => [...prev, { type: 'stderr', text: `⚠️ Instructor has marked this Live Sprint Challenge as closed.` }]);
            setChallengeTimeRemaining(0);
            break;
          }

          default:
            break;
        }
      } catch (e: any) {
        console.error("[ClassroomTheater] Parse error:", e);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    // Strict resource teardown to eliminate listener leaks
    return () => {
      console.log("🔌 [ClassroomTheater] Cleaning up WebSockets and active intervals...");
      if (ws) {
        ws.close();
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [session, user]);

  // Timers
  useEffect(() => {
    if (activeChallenge && challengeTimeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setChallengeTimeRemaining(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeChallenge, challengeTimeRemaining]);

  useEffect(() => {
    if (activeChallenge && challengeTimeRemaining > 0) {
      elapsedIntervalRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [activeChallenge, challengeTimeRemaining]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs]);

  // Pin / notes management
  const handlePinChatMessage = (msg: ChatMessage) => {
    if (pinnedQAs.some(q => q.question === msg.body)) {
      setSummaryNotice("This chat message is already pinned to your summary!");
      setTimeout(() => setSummaryNotice(null), 3500);
      return;
    }
    setPinnedQAs(prev => [
      ...prev,
      {
        id: Date.now(),
        question: msg.body,
        answer: "Self-notated study point from student lecture stream comments.",
        author: msg.userName
      }
    ]);
    setSummaryNotice("Comment pinned to Lecture Summary successfully!");
    setTimeout(() => setSummaryNotice(null), 3500);
  };

  const handleAddNewQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setPinnedQAs(prev => [
      ...prev,
      {
        id: Date.now(),
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        author: user.name || "Self"
      }
    ]);

    setNewQuestion('');
    setNewAnswer('');
    setShowAddQAForm(false);
    setSummaryNotice("Custom Q&A note added to your syllabus digest!");
    setTimeout(() => setSummaryNotice(null), 3000);
  };

  const handleRemoveQA = (id: number) => {
    setPinnedQAs(prev => prev.filter(q => q.id !== id));
  };

  const handleRemoveSnippet = (id: number) => {
    setSharedSnippets(prev => prev.filter(s => s.id !== id));
  };

  const handleCopySnippet = (snip: SharedSnippet) => {
    navigator.clipboard.writeText(snip.code);
    setCopiedId(snip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Student WASM run executor
  const handleRunWasm = () => {
    if (!isWasmReady || !workerRef.current) {
      initPyodideWorker();
      return;
    }
    setIsWasmRunning(true);
    setOutputs(prev => [...prev, { type: 'log', text: `>>> Running Python program sandbox...` }]);
    workerRef.current.postMessage({
      type: 'run',
      code: studentCode
    });
  };

  // Submit challenge answer back to server telemetry
  const handleSubmitChallenge = (status: 'success' | 'failure') => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !activeChallenge) return;

    socket.send(JSON.stringify({
      type: "submit_solution",
      data: {
        challengeId: activeChallenge.id,
        challengeTitle: activeChallenge.title,
        studentEmail: user.email,
        studentName: user.name,
        durationSecondsTaken: secondsElapsed,
        status: status
      }
    }));

    setHasSubmitted(true);
    setSubmissionStatus(status);
    setOutputs(prev => [...prev, { type: 'status', text: `✓ CODE SPRINT SUBMITTED: Results compiled and pushed to instructor ledger.` }]);
  };

  // Send standard chat message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: "send_chat",
      data: {
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        body: currentMessage.trim()
      }
    }));

    setCurrentMessage('');
  };

  // Push new coding challenge (Instructor Only)
  const handlePushChallenge = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: "push_challenge",
      data: {
        challenge: {
          id: Date.now(),
          title: challengeTitle,
          description_markdown: challengeDesc,
          starter_code: challengeCode,
          duration_seconds: challengeDuration,
          pushed_at: new Date().toISOString()
        }
      }
    }));

    // Local update
    setOutputs(prev => [...prev, { type: 'status', text: `📣 You pushed Live Sprint: "${challengeTitle}" to all students!` }]);
  };

  const handleEndChallenge = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "end_challenge" }));
    setActiveChallenge(null);
  };

  // Download lecture digest markdown
  const handleDownloadMarkdownDigest = () => {
    let md = `# Mountech Academy Lecture Summary Digest\n\n`;
    md += `## Course Session: ${session.title}\n`;
    md += `Instructor: Dr. Evelyn Carter\n`;
    md += `Student: ${user.name} (${user.email})\n`;
    md += `Exported: ${new Date().toLocaleString()}\n\n`;
    md += `--- \n\n`;

    md += `### 📝 Core Analytical Concept Q&As\n\n`;
    pinnedQAs.forEach((qa, idx) => {
      md += `**Q${idx + 1}: ${qa.question}**\n`;
      md += `*Answer:* ${qa.answer}\n`;
      md += `*Author:* ${qa.author}\n\n`;
    });

    md += `### 💻 Compiled Source Snippets & Sandbox Code\n\n`;
    sharedSnippets.forEach((snip) => {
      md += `#### ${snip.title}\n`;
      md += `*Description:* ${snip.description}\n\n`;
      md += `\`\`\`${snip.language}\n${snip.code}\n\`\`\`\n\n`;
    });

    md += `### 🏁 Student Performance Scorecard\n\n`;
    if (hasSubmitted) {
      md += `- Code challenge submitted successfully.\n`;
      md += `- Completion Speed: ${secondsElapsed} seconds.\n`;
      md += `- Run Status: ${submissionStatus.toUpperCase()}\n\n`;
    } else {
      md += `- No active coding submission completed in this session.\n\n`;
    }

    md += `*Compiled by Mountech Academy Live Workspace Synthesizer. Certified production grade.*`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = session.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("download", `mountech_study_summary_${cleanTitle}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isInstructor = user.role === 'admin' || user.role === 'instructor';

  return (
    <div id="classroom-theater-panel" className="bg-[#030712] border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
      
      {/* 1. Header Metadata Section */}
      <div className="bg-[#050b16] border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Exit Classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[#38bdf8] bg-blue-950/40 border border-blue-900/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                Interactive Lecture Module
              </span>
              <span className={`flex items-center gap-1 font-mono text-[8.5px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${
                connectionStatus === 'connected' ? 'bg-emerald-950/20 text-emerald-500 border-emerald-900/30' : 'bg-rose-950/20 text-rose-500 border-rose-900/30'
              }`}>
                <Radio className={`w-2.5 h-2.5 ${connectionStatus === 'connected' ? 'animate-pulse text-emerald-500' : 'text-rose-500'}`} />
                {connectionStatus === 'connected' ? 'TELEMETRY ONLINE' : 'LINK OFFLINE'}
              </span>
            </div>
            <h1 className="text-base font-black text-slate-100 tracking-tight mt-1 truncate max-w-lg">
              {session.title}
            </h1>
          </div>
        </div>

        {/* Live HUD Counters */}
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <div className="hidden sm:flex items-center gap-1.5 text-gray-400 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Attendance: <span className="text-slate-200 font-bold">{joinedAttendeesCount} Scholars</span></span>
          </div>
        </div>
      </div>

      {/* 2. Main Live Grid splits presentation and interactive panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT COLUMN: Slides presentation or active interactive challenge terminal */}
        <div className="lg:col-span-8 flex flex-col bg-[#02050b] overflow-hidden border-r border-slate-900 h-full">
          
          <div className="flex-1 relative overflow-y-auto p-6 space-y-6">
            
            <AnimatePresence mode="wait">
              {activeChallenge ? (
                // ACTIVE CODE SPRINT SANDBOX ZONE
                <motion.div
                  key="sprint-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 h-full flex flex-col"
                >
                  <div className="bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-505/10 text-indigo-400 rounded-xl">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-100 font-mono">
                          ACTIVE SPRINT: {activeChallenge.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {activeChallenge.description_markdown}
                        </p>
                      </div>
                    </div>
                    
                    {/* Reverse Timer */}
                    <div className="flex flex-col items-end shrink-0 font-mono bg-[#03060c] border border-slate-900 px-3 py-1.5 rounded-xl">
                      <span className="text-[8px] uppercase tracking-wider text-gray-500">Time Remaining</span>
                      <span className={`text-sm font-black ${challengeTimeRemaining < 20 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>
                        {Math.floor(challengeTimeRemaining / 60)}:{(challengeTimeRemaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* CODELAB LAYOUT */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-[350px]">
                    
                    {/* Monaco Code Editor (Lazy Loaded with Error Boundary) */}
                    <div className="md:col-span-7 bg-[#1e1e1e] border border-slate-900 rounded-2xl overflow-hidden h-full">
                      <ClassroomErrorBoundary moduleName="Monaco Code Sandbox">
                        <Suspense fallback={
                          <div className="h-full flex flex-col items-center justify-center space-y-3 font-mono text-[10px] text-gray-500 bg-slate-950">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                            <span>Booting Monaco Sandbox Editor...</span>
                          </div>
                        }>
                          <SprintWorkspace
                            studentCode={studentCode}
                            setStudentCode={setStudentCode}
                            hasSubmitted={hasSubmitted}
                            challengeTimeRemaining={challengeTimeRemaining}
                            isWasmReady={isWasmReady}
                            isWasmRunning={isWasmRunning}
                            wasmStatus={wasmStatus}
                            secondsElapsed={secondsElapsed}
                            onSaveToSummary={() => {
                              setSharedSnippets(prev => [
                                ...prev,
                                {
                                  id: Date.now(),
                                  title: `My Workspace Code: ${activeChallenge.title}`,
                                  code: studentCode,
                                  language: 'python',
                                  description: 'Interactive solution draft captured from active live student editor compiler.'
                                }
                              ]);
                              setSummaryNotice("Draft code snap pinned to your lecture summary note!");
                              setTimeout(() => setSummaryNotice(null), 3000);
                            }}
                            onRunWasm={handleRunWasm}
                            onSubmitChallenge={handleSubmitChallenge}
                          />
                        </Suspense>
                      </ClassroomErrorBoundary>
                    </div>

                    {/* Standard Terminal Output Log */}
                    <div className="md:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col overflow-hidden font-mono text-[11px] h-full">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] border-b border-slate-900 pb-2 mb-3">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Interactive Sandbox Output Log</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-slate-300">
                        {outputs.map((line, idx) => (
                          <div 
                            key={idx} 
                            className={`whitespace-pre-wrap leading-relaxed ${
                              line.type === 'stderr' ? 'text-rose-500 bg-rose-950/10 p-1.5 rounded border border-rose-950/20' : 
                              line.type === 'status' ? 'text-blue-400 font-bold' : 
                              line.type === 'result' ? 'text-emerald-400 bg-emerald-950/10 p-2 rounded border border-emerald-950/20' : 'text-slate-300'
                            }`}
                          >
                            {line.text}
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>

                  </div>
                </motion.div>
              ) : (
                // DEFAULT BROADCAST / PRESENTATION VIEW
                <motion.div
                  key="presentation-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 space-y-4"
                >
                  <div className="w-16 h-16 rounded-3xl bg-indigo-505/10 text-indigo-400 border border-indigo-900/20 flex items-center justify-center">
                    <Video className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
                      Live Broadcast Sync Active
                    </h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                      Please monitor the central video stream console. When your instructor pushes a live coding sprint, this dashboard will immediately route into the interactive sandbox editor workspace.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-xl">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Awaiting push channel signals...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Connection status footer notice */}
          {summaryNotice && (
            <div className="bg-indigo-950 border-t border-indigo-900/40 text-indigo-400 px-6 py-2 text-[10px] font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{summaryNotice}</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Chat console, Q&As, and Instructor tools */}
        <div className="lg:col-span-4 flex flex-col bg-[#050912] h-full overflow-hidden">
          
          {/* Section tab headers */}
          <div className="flex border-b border-slate-900 bg-[#03060c] shrink-0 font-mono text-[10px] font-bold">
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-1 py-3 text-center transition-all border-b-2 cursor-pointer ${
                activeTab === 'stream' ? 'text-indigo-400 border-indigo-500 bg-slate-950/20' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <ListTodo className="w-3.5 h-3.5" />
                <span>Lecture Feed</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center transition-all border-b-2 cursor-pointer ${
                activeTab === 'chat' ? 'text-indigo-400 border-indigo-500 bg-slate-950/20' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat ({chatMessages.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-3 text-center transition-all border-b-2 cursor-pointer ${
                activeTab === 'summary' ? 'text-indigo-400 border-indigo-500 bg-slate-950/20' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Study Summary</span>
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* TAB 1: LECTURE FEED & SCOREBOARD */}
            {activeTab === 'stream' && (
              <div className="space-y-4">
                
                {/* INSTRUCTOR HUB COMMANDS PANEL */}
                {isInstructor && (
                  <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#38bdf8]">
                        <Award className="w-4 h-4 text-[#38bdf8]" />
                        <span>Instructor Control Dashboard</span>
                      </div>
                      <span className="text-[8px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900/40 px-1 rounded uppercase font-bold">Admin</span>
                    </div>

                    <div className="space-y-3 font-mono text-[10px]">
                      <div className="space-y-1">
                        <label className="text-gray-500">Challenge Title</label>
                        <input
                          type="text"
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-slate-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-500">Challenge Description</label>
                        <textarea
                          rows={2}
                          value={challengeDesc}
                          onChange={(e) => setChallengeDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handlePushChallenge}
                          className="py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px]"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Push Challenge</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleEndChallenge}
                          className="py-2 bg-rose-950 hover:bg-rose-900 border border-rose-900/30 text-rose-250 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px]"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>End Sprint</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* REAL-TIME LEADERSHIP SCOREBOARD */}
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200">Live Sprint Leaderboard</span>
                    <span className="text-[9px] text-gray-500 uppercase font-black">Scoreboard</span>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="text-center p-6 text-[10px] font-mono text-gray-500 border border-dashed border-slate-900 rounded-xl space-y-1">
                      <Award className="w-5 h-5 mx-auto text-gray-650 opacity-40" />
                      <p>Awaiting submissions...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {leaderboard.map((sub, idx) => (
                        <div 
                          key={sub.id}
                          className="flex items-center justify-between p-2.5 bg-[#03060c] border border-slate-900 rounded-xl font-mono text-[10px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-black text-indigo-400">#{idx + 1}</span>
                            <span className="text-slate-200 font-bold truncate max-w-[120px]">{sub.studentName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-emerald-500 font-bold">{sub.durationSecondsTaken}s</span>
                            <span className={`text-[8.5px] px-1 py-0.5 rounded font-black text-slate-900 uppercase ${
                              sub.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}>{sub.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: LIVE DISCUSSION CHAT BOARD */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[65vh]">
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`p-2.5 rounded-2xl text-[11px] leading-relaxed relative group transition-all ${
                        msg.userEmail === user.email 
                          ? 'bg-indigo-950/20 border border-indigo-900/20 text-indigo-100 ml-4' 
                          : 'bg-slate-950 border border-slate-900 text-slate-100 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 mb-1">
                        <span className="font-black truncate max-w-[120px]">{msg.userName}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {msg.userRole !== 'student' && (
                            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1 rounded text-[8px] font-black uppercase tracking-wider">
                              {msg.userRole}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePinChatMessage(msg)}
                            className="opacity-0 group-hover:opacity-100 hover:text-indigo-400 transition-opacity p-0.5"
                            title="Pin message as a Concept Note in study summary notes"
                          >
                            <Pin className="w-3 h-3 text-indigo-400" />
                          </button>
                        </div>
                      </div>
                      <p>{msg.body}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Form to submit chat messages */}
                <form onSubmit={handleSendChat} className="flex gap-2 bg-[#02050b] p-1 rounded-xl border border-slate-900 shrink-0">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type comments, questions, suggestions..."
                    className="flex-1 bg-transparent border-0 ring-0 focus:outline-none px-3 text-[11px] placeholder:text-gray-600"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: STUDY SUMMARY DIGEST ARCHIVES */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                
                <div className="flex items-center justify-between shrink-0 border-b border-slate-900 pb-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200">Study Summary notes compilation</span>
                  <button
                    type="button"
                    onClick={handleDownloadMarkdownDigest}
                    className="text-[9.5px] font-bold font-mono tracking-wide text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    title="Export all compiled summaries as markdown files"
                  >
                    <Download className="w-3 h-3 text-indigo-400" />
                    <span>Download Summary (.md)</span>
                  </button>
                </div>

                {/* Pinned Concept Q&As */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-gray-500">
                    <span>CONCEPTS MEMORANDA</span>
                    <button
                      type="button"
                      onClick={() => setShowAddQAForm(!showAddQAForm)}
                      className="text-indigo-400 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-300"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Note</span>
                    </button>
                  </div>

                  {showAddQAForm && (
                    <form onSubmit={handleAddNewQA} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-3 font-mono text-[10px]">
                      <div className="space-y-1">
                        <label className="text-gray-500">Academic Query / Question</label>
                        <input
                          type="text"
                          required
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          placeholder="e.g. What is XLA Compiler compilation?"
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-500">Analytical Answer / Response</label>
                        <textarea
                          required
                          rows={2}
                          value={newAnswer}
                          onChange={(e) => setNewAnswer(e.target.value)}
                          placeholder="Write key explanation point..."
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-slate-100"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddQAForm(false)}
                          className="px-2 py-1 hover:bg-slate-900 rounded text-gray-500 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-[#38bdf8] hover:bg-sky-400 text-slate-950 font-bold rounded cursor-pointer"
                        >
                          Save Note
                        </button>
                      </div>
                    </form>
                  )}

                  {pinnedQAs.length === 0 ? (
                    <p className="text-center p-4 text-[9.5px] font-mono text-gray-500">No concept notes compiled yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {pinnedQAs.map((qa) => (
                        <div key={qa.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1 text-[10.5px]">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-200">{qa.question}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQA(qa.id)}
                              className="text-gray-500 hover:text-rose-500 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">{qa.answer}</p>
                          <span className="font-mono text-[8px] text-indigo-400 block pt-1 uppercase font-bold">Author: {qa.author}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shared Code Snippets */}
                <div className="space-y-3">
                  <div className="font-mono text-[10px] text-gray-500 uppercase tracking-wide">SOURCE SNIPPETS</div>

                  {sharedSnippets.length === 0 ? (
                    <p className="text-center p-4 text-[9.5px] font-mono text-gray-500">No source snippets logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {sharedSnippets.map((snip) => (
                        <div key={snip.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-slate-200 truncate max-w-[150px]">{snip.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(snip)}
                                className="text-gray-500 hover:text-indigo-400 p-1 cursor-pointer"
                                title="Copy snippet to clipboard"
                              >
                                {copiedId === snip.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSnippet(snip.id)}
                                className="text-gray-500 hover:text-rose-500 p-1 cursor-pointer"
                                title="Prune from studies"
                              >
                                <Trash2 className="w-3 h-3 text-rose-500" />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-gray-400">{snip.description}</p>
                          
                          <pre className="p-2.5 bg-[#03060c] rounded-lg border border-slate-900/60 font-mono text-[9.5px] text-indigo-400 overflow-x-auto whitespace-pre">
                            {snip.code}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
