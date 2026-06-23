import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import { 
  Play, Trash2, Terminal, Cpu, CheckCircle2, AlertTriangle, Sparkles, Copy, Check, Info, RefreshCw, 
  Send, Users, Video, Award, Timer, Radio, Code2, AlertCircle, ChevronRight, PlayCircle, BookOpen, X, ArrowLeft,
  Pin, Download, Plus, Bookmark
} from 'lucide-react';
import { LiveSession, User } from '../types';

interface InteractiveLiveClassroomProps {
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

export const InteractiveLiveClassroom: React.FC<InteractiveLiveClassroomProps> = ({ session, user, onBack }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [activeChallenge, setActiveChallenge] = useState<LiveChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<SolutionSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'stream' | 'chat' | 'summary'>('stream');
  const [joinedAttendeesCount, setJoinedAttendeesCount] = useState<number>(3);

  // Downloadable Lecture Study Summary States
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
  const handlePinChatMessage = (msg: ChatMessage) => {
    if (pinnedQAs.some(q => q.question === msg.body)) {
      setSummaryNotice("This chat message has already been pinned to your Lecture Summary!");
      setTimeout(() => setSummaryNotice(null), 3500);
      return;
    }
    
    setPinnedQAs(prev => [
      ...prev,
      {
        id: Date.now(),
        question: msg.body,
        answer: "Discussed and verified live during group discussion.",
        author: msg.userName
      }
    ]);
    
    setSummaryNotice("Message pinned to Lecture Study Summary!");
    setTimeout(() => setSummaryNotice(null), 3500);
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

  const handleSaveSnippetToSummary = () => {
    if (!studentCode.trim()) return;
    
    if (sharedSnippets.some(s => s.code === studentCode)) {
      setSummaryNotice("This exact code block is already in your summary notes!");
      setTimeout(() => setSummaryNotice(null), 3500);
      return;
    }

    setSharedSnippets(prev => [
      ...prev,
      {
        id: Date.now(),
        title: activeChallenge ? `My Solution: ${activeChallenge.title}` : "Interactive Sandbox Implementation Draft",
        code: studentCode,
        language: "python",
        description: activeChallenge ? `My live code draft for ${activeChallenge.title}` : "Custom Python algorithm snippet written during slide presentations"
      }
    ]);

    setSummaryNotice("Saved editor code snippet directly to Lecture Summary!");
    setTimeout(() => setSummaryNotice(null), 3550);
  };

  const handleDownloadSummary = () => {
    const timestampStr = new Date().toLocaleString();
    let md = `# Live Lecture Study Summary: ${session.title}\n\n`;
    md += `| Metadata Field | Value |\n`;
    md += `| --- | --- |\n`;
    md += `| **Session Topic** | ${session.title} |\n`;
    md += `| **Date** | ${new Date().toLocaleDateString()} |\n`;
    md += `| **Downloaded At** | ${timestampStr} |\n`;
    md += `| **Student Name** | ${user?.name || 'Academic Scholar'} (${user?.email}) |\n`;
    md += `| **Academic Room** | LSM-${session.id} |\n\n`;
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
    const sanitizedTitle = session.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("download", `lecture_summary_${sanitizedTitle}_lsm_${session.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Instructor panel fields
  const [challengeTitle, setChallengeTitle] = useState<string>('Live Sprint: Naive Tokenizer');
  const [challengeDesc, setChallengeDesc] = useState<string>('Write a Python function `tokenize(text)` that splits a string by whitespace and returns a list of lowercase tokens.');
  const [challengeCode, setChallengeCode] = useState<string>(`def tokenize(text):\n    # Write your solution here\n    return text.split()\n\n# Test logic\nsample = "JAX compiles numerical grids"\nprint("Resulting tokens:", tokenize(sample))\n`);
  const [challengeDuration, setChallengeDuration] = useState<number>(120);

  // Student active challenge details
  const [studentCode, setStudentCode] = useState<string>('');
  const [isWasmReady, setIsWasmReady] = useState<boolean>(false);
  const [isWasmRunning, setIsWasmRunning] = useState<boolean>(false);
  const [wasmStatus, setWasmStatus] = useState<string>('Loading Python interpreter...');
  const [outputs, setOutputs] = useState<{ type: 'log' | 'stdout' | 'stderr' | 'result' | 'status', text: string }[]>([]);
  const [challengeTimeRemaining, setChallengeTimeRemaining] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // References
  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const elapsedIntervalRef = useRef<any>(null);

  // Initialize WebSockets
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log("[LIVE ROOM] Connecting to Socket:", wsUrl);
    setConnectionStatus('connecting');

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log("[LIVE ROOM] Connected successfully.");
      
      // Join Room
      ws.send(JSON.stringify({
        type: "join_room",
        data: {
          liveSessionId: session.id,
          userEmail: user?.email || 'student@mountech.academy',
          userName: user?.name || 'Academic Scholar',
          userRole: user?.role || 'student'
        }
      }));

      // Send initial welcome chat messages simulated locally on first boot
      setChatMessages([
        {
          id: 1,
          userEmail: 'instructor@mountech.academy',
          userName: 'Dr. Evelyn Carter',
          userRole: 'instructor',
          body: `Welcome Scholar ${user?.name || ''} to the interactive session: "${session.title}". Active syllabus streams and hot push channels are open.`,
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
            
            // Calculate remaining ticks
            const startMs = new Date(pushed.pushed_at).getTime();
            const endMs = startMs + pushed.duration_seconds * 1000;
            const diffSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
            setChallengeTimeRemaining(diffSec);

            setOutputs([
              { type: 'status', text: `🚨 SPRINT CHALLENGE INITIATED: "${pushed.title}"` },
              { type: 'status', text: `Formulate a correct Python algorithm and submit before the timer expires.` }
            ]);

            // Save pushed live code snippet automatically to study notes summary
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

            // Sound alternative or micro vibration simulation
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            // Increase visual attendees to feel active
            setJoinedAttendeesCount(prev => Math.min(24, prev + Math.floor(Math.random() * 3) + 1));
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
        console.error("[LIVE ROOM] Parse error:", e);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      if (ws) {
        ws.close();
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [session, user]);

  // Load Pyodide WebAssembly Python Worker for student compiler
  useEffect(() => {
    // Only load wasm engine if student needs it
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
            setOutputs(prev => [...prev, { type: 'status', text: "Completed stream runs successfully." }]);
          }
          break;

        case 'error':
          setIsWasmRunning(false);
          setOutputs(prev => [...prev, { type: 'stderr', text: `Assertion Traceback:\n${msg.error}` }]);
          break;

        default:
          break;
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Timer Tick down
  useEffect(() => {
    if (activeChallenge && challengeTimeRemaining > 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setChallengeTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
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

  // Submissions Elapsed timer
  useEffect(() => {
    if (activeChallenge && challengeTimeRemaining > 0 && !hasSubmitted) {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [activeChallenge, challengeTimeRemaining, hasSubmitted]);

  // Auto Scroll Chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Auto Scroll Terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs]);

  // Send Chat message
  const handleSendChat = () => {
    if (!currentMessage.trim() || !socketRef.current || connectionStatus !== 'connected') return;

    socketRef.current.send(JSON.stringify({
      type: "chat_message",
      data: {
        body: currentMessage.trim()
      }
    }));
    setCurrentMessage('');
  };

  // Instructor: push custom challenge trigger
  const handlePushSprint = () => {
    if (!socketRef.current || connectionStatus !== 'connected') return;

    socketRef.current.send(JSON.stringify({
      type: "push_challenge",
      data: {
        liveSessionId: session.id,
        title: challengeTitle,
        description_markdown: challengeDesc,
        starter_code: challengeCode,
        duration_seconds: challengeDuration
      }
    }));
  };

  // Instructor: end sprint
  const handleEndSprint = () => {
    if (!activeChallenge || !socketRef.current || connectionStatus !== 'connected') return;

    socketRef.current.send(JSON.stringify({
      type: "end_challenge",
      data: {
        challengeId: activeChallenge.id
      }
    }));
    setActiveChallenge(null);
  };

  // Student: execute Python in Pyodide WASM
  const handleRunWasm = () => {
    if (!isWasmReady || isWasmRunning || !workerRef.current) return;

    setIsWasmRunning(true);
    setOutputs([
      { type: 'status', text: `🚀 Sandbox Instance running active student draft...` }
    ]);

    workerRef.current.postMessage({
      code: studentCode,
      id: Date.now()
    });
  };

  // Student: submit code pushed results
  const handleSubmitChallenge = (status: 'success' | 'failure') => {
    if (!activeChallenge || !socketRef.current || connectionStatus !== 'connected' || hasSubmitted) return;

    // Send code submit
    socketRef.current.send(JSON.stringify({
      type: "submit_solution",
      data: {
        challengeId: activeChallenge.id,
        durationSecondsTaken: secondsElapsed,
        status: status,
        submittedCode: studentCode
      }
    }));

    setHasSubmitted(true);
    setSubmissionStatus(status);
    setOutputs(prev => [
      ...prev,
      { type: 'result', text: `🎉 Challenge solution dispatched with status: ${status.toUpperCase()}! Your sprint score recorded in ${secondsElapsed}s.` }
    ]);
  };

  // Quick select a template for Instructor panel
  const handleLoadInstructorTemplate = (type: 'list' | 'factorial' | 'tokenizer') => {
    if (type === 'factorial') {
      setChallengeTitle("Mathematical Recursion: Factorial");
      setChallengeDesc("Build a pure recursive function `factorial(n)` that returns the factorial computation of integers $n$. Ensure to prevent infinite execution overflows.");
      setChallengeCode(`def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)\n\n# Verification test\nprint("Factorial of 5 (Should be 120):", factorial(5))\n`);
    } else if (type === 'list') {
      setChallengeTitle("Dynamic Array Filter Sieve");
      setChallengeDesc("Formulate a Python function `filter_even(numbers)` that returns a list of only even integers without mutating original arguments.");
      setChallengeCode(`def filter_even(numbers):\n    # Filter elements\n    return [n for n in numbers if n % 2 == 0]\n\n# Verification test\nprint(filter_even([12, 15, 22, 19, 45, 50]))\n`);
    } else {
      setChallengeTitle("Whitespace Tokenizer");
      setChallengeDesc("Write a clean function `tokenize(words)` that returns custom lowercase strings mapped without excessive character splits.");
      setChallengeCode(`def tokenize(words):\n    return [w.lower() for w in words.strip().split()]\n\nprint(tokenize("JAX Compiles Complex Arrays"))\n`);
    }
  };

  // Formatter for seconds
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isStaff = user?.role === 'admin' || user?.role === 'instructor';

  return (
    <div className="bg-[#030712] rounded-3xl border border-slate-900 overflow-hidden font-sans shadow-2xl relative select-none" id="interactive-live-classroom-suite">
      
      {/* Top Banner & Status Header */}
      <div className="bg-[#090f1e] px-6 py-4 border-b border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title="Leave Classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-rose-500/10 border border-rose-500/25 text-rose-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE STREAM
              </span>
              <h2 className="text-sm font-black text-slate-100 tracking-tight">{session.title}</h2>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 font-mono">Academic Registry Room ID: LSM-{session.id}</p>
          </div>
        </div>

        {/* Action Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-900 text-xs">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-200 font-mono font-bold">{joinedAttendeesCount} Students joined</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/85 px-3 py-1.5 rounded-lg border border-slate-900 text-xs text-gray-400">
            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-[10px] font-mono tracking-wider">
              {connectionStatus === 'connected' ? 'SECURE SOCKET' : 'RECONNECTING'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px] relative">
        
        {/* LEFT COLUMN: Presentation Mock Terminal / Student Live Chat Box (5 Columns) */}
        <div className="lg:col-span-5 bg-[#050a14] border-r border-slate-900 flex flex-col justify-between">
          <div>
            {/* Tabs selectors */}
            <div className="flex border-b border-slate-900 p-2.5 gap-2 bg-slate-950 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('stream')}
                className={`flex-1 py-1.5 px-2.5 text-[11px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 border shrink-0 ${
                  activeTab === 'stream'
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/40 shadow-sm'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Slide
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 px-2.5 text-[11px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 border shrink-0 relative ${
                  activeTab === 'chat'
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/40 shadow-sm'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Discussion
                {chatMessages.length > 0 && activeTab !== 'chat' && (
                  <span className="absolute right-3 top-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-1.5 px-2.5 text-[11px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 border shrink-0 relative ${
                  activeTab === 'summary'
                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/40 shadow-sm font-black'
                    : 'bg-transparent text-gray-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" /> Lecture Summary
                {pinnedQAs.length + sharedSnippets.length > 0 && (
                  <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full text-center">
                    {pinnedQAs.length + sharedSnippets.length}
                  </span>
                )}
              </button>
            </div>

            {/* Presentation Slide View */}
            {activeTab === 'stream' && (
              <div className="p-4 flex flex-col gap-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-900 flex items-center justify-center group">
                  {/* Dynamic background effect as lecture slide */}
                  <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-rose-500/10 h-full w-full pointer-events-none opacity-40 animate-pulse" />
                  
                  {/* Styled presentation layout */}
                  <div className="text-center p-6 space-y-4">
                    <BookOpen className="w-12 h-12 text-indigo-500/45 mx-auto animate-bounce" />
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#38bdf8] font-black">PRESENTER STREAM BOARD</span>
                      <h3 className="text-sm font-bold text-slate-105">Chapter 4.5: Analytical JAX Gradients</h3>
                      <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                        Slide 12: Exploring numerical limitations in backward compilation models.
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-left font-mono text-[10px] text-indigo-300 w-full max-w-sm mx-auto leading-normal">
                      <span className="text-emerald-400">import</span> jax.numpy <span className="text-emerald-400">as</span> jnp<br />
                      <span className="text-emerald-400">from</span> jax <span className="text-emerald-400">import</span> grad<br /><br />
                      <span className="text-amber-400">def</span> <span className="text-indigo-400">f</span>(x):<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-400">return</span> jnp.sin(x) / x
                    </div>
                  </div>

                  <span className="absolute bottom-3 left-3 bg-[#030712]/90 border border-slate-900 text-[9px] font-mono px-2 py-0.5 rounded text-gray-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Camera 01 (Virtual Slide)
                  </span>
                </div>

                <div className="p-3.5 bg-[#0a1120] border border-indigo-950/40 rounded-xl space-y-1">
                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-bold">Lecture Directives</span>
                  <p className="text-[11px] text-slate-350 leading-relaxed">
                    Welcome to the Interactive Slide Console. Keep your browser active. When the instructor pushes a real-time challenge, a modal will load in and sync your terminal performance stats instantly!
                  </p>
                </div>
              </div>
            )}

            {/* Chat discussion view */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[340px] justify-between">
                <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 max-h-[280px]">
                  {chatMessages.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic text-center py-6">Discussion thread is empty. Say hello!</p>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.userEmail === user?.email;
                      const isInstr = msg.userRole === 'instructor' || msg.userRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono mb-0.5">
                            <span className={isInstr ? "text-indigo-400 font-extrabold" : "text-gray-400"}>
                              {msg.userName}
                            </span>
                            {isInstr && (
                              <span className="bg-indigo-950/60 border border-indigo-500/20 text-[8px] text-indigo-400 px-1 rounded font-bold uppercase">
                                Staff
                              </span>
                            )}
                          </div>
                          <div className={`p-2.5 rounded-xl text-xs max-w-sm leading-normal break-words border ${
                            isMe 
                              ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' 
                              : isInstr
                                ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-100 rounded-tl-none'
                                : 'bg-slate-900 border-slate-850 text-slate-300 rounded-tl-none'
                          }`}>
                            {msg.body}
                          </div>
                          
                          {/* Easy action to Pin Question to Study Guide Summary */}
                          <button
                            onClick={() => handlePinChatMessage(msg)}
                            type="button"
                            className="mt-1 text-[9px] text-[#38bdf8] hover:text-[#0ea5e9] hover:underline cursor-pointer flex items-center gap-1 transition-all font-mono"
                            title="Pin this discussion note to study summary sheet"
                          >
                            <Pin className="w-2.5 h-2.5 rotate-45 text-[#38bdf8]" />
                            <span>Pin to Q&A Notes</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Send action bar */}
                <div className="p-2 border-t border-slate-900 flex items-center bg-slate-950 gap-2">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Type live lecture query..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs px-3.5 py-1.5 text-slate-150 focus:outline-none placeholder-gray-601"
                  />
                  <button
                    onClick={handleSendChat}
                    className="p-1 px-3 bg-indigo-600 hover:bg-indigo-500 transition-colors border border-indigo-505/20 text-white rounded-xl text-xs flex items-center justify-center cursor-pointer font-bold"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* Lecture Study Summary Tab panel */}
            {activeTab === 'summary' && (
              <div className="flex flex-col h-[340px] justify-between">
                <div className="flex-1 p-3.5 overflow-y-auto space-y-4 max-h-[340px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  
                  {/* Feedback toast banner inline */}
                  <AnimatePresence>
                    {summaryNotice && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-2 bg-emerald-950/60 border border-emerald-500/25 rounded-lg text-center text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{summaryNotice}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top Companion Banner Card */}
                  <div className="p-3 bg-gradient-to-br from-indigo-950/20 to-slate-950 border border-indigo-950/40 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5 shadow">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-[#38bdf8]">Automatic Study Companion</span>
                      <h4 className="text-xs font-bold text-slate-100">Study Summary & Markdown Compiler</h4>
                      <p className="text-[10px] text-gray-400 leading-snug max-w-xs">
                        Tracks pinned class questions, staff responses, and mathematical code. Export a beautifully formatted Study Sheet (.md) on demand!
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadSummary}
                      type="button"
                      className="w-full py-2 bg-indigo-600 hover:bg-[#4f46e5] text-white font-mono font-bold text-[11px] rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 tracking-wider shadow"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download Study Summary (.md)</span>
                    </button>
                  </div>

                  {/* Pinned Q&A List block */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase font-black flex items-center gap-1">
                        <Pin className="w-3 h-3 text-indigo-400 rotate-45" /> Pinned Q&A ({pinnedQAs.length})
                      </span>
                      <button
                        onClick={() => setShowAddQAForm(!showAddQAForm)}
                        className="text-[9px] font-mono text-[#38bdf8] hover:text-[#0ea5e9] hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Q&A Entry</span>
                      </button>
                    </div>

                    {showAddQAForm && (
                      <form onSubmit={handleAddNewQA} className="p-3 bg-slate-950 border border-slate-900 rounded-lg space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-gray-400 uppercase block font-semibold">Question</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. What is gradient descent in JAX?"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-505 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-gray-400 uppercase block font-semibold">Answer Details</label>
                          <textarea
                            placeholder="Enter the corresponding solution notes..."
                            value={newAnswer}
                            rows={2}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-505 font-mono"
                          />
                        </div>
                        <div className="flex justify-end gap-2 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setShowAddQAForm(false)}
                            className="px-2 py-1 text-gray-500 hover:text-white ml-auto cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-bold cursor-pointer"
                          >
                            Add Note
                          </button>
                        </div>
                      </form>
                    )}

                    {pinnedQAs.length === 0 ? (
                      <p className="text-[9.5px] font-mono text-gray-500 italic p-2 bg-slate-950/40 border border-dashed border-slate-900/60 rounded">No pinned discussions yet. Pin messages from the Group Discussion tab!</p>
                    ) : (
                      <div className="space-y-2">
                        {pinnedQAs.map((item) => (
                          <div key={item.id} className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg space-y-1.5 group relative">
                            <button
                              onClick={() => handleRemoveQA(item.id)}
                              type="button"
                              className="absolute top-2 right-2 text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                              title="Delete QA item from notes"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-start gap-1">
                              <span className="text-[10px] font-mono font-bold text-indigo-400 shrink-0">Q:</span>
                              <p className="text-xs text-slate-200 leading-normal font-bold font-sans">{item.question}</p>
                            </div>
                            <div className="flex items-start gap-1 border-t border-slate-950 pt-1.5 mt-1.5">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">A:</span>
                              <p className="text-[11px] text-slate-300 leading-normal font-mono font-medium">{item.answer}</p>
                            </div>
                            <span className="text-[8px] font-mono text-gray-500 mt-1 block">Speaker: {item.author}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Core Snippets block */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase font-black block border-b border-slate-900 pb-1.5">
                      💻 Shared Code Scribes ({sharedSnippets.length})
                    </span>

                    {sharedSnippets.length === 0 ? (
                      <p className="text-[9.5px] font-mono text-gray-550 italic p-2 bg-slate-950/40 border border-dashed border-slate-900/60 rounded">No snippets shared. Use the "Save to Summary" key directly under your Python coding editor workspace!</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {sharedSnippets.map((snippet) => (
                          <div key={snippet.id} className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg space-y-1.5 relative group">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-200 font-sans tracking-tight">{snippet.title}</span>
                              <span className="text-[8px] font-mono text-indigo-400 font-bold uppercase bg-indigo-950/40 px-1 border border-indigo-900/20 rounded">{snippet.language}</span>
                            </div>
                            {snippet.description && (
                              <p className="text-[9.5px] text-gray-400 leading-relaxed italic">{snippet.description}</p>
                            )}
                            <pre className="p-2 bg-[#090f1e] rounded border border-slate-900 font-mono text-[9px] text-cyan-400 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-[140px]">
                              {snippet.code}
                            </pre>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(snippet.code);
                                setSummaryNotice("Snippet code copied directly to clipboard!");
                                setTimeout(() => setSummaryNotice(null), 3000);
                              }}
                              type="button"
                              className="text-[9px] text-[#38bdf8] hover:underline cursor-pointer flex items-center gap-0.5 mt-1 font-mono transition-all"
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
              </div>
            )}
          </div>

          {/* Connected attendees list in sidebar */}
          <div className="bg-[#030711] border-t border-slate-900 p-3.5">
            <span className="text-[9px] tracking-wider uppercase font-mono text-gray-500 block mb-2 font-bold">Class List & Online Attendees</span>
            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
              {['Gaurav R.', 'Amit K.', 'Nisha P.', 'Jhanak P.', 'Safal M.', 'Sushil T.'].map((att, i) => (
                <span key={i} className="text-[10px] font-mono bg-slate-950 border border-slate-950/80 hover:border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-semibold select-all">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" /> {att}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Active "Code Push" Sprint workspace (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full bg-[#02050c]">
          
          {/* Main workspace section */}
          <div className="flex-1 flex flex-col">
            
            {/* If NO active challenge exists */}
            {!activeChallenge ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-900 animate-pulse mb-4">
                  <Code2 className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">Standard Broadcast Channel Active</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
                  The session is currently in lecture mode. When an instructor launches a "Code Push" sprint to students, the live lab workspace compiler wraps inside this area instantly!
                </p>

                {/* If Instructor: offer Control Console */}
                {isStaff && (
                  <div className="mt-8 border border-indigo-950/40 bg-indigo-950/15 p-5 rounded-2xl w-full max-w-md text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-indigo-300 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        Instructor Sprint Console
                      </h4>
                      <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                        Master Access
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <label className="text-gray-400">Sprint Title</label>
                        <input
                          type="text"
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          className="bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-2 py-0.5 text-slate-300 ml-auto w-full max-w-xs focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <label className="text-gray-400">Duration (Secs)</label>
                        <input
                          type="number"
                          value={challengeDuration}
                          onChange={(e) => setChallengeDuration(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-2 py-0.5 text-slate-300 ml-auto w-full max-w-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-between gap-1 pt-1 text-[9px] font-mono">
                        <button
                          onClick={() => handleLoadInstructorTemplate('factorial')}
                          className="text-indigo-400 hover:underline cursor-pointer"
                        >
                          [Load Factorial]
                        </button>
                        <button
                          onClick={() => handleLoadInstructorTemplate('list')}
                          className="text-indigo-400 hover:underline cursor-pointer"
                        >
                          [Load Even-Filter]
                        </button>
                        <button
                          onClick={() => handleLoadInstructorTemplate('tokenizer')}
                          className="text-indigo-400 hover:underline cursor-pointer"
                        >
                          [Load Tokenizer]
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-gray-500 uppercase block">STARTER IMPLEMENTATION LINES</label>
                      <textarea
                        value={challengeCode}
                        onChange={(e) => setChallengeCode(e.target.value)}
                        rows={3}
                        className="w-full bg-[#111] font-mono text-[10px] p-2 border border-slate-900 focus:border-indigo-500 outline-none text-indigo-300 rounded"
                      />
                    </div>

                    <button
                      onClick={handlePushSprint}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono tracking-wide rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Radio className="w-4 h-4 text-white animate-pulse" /> PUSH SPRINT TO STUDENTS NOW
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ACTIVE CHALLENGE WORKSPACE */
              <div className="flex-1 flex flex-col h-full bg-[#050a14] border-b border-slate-900">
                
                {/* Active challenge summary bar */}
                <div className="bg-[#0b1222] p-4 border-b border-slate-900 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-rose-400 uppercase tracking-widest font-black block animate-pulse">🔴 LIVE SPRINTS ACTIVE NOW</span>
                    <h4 className="text-xs font-black text-white">{activeChallenge.title}</h4>
                    <p className="text-[10px] text-gray-400 italic font-mono">{activeChallenge.description_markdown}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live countdown timer */}
                    <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-900 flex items-center gap-2 select-none">
                      <Timer className={`w-3.5 h-3.5 ${challengeTimeRemaining < 20 ? 'text-rose-500 animate-ping' : 'text-indigo-400 animate-pulse'}`} />
                      <span className={`font-mono text-xs font-black ${challengeTimeRemaining < 20 ? 'text-rose-500' : 'text-slate-100'}`}>
                        {formatTime(challengeTimeRemaining)}
                      </span>
                    </div>

                    {isStaff && (
                      <button
                        onClick={handleEndSprint}
                        className="px-2.5 py-1.5 bg-rose-950/30 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Force End
                      </button>
                    )}
                  </div>
                </div>

                {/* Challenge instructions, leaderboard and workspace core split */}
                <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[300px]">
                  
                  {/* Left core column: Monaco lines editor (8 columns) */}
                  <div className="md:col-span-8 flex flex-col justify-between border-r border-slate-900 h-full">
                    
                    {/* Toolbar actions */}
                    <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between border-b border-slate-900 text-[10px] font-mono">
                      <span className="text-gray-500">Student Editor Compiler Terminal</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isWasmReady ? 'bg-emerald-500' : 'bg-amber-500 animate-bounce'}`} />
                        <span className="text-indigo-400 text-[9px] uppercase font-bold tracking-wider">{wasmStatus}</span>
                      </div>
                    </div>

                    <div className="flex-1 relative bg-[#1e1e1e] min-h-[220px]">
                      <Editor
                        height="100%"
                        language="python"
                        theme="vs-dark"
                        value={studentCode}
                        onChange={(v) => setStudentCode(v || '')}
                        options={{
                          fontSize: 12,
                          fontFamily: '"JetBrains Mono", Consolas, monospace',
                          minimap: { enabled: false },
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          readOnly: hasSubmitted || challengeTimeRemaining === 0
                        }}
                      />
                    </div>

                    {/* Student execution control bar */}
                    <div className="bg-[#03060c] p-2.5 flex items-center justify-between gap-2 border-t border-slate-900">
                      <span className="text-[9px] font-mono text-slate-500">Sprints elapsed: {secondsElapsed}s</span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveSnippetToSummary}
                          type="button"
                          className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 hover:border-slate-800 text-slate-450 hover:text-indigo-400 rounded text-[9.5px] font-bold font-mono tracking-wide flex items-center gap-1 transition-all cursor-pointer border border-slate-900"
                          title="Record your active code block into the Study Summary compilation"
                        >
                          <Bookmark className="w-3 h-3 text-indigo-400" />
                          <span>Save to Summary</span>
                        </button>

                        <button
                          disabled={!isWasmReady || isWasmRunning || challengeTimeRemaining === 0}
                          onClick={handleRunWasm}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-505/30 text-indigo-400 hover:text-indigo-300 rounded text-[10px] font-bold font-mono tracking-wide flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {isWasmRunning ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 text-indigo-400" />
                          )}
                          <span>Run Diagnostic</span>
                        </button>

                        <button
                          disabled={hasSubmitted || challengeTimeRemaining === 0}
                          onClick={() => handleSubmitChallenge('success')}
                          className={`px-3 py-1.5 border font-bold text-[10px] font-mono tracking-wide rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-transform ${
                            hasSubmitted 
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-500' 
                              : 'bg-indigo-600 border-indigo-500 shadow-md hover:bg-indigo-505 text-white active:scale-95'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>{hasSubmitted ? 'Submitted' : 'Submit Code'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right core column: Real-Time Sprint Leaderboard (4 columns) */}
                  <div className="md:col-span-4 bg-[#030712] p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-[9.5px] uppercase font-mono tracking-wider text-amber-400 font-extrabold block">Live Sprint Leaderboard</span>
                      </div>

                      <div className="space-y-1 max-h-[220px] overflow-y-auto">
                        {leaderboard.length === 0 ? (
                          <div className="p-4 rounded border border-dashed border-slate-900/60 text-center py-8">
                            <RefreshCw className="w-4 h-4 text-gray-600 mx-auto mb-1.5 animate-spin" />
                            <p className="text-[10px] text-gray-500">Awaiting first solutions submission...</p>
                          </div>
                        ) : (
                          leaderboard.map((sub, i) => {
                            const isUser = sub.studentEmail === user?.email;
                            const medalColor = i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-350' : i === 2 ? 'text-amber-600' : 'text-slate-500';
                            return (
                              <div
                                key={sub.id}
                                className={`p-2 rounded border text-[10px] font-mono leading-tight flex items-center justify-between gap-1.5 ${
                                  isUser 
                                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300 font-bold' 
                                    : 'bg-slate-950 border-slate-900 text-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`font-bold shrink-0 text-center w-3.5 ${medalColor}`}>
                                    {i + 1}
                                  </span>
                                  <span className="truncate" title={sub.studentName}>{sub.studentName}</span>
                                </div>
                                <span className="font-semibold text-[9px] text-[#38bdf8] shrink-0 font-mono tracking-tighter">
                                  {sub.durationSecondsTaken}s
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Quick guidelines footer */}
                    <div className="p-2 bg-slate-950 border border-slate-900 rounded-lg text-[9px] text-gray-500 leading-snug">
                      <span className="font-bold text-slate-400 mb-0.5 block">Rules:</span>
                      1. Solve code pushing requirements.<br />
                      2. Submit early for gold tiers.
                    </div>
                  </div>

                </div>

                {/* Submissions results box */}
                <div className="bg-[#03060d] border-t border-slate-900 p-3 h-[100px] overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 whitespace-pre-wrap selection:bg-indigo-500/20">
                  {outputs.length === 0 ? (
                    <div className="text-gray-600 italic">Playground outputs and compilations will print here on trigger.</div>
                  ) : (
                    outputs.map((out, idx) => {
                      let colorClass = 'text-slate-300';
                      if (out.type === 'stdout') colorClass = 'text-cyan-400';
                      if (out.type === 'stderr') colorClass = 'text-rose-400 font-bold';
                      if (out.type === 'result') colorClass = 'text-emerald-400 border border-emerald-950/40 bg-emerald-950/10 p-1.5 rounded-lg';
                      if (out.type === 'status') colorClass = 'text-indigo-400 font-bold';

                      return (
                        <div key={idx} className={`${colorClass} leading-snug font-mono`}>
                          {out.text}
                        </div>
                      );
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Info status footer */}
      <div className="bg-[#050a14] border-t border-slate-900 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-505 selection:bg-indigo-500/20 select-none">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Interactive classroom websocket sockets linked dynamically. Solves sync in-memory & SQLite lists.</span>
        </span>
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-mono font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          Leave Live Session room <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
