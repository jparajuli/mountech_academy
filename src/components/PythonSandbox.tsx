import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Trash2, RotateCcw, FileCode, Terminal, Cpu, 
  CheckCircle2, AlertTriangle, Sparkles, Copy, Check, Info, RefreshCw,
  FilePlus, FolderOpen, Save, CloudUpload, CloudDownload, LogIn, LogOut, ClipboardList, BookOpen, ChevronDown, CheckSquare
} from 'lucide-react';
import { fetchLessonProblems, LessonProblem } from '../api';
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase';

interface PythonSandboxProps {
  lessonId?: number | null;
  onSaveToSummary?: (code: string, title?: string) => void;
  initialCode?: string;
}

interface CodeTemplate {
  name: string;
  description: string;
  code: string;
}

const TEMPLATES: Record<string, CodeTemplate> = {
  fibonacci: {
    name: "Fibonacci Sequence",
    description: "Generate and benchmark a Fibonacci sequence builder.",
    code: `# Mountech Academy - Python Sandbox
# Lesson Concept: Iterative Benchmarking & Functions

def generate_fibonacci(limit):
    """Generates Fibonacci numbers up to the limit counter."""
    print(f"[Run] Compiling Fibonacci series up to index {limit}...")
    sequence = [0, 1]
    while len(sequence) < limit:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:limit]

# Execute and capture print streams
terms = 12
results = generate_fibonacci(terms)
print(f"[Done] Complete series: {results}")

# Evaluate expressions
f"First {terms} Fibonacci numbers calculated successfully!"
`
  },
  primes: {
    name: "Prime Number Sieve",
    description: "Find prime numbers using the Sieve of Eratosthenes algorithm.",
    code: `# Mountech Academy - Python Sandbox
# Lesson Concept: Array Algorithms & List Comprehensions

def find_primes(n):
    """Finds all prime numbers up to n using Sieve of Eratosthenes."""
    print(f"[Sieve] Commencing search for all prime numbers <= {n}...")
    sieve = [True] * (n + 1)
    primes = []
    for p in range(2, n + 1):
        if sieve[p]:
            primes.append(p)
            for i in range(p * p, n + 1, p):
                sieve[i] = False
    return primes

limit = 50
primes_list = find_primes(limit)
print(f"[Result] Found {len(primes_list)} prime numbers: {primes_list}")

f"Successfully identified {len(primes_list)} primes under {limit}!"
`
  },
  data_analysis: {
    name: "Basic Data Analysis",
    description: "Calculate standard descriptive stats (mean, median, variance).",
    code: `# Mountech Academy - Python Sandbox
# Lesson Concept: Pure Python Math & Aggregations

data_points = [22, 18, 35, 42, 28, 50, 61, 39, 45, 33, 29, 52]

def calculate_stats(numbers):
    n = len(numbers)
    if n == 0:
        return {}
    
    mean = sum(numbers) / n
    sorted_num = sorted(numbers)
    median = sorted_num[n // 2] if n % 2 != 0 else (sorted_num[n // 2 - 1] + sorted_num[n // 2]) / 2
    
    variance = sum((x - mean) ** 2 for x in numbers) / n
    std_dev = variance ** 0.5
    
    print(f"[Stats] Feed loaded with {n} sample data points.")
    return {
        "count": n,
        "mean": round(mean, 2),
        "median": median,
        "std_dev": round(std_dev, 3)
    }

metrics = calculate_stats(data_points)
for key, value in metrics.items():
    print(f" - {key.replace('_', ' ').capitalize()}: {value}")

f"Descriptive metadata analysis complete."
`
  },
  sorting_algo: {
    name: "Quick Sort Implementation",
    description: "Witness standard recursive sorting with verbose array state logs.",
    code: `# Mountech Academy - Python Sandbox
# Lesson Concept: Divide and Conquer Algorithms

def quick_sort(arr, depth=0):
    indent = "  " * depth
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    print(f"{indent}[Sort] Pivot {pivot}: splitting array into lists of lengths {len(left)}, {len(middle)}, {len(right)}")
    
    return quick_sort(left, depth + 1) + middle + quick_sort(right, depth + 1)

unordered = [34, 7, 23, 32, 5, 62, 19, 4, 12, 45]
print(f"[Input] Unsorted inventory: {unordered}")

sorted_result = quick_sort(unordered)
print(f"[Output] Ascending custom order: {sorted_result}")

f"Array recursion sorted."
`
  }
};

export const PythonSandbox: React.FC<PythonSandboxProps> = ({ lessonId, onSaveToSummary, initialCode }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('fibonacci');
  const [code, setCode] = useState<string>(initialCode || TEMPLATES.fibonacci.code);

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);
  const [outputs, setOutputs] = useState<{ type: 'log' | 'stdout' | 'stderr' | 'result' | 'status', text: string }[]>([
    { type: 'status', text: "Python sandbox initialized. Press 'Run Code' to execute." }
  ]);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<string>("Initializing Python WebAssembly runtime...");

  // Chapter-specific problems state
  const [problems, setProblems] = useState<LessonProblem[]>([]);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<'instructions' | 'templates'>('instructions');

  // File tracking state
  const [fileName, setFileName] = useState<string>('main.py');
  const [isModified, setIsModified] = useState<boolean>(false);

  // Google Drive scopes Integration state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleDriveFileId, setGoogleDriveFileId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [loadLoading, setLoadLoading] = useState<boolean>(false);
  const [googleScriptsLoaded, setGoogleScriptsLoaded] = useState<boolean>(false);

  // Workspace references
  const workerRef = useRef<Worker | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Load Google API Scripts
  useEffect(() => {
    let gapiLoaded = false;
    let gsiLoaded = false;

    const checkScriptsLoaded = () => {
      if (gapiLoaded && gsiLoaded) {
        setGoogleScriptsLoaded(true);
      }
    };

    // Load GAPI
    if ((window as any).gapi) {
      gapiLoaded = true;
    } else {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        gapiLoaded = true;
        checkScriptsLoaded();
      };
      document.body.appendChild(gapiScript);
    }

    // Load GSI client
    if ((window as any).google?.accounts) {
      gsiLoaded = true;
    } else {
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      gsiScript.onload = () => {
        gsiLoaded = true;
        checkScriptsLoaded();
      };
      document.body.appendChild(gsiScript);
    }

    // Ensure we periodically verify if already in scope
    checkScriptsLoaded();
  }, []);

  // Fetch chapter-specific problems when lessonId changes
  useEffect(() => {
    if (lessonId) {
      fetchLessonProblems(lessonId)
        .then((res) => {
          if (res && res.problems && res.problems.length > 0) {
            setProblems(res.problems);
            setSelectedProblemIndex(0);
            setCode(res.problems[0].starter_code);
            setFileName(`exercise_${res.problems[0].id}.py`);
            setIsModified(false);
            setGoogleDriveFileId(null);
            setOutputs([
              { type: 'status', text: `Loaded workspace Chapter Challenge: "${res.problems[0].title}".` },
              { type: 'status', text: `Write code in the editor, and click 'Run Script' to verify execution.` }
            ]);
            setActiveTab('instructions');
          } else {
            setProblems([]);
            setSelectedProblemIndex(-1);
            setActiveTab('templates');
          }
        })
        .catch((err) => {
          console.error("Failed to load active lesson problems:", err);
          setProblems([]);
          setSelectedProblemIndex(-1);
          setActiveTab('templates');
        });
    } else {
      setProblems([]);
      setSelectedProblemIndex(-1);
      setActiveTab('templates');
    }
  }, [lessonId]);

  // Load Pyodide Worker from the public asset directory
  useEffect(() => {
    const worker = new Worker('/pyodide.worker.js');
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'status':
          if (msg.status === 'ready') {
            setIsEngineReady(true);
            setOutputs(prev => [...prev, { type: 'status', text: `✨ Python Engine connected! Standard Libraries & micropip pre-loaded.` }]);
          } else {
            setEngineStatus(msg.message || "Booting environment...");
            if (msg.status === 'initializing') {
              setOutputs(prev => [...prev, { type: 'status', text: `⚙️ ${msg.message}` }]);
            }
          }
          break;

        case 'stdout':
          setOutputs(prev => [...prev, { type: 'stdout', text: msg.text }]);
          break;

        case 'stderr':
          setOutputs(prev => [...prev, { type: 'stderr', text: msg.text }]);
          break;

        case 'success':
          setIsRunning(false);
          if (msg.result) {
            setOutputs(prev => [...prev, { type: 'result', text: `Returned Value:\n${msg.result}` }]);
          } else {
            setOutputs(prev => [...prev, { type: 'status', text: "Execution finished with no returned value." }]);
          }
          break;

        case 'error':
          setIsRunning(false);
          setOutputs(prev => [...prev, { type: 'stderr', text: `Traceback Error:\n${msg.error}` }]);
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

  // Scroll terminal to base
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs]);

  // Run python script inside Pyodide WebAssembly
  const handleRunCode = () => {
    if (!isEngineReady || isRunning || !workerRef.current) return;

    setIsRunning(true);
    setOutputs([
      { type: 'status', text: `🚀 Spawning instance sandbox execution run (${fileName})...` }
    ]);

    workerRef.current.postMessage({
      code: code,
      id: Date.now()
    });
  };

  const handleClearTerminal = () => {
    setOutputs([{ type: 'status', text: "Console terminal output cleared." }]);
  };

  const handleResetCode = () => {
    if (window.confirm("Are you sure you want to revert all local workspace code? It will replace current editor lines.")) {
      if (selectedProblemIndex !== -1 && problems[selectedProblemIndex]) {
        setCode(problems[selectedProblemIndex].starter_code);
        setOutputs(prev => [
          ...prev, 
          { type: 'status', text: `Reverted to seeded chapter starter code for "${problems[selectedProblemIndex].title}"` }
        ]);
      } else {
        const currentCode = TEMPLATES[selectedTemplate]?.code || TEMPLATES.fibonacci.code;
        setCode(currentCode);
        setOutputs(prev => [
          ...prev, 
          { type: 'status', text: `Code reset to standard '${TEMPLATES[selectedTemplate]?.name || 'Fibonacci'}' template.` }
        ]);
      }
      setIsModified(false);
    }
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplate(key);
    setSelectedProblemIndex(-1);
    setCode(TEMPLATES[key].code);
    setIsModified(false);
    setOutputs(prev => [
      ...prev,
      { type: 'status', text: `Selected default playground template: '${TEMPLATES[key].name}'.` }
    ]);
  };

  const handleSelectProblem = (idx: number) => {
    if (problems[idx]) {
      setSelectedProblemIndex(idx);
      setSelectedTemplate('');
      setCode(problems[idx].starter_code);
      setFileName(`exercise_${problems[idx].id}.py`);
      setIsModified(false);
      setOutputs(prev => [
        ...prev,
        { type: 'status', text: `Cleared environment. Loaded Active Challenge: "${problems[idx].title}".` }
      ]);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Google OAuth Drive Access Token requester
  const handleGoogleSignIn = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    try {
      if (!auth) {
        throw new Error("Mountech Academy database authentication system is offline.");
      }
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        setOutputs(prev => [...prev, { type: 'status', text: "✅ Linked student Google Drive workspace successfully!" }]);
        return credential.accessToken;
      } else {
        throw new Error("No OAuth accessToken returned in Firebase credential schema.");
      }
    } catch (err: any) {
      console.warn("Failed automatic Google Sign in SDK popup:", err);
      // fallback manual input string bypass
      const manualToken = window.prompt("Google Login popup was blocked or could not resolve. To bypass local iframe restrictions, please paste a valid Google Access Token, or leave blank to cancel:");
      if (manualToken) {
        setAccessToken(manualToken);
        setOutputs(prev => [...prev, { type: 'status', text: "✅ Using custom manual Access Token override." }]);
        return manualToken;
      }
      return null;
    }
  };

  // Phase 2: Create a fresh new file
  const handleNewFile = () => {
    if (isModified) {
      const confirmed = window.confirm("You have unsaved changes inside the editor. Any unsaved scripts will be lost. Create a new file?");
      if (!confirmed) return;
    }

    // Reset everything
    setCode(`# Mountech Academy - Fresh Workspace Python File\n# File: ${fileName}\n\nprint("Hello World from main.py!")\n`);
    setFileName('main.py');
    setGoogleDriveFileId(null);
    setIsModified(false);
    handleClearTerminal();
    setOutputs([
      { type: 'status', text: `✨ Created new empty Python workspace environment.` }
    ]);
  };

  // Phase 3: Save to Google Drive
  const handleSaveToDrive = async () => {
    let token = accessToken;
    if (!token) {
      token = await handleGoogleSignIn();
    }
    if (!token) return;

    // Check if filename is dummy or empty
    let nameToSave = fileName.trim();
    if (!nameToSave || nameToSave === 'main.py' || nameToSave.startsWith('exercise_')) {
      const chosenName = window.prompt("Save Script: Please enter a descriptive file name to persist in your Google Drive (e.g. my_exercise.py):", fileName);
      if (!chosenName) return;
      nameToSave = chosenName.endsWith('.py') ? chosenName : chosenName + '.py';
      setFileName(nameToSave);
    }

    setSaveLoading(true);
    try {
      if (!googleDriveFileId) {
        // Create new file (Multipart metadata + binary content)
        const metadata = {
          name: nameToSave,
          mimeType: 'text/x-python',
          description: 'Seeded training python file in Mountech Academy'
        };

        const boundary = 'mountech_multipart_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        const body = 
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: text/x-python\r\n\r\n' +
          code +
          close_delim;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: body,
        });

        if (!response.ok) {
          throw new Error(`Write API returned status ${response.status}`);
        }

        const dataObj = await response.json();
        if (dataObj.id) {
          setGoogleDriveFileId(dataObj.id);
          setIsModified(false);
          setSaveSuccess(true);
          setOutputs(prev => [...prev, { type: 'result', text: `⭐ Created new Google Drive record:\nFile: "${nameToSave}"\nID: ${dataObj.id}` }]);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error("No file identifier returned from Drive.");
        }
      } else {
        // Update existing file content directly
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${googleDriveFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/x-python'
          },
          body: code
        });

        if (!response.ok) {
          throw new Error(`Update API returned status ${response.status}`);
        }

        setIsModified(false);
        setSaveSuccess(true);
        setOutputs(prev => [...prev, { type: 'status', text: `💾 Overwrote metadata contents of "${nameToSave}" in Google Drive successfully!` }]);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (apiErr: any) {
      console.error("Failed saving document:", apiErr);
      setOutputs(prev => [...prev, { type: 'stderr', text: `Cloud Save Error: ${apiErr.message || apiErr}` }]);
    } finally {
      setSaveLoading(false);
    }
  };

  // Phase 3: Load Picker library safely
  const loadPickerInstance = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const gapi = (window as any).gapi;
      if (!gapi) return reject(new Error("Google APIs framework not loaded yet."));
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: (e: any) => reject(e)
      });
    });
  };

  // Phase 4: Load from Google Drive Picker
  const handleLoadFromDrive = async () => {
    let token = accessToken;
    if (!token) {
      token = await handleGoogleSignIn();
    }
    if (!token) return;

    setLoadLoading(true);
    try {
      await loadPickerInstance();

      const pickerOrigin = window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

      const googleRef = (window as any).google;
      const docsView = new googleRef.picker.DocsView(googleRef.picker.ViewId.DOCS)
        .setMimeTypes('text/plain,text/x-python,application/octet-stream,text/x-python-script')
        .setMode(googleRef.picker.DocsViewMode.GRID);

      const picker = new googleRef.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(token)
        .setCallback(async (data: any) => {
          if (data.action === googleRef.picker.Action.PICKED) {
            const chosenDoc = data.docs[0];
            const fileId = chosenDoc.id;
            const fileNameLoaded = chosenDoc.name;

            setOutputs(prev => [...prev, { type: 'status', text: `Attempting download stream for: "${fileNameLoaded}"...` }]);

            try {
              const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (!fileRes.ok) {
                throw new Error(`Media fetch returned status: ${fileRes.status}`);
              }

              const downloadedCode = await fileRes.text();
              setCode(downloadedCode);
              setFileName(fileNameLoaded);
              setGoogleDriveFileId(fileId);
              setIsModified(false);
              setOutputs(prev => [...prev, { type: 'status', text: `✨ Successfully imported "${fileNameLoaded}" into Monaco workspace!` }]);
            } catch (dlErr: any) {
              console.error("Error fetching media content:", dlErr);
              setOutputs(prev => [...prev, { type: 'stderr', text: `File download cancelled: ${dlErr.message}` }]);
            }
          }
        })
        .setOrigin(pickerOrigin)
        .build();

      picker.setVisible(true);
    } catch (pickerErr: any) {
      console.warn("Picker API UI failed (blocked by cross-site origin or console key is disabled):", pickerErr);
      const manualId = window.prompt("Google Picker failed to render in the sandboxed frame. Please enter the direct Google Drive file ID manually to fetch lines:", googleDriveFileId || "");
      if (manualId) {
        try {
          const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${manualId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const rawContents = await fileRes.text();
          setCode(rawContents);
          setGoogleDriveFileId(manualId);
          setFileName('drive_import.py');
          setIsModified(false);
          setOutputs(prev => [...prev, { type: 'status', text: `Loaded drive ID: ${manualId} manually.` }]);
        } catch (mErr: any) {
          setOutputs(prev => [...prev, { type: 'stderr', text: `Manual load failed: ${mErr.message}` }]);
        }
      }
    } finally {
      setLoadLoading(false);
    }
  };

  return (
    <div className="bg-[#050b14] border border-slate-900/80 rounded-2xl shadow-xl overflow-hidden font-sans my-4" id="mountech-embedded-python-sandbox">
      {/* Top Banner / Headline Info */}
      <div className="bg-[#0b1324] border-b border-slate-900 px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">Enterprise Python Sandbox IDE</h3>
              <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                Webassembly + Drive v3
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Test algorithms, solve syllabus challenges, and backup source files to your secure Google Drive storage.
            </p>
          </div>
        </div>

        {/* Auth / Drive Connection Quick Indicator */}
        <div className="flex items-center gap-2 text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-900">
          <div className={`w-2 h-2 rounded-full ${accessToken ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-[10px] font-mono text-gray-400">
            {accessToken ? 'Linked to Drive' : 'Drive Connection Pending'}
          </span>
          {!accessToken && (
            <button
              onClick={() => handleGoogleSignIn()}
              className="ml-2 text-[9px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded hover:bg-indigo-500 cursor-pointer"
            >
              Link Drive
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout (3-Column Desktop Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-900 min-h-[500px]">
        
        {/* Left Panel: Syllabus Challenges list (3 columns) */}
        <div className="lg:col-span-3 bg-[#070d19] border-r border-slate-900 p-4 flex flex-col justify-between h-full min-h-[250px]">
          <div>
            {/* Tab selection */}
            <div className="flex border-b border-slate-900 pb-2 mb-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={`text-[10px] uppercase font-mono tracking-wider font-bold py-1 px-2.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'instructions'
                    ? 'bg-slate-950 text-indigo-400 border border-slate-900'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ClipboardList className="w-3 h-3" /> Chapter Notebooks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`text-[10px] uppercase font-mono tracking-wider font-bold py-1 px-2.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'templates'
                    ? 'bg-slate-950 text-indigo-400 border border-slate-900'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <BookOpen className="w-3 h-3" /> Templates
              </button>
            </div>

            {/* List rendered based on active Tab */}
            {activeTab === 'instructions' ? (
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold tracking-widest text-indigo-400 uppercase block mb-1">
                  Active Course Notebooks
                </span>
                
                {problems.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded border border-slate-900 text-center">
                    <p className="text-[11px] text-gray-505">No specific lab exercise configured for this chapter.</p>
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="text-[10px] text-indigo-400 mt-2 hover:underline cursor-pointer"
                    >
                      Browse Playground Templates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {problems.map((prob, i) => (
                      <button
                        key={prob.id}
                        onClick={() => handleSelectProblem(i)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-start gap-1 ${
                          selectedProblemIndex === i
                            ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950 border-slate-900 hover:bg-slate-900/60 text-gray-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="font-bold line-clamp-1">{prob.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-snug">
                          {prob.description_markdown}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#38bdf8] uppercase block mb-1">
                  Algorithms Library
                </span>
                <div className="space-y-1.5">
                  {Object.keys(TEMPLATES).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSelectTemplate(key)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-0.5 ${
                        selectedTemplate === key
                          ? 'bg-slate-900 border-[#38bdf8] text-[#38bdf8]'
                          : 'bg-slate-950 border-slate-900 hover:bg-slate-900/60 text-gray-400 hover:text-slate-200 hover:border-slate-800'
                      }`}
                    >
                      <span className="font-bold">{TEMPLATES[key].name}</span>
                      <span className="text-[10px] text-gray-500 line-clamp-1">{TEMPLATES[key].description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active instruction detail box if any selected */}
          {selectedProblemIndex !== -1 && problems[selectedProblemIndex] && (
            <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-900">
              <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest block font-bold mb-1">ACTIVE LAB SPECIFICATION</span>
              <h4 className="text-xs font-bold text-slate-105">{problems[selectedProblemIndex].title}</h4>
              <p className="text-[10px] text-gray-404 mt-1 leading-normal italic">
                {problems[selectedProblemIndex].description_markdown}
              </p>
            </div>
          )}
        </div>

        {/* Middle/Center Panel: Monaco Editor & Action Toolbar (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col border-r border-slate-900 h-full relative">
          
          {/* Phase 4 Action IDE toolbar directly above Monaco */}
          <div className="bg-slate-950 px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-900 gap-2 select-none">
            
            {/* Left toolbar commands (File naming, New file) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewFile}
                title="Create a new, fresh workspace script file."
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-white rounded transition-all flex items-center justify-center cursor-pointer shadow-3xs"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>

              {/* Directly edit/rename file name within the toolbar */}
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setIsModified(true);
                }}
                className="bg-slate-950 text-[10px] font-mono px-2 py-1 border border-slate-900 hover:border-slate-800 focus:border-indigo-500 focus:outline-none rounded text-indigo-400 w-28 text-center"
                title="Double click or edit to rename file inside playground"
              />
              
              {isModified && (
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" title="Unsaved alterations" />
              )}
            </div>

            {/* Right Drive commands (Save to Drive, Load from Drive) */}
            <div className="flex items-center gap-1.5">
              
              {/* Load from Google Drive */}
              <button
                onClick={handleLoadFromDrive}
                disabled={loadLoading}
                title="Import existing .py or .ipynb code from your personal Google Drive account."
                className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-indigo-500/30 text-slate-300 hover:text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {loadLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                ) : (
                  <FolderOpen className="w-3 h-3 text-indigo-400" />
                )}
                <span>Import</span>
              </button>

              {/* Save to Google Drive */}
              <button
                onClick={handleSaveToDrive}
                disabled={saveLoading}
                title="Save current Monaco Editor content securely to your private Google Drive."
                className={`px-2.5 py-1.5 border rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-45 ${
                  saveSuccess 
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-extrabold' 
                    : 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300 hover:bg-indigo-600 hover:text-white'
                }`}
              >
                {saveLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                ) : saveSuccess ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>{saveSuccess ? 'Saved' : 'Save'}</span>
              </button>

            </div>
          </div>

          {/* Monaco Editor Canvas */}
          <div className="flex-1 w-full bg-[#1e1e1e] relative min-h-[300px]">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => {
                setCode(val || '');
                setIsModified(true);
              }}
              options={{
                fontSize: 12.5,
                fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
                minimap: { enabled: false },
                lineNumbersMinChars: 3,
                bracketPairColorization: { enabled: true },
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                readOnly: isRunning
              }}
            />

            {/* WASM Engine Initialization Spinner Overlays */}
            {!isEngineReady && (
              <div className="absolute inset-0 bg-[#020617]/95 flex flex-col items-center justify-center text-center p-6 z-30 transition-all">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  Initializing Python WASM Engine
                </h4>
                <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                  {engineStatus}
                </p>
                <span className="text-[10px] text-slate-500 font-mono mt-4 block p-1.5 bg-slate-950 rounded border border-slate-900">
                  First-time startup fetches complete Pyodide standard library and compiler bundles.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Terminal logs & run triggers (4 columns) */}
        <div className="lg:col-span-4 bg-slate-950 flex flex-col h-full min-h-[250px] relative" id="sandbox-output-console">
          
          {/* Header Bar */}
          <div className="px-4 py-2 bg-[#030712] border-b border-slate-900 flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 text-gray-505 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Diagnostic Stdout/Stderr</span>
            </div>
            
            <button
              onClick={handleClearTerminal}
              title="Clear Terminal Out"
              className="p-1 px-2 text-[10px] text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 rounded transition-all border border-transparent hover:border-rose-950/40 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Terminal Logs Container */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 whitespace-pre-wrap select-text selection:bg-indigo-500/30 max-h-[380px]">
            {outputs.length === 0 ? (
              <div className="text-gray-600 italic">Empty terminal frame. Ready to compile python lines.</div>
            ) : (
              outputs.map((out, idx) => {
                let colorClass = 'text-slate-300';
                if (out.type === 'stdout') colorClass = 'text-[#38bdf8]';
                if (out.type === 'stderr') colorClass = 'text-rose-400 border-l border-rose-500 pl-2 my-1';
                if (out.type === 'result') colorClass = 'text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 font-bold my-1.5';
                if (out.type === 'status') colorClass = 'text-indigo-400';

                return (
                  <div key={idx} className={`${colorClass} leading-relaxed font-mono`}>
                    {out.text}
                  </div>
                );
              })
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-3 border-t border-slate-900 pt-2 font-semibold font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Interpreter running...</span>
              </div>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Execute Footer Bar */}
          <div className="p-3 bg-[#020617] border-t border-slate-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCode}
                title="Revert modifications to original problem prompt"
                className="p-2 text-[10px] text-gray-400 hover:text-white hover:bg-slate-900 rounded-md transition-all flex items-center gap-1 cursor-pointer border border-slate-900"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Canvas</span>
              </button>

              {onSaveToSummary && (
                <button
                  onClick={() => {
                    const activeProb = problems[selectedProblemIndex];
                    onSaveToSummary(code, activeProb ? activeProb.title : "Custom Code Workspace");
                  }}
                  className="p-2 text-[10px] bg-slate-900 hover:bg-[#0070f3] text-gray-300 hover:text-white rounded-md transition-all flex items-center gap-1 cursor-pointer border border-slate-800"
                  title="Save current editor script to Study Summary"
                >
                  <Save className="w-3 h-3" />
                  <span>Save to Summary</span>
                </button>
              )}
            </div>

            <button
              id="run-python-sandbox-btn"
              disabled={!isEngineReady || isRunning}
              onClick={handleRunCode}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md select-none ${
                !isEngineReady || isRunning
                  ? 'bg-slate-800 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              {isRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current text-white" />
              )}
              <span>Run Script</span>
            </button>
          </div>
        </div>

      </div>

      {/* Info status footer */}
      <div className="bg-[#030712] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-xs text-gray-500 selection:bg-indigo-500/20">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Interactive, reactive, fully isolated and running inside client browser sandbox.</span>
        </span>
        <span className="font-mono text-[9.5px] text-gray-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Web Worker isolation avoids main-thread freezes.
        </span>
      </div>
    </div>
  );
};
