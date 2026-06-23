import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Trash2, RotateCcw, FileCode, Terminal, Cpu, 
  CheckCircle2, AlertTriangle, Sparkles, Copy, Check, Info, RefreshCw
} from 'lucide-react';

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

export const PythonSandbox: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('fibonacci');
  const [code, setCode] = useState<string>(TEMPLATES.fibonacci.code);
  const [outputs, setOutputs] = useState<{ type: 'log' | 'stdout' | 'stderr' | 'result' | 'status', text: string }[]>([
    { type: 'status', text: "Python sandbox initialized. Press 'Run Code' to execute." }
  ]);
  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<string>("Initializing Python WebAssembly runtime...");

  const workerRef = useRef<Worker | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize and clean up Web Worker
  useEffect(() => {
    // Create Pyodide Worker from the public asset directory
    const worker = new Worker('/pyodide.worker.js');
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'status':
          if (msg.status === 'ready') {
            setIsEngineReady(true);
            setOutputs(prev => [...prev, { type: 'status', text: `✨ Python Engine is ready! ${msg.message}` }]);
          } else {
            setEngineStatus(msg.message || "Working...");
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

  // Scroll terminal to the bottom whenever logs append
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs]);

  // Run python script inside the isolated Worker thread
  const handleRunCode = () => {
    if (!isEngineReady || isRunning || !workerRef.current) return;

    setIsRunning(true);
    // Overwrite the console outputs to display current execution cycle
    setOutputs([
      { type: 'status', text: `🚀 Spawning instance sandbox execution run...` }
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
    const currentCode = TEMPLATES[selectedTemplate]?.code || TEMPLATES.fibonacci.code;
    setCode(currentCode);
    setOutputs(prev => [
      ...prev, 
      { type: 'status', text: `Code reset to original '${TEMPLATES[selectedTemplate]?.name || 'Fibonacci'}' template standard.` }
    ]);
  };

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplate(key);
    setCode(TEMPLATES[key].code);
    setOutputs(prev => [
      ...prev,
      { type: 'status', text: `Selected template loaded: '${TEMPLATES[key].name}'.` }
    ]);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-[#050b14] border border-slate-900/80 rounded-2xl shadow-xl overflow-hidden font-sans my-4" id="mountech-embedded-python-sandbox">
      {/* Sandbox Header */}
      <div className="bg-[#0b1324] border-b border-slate-900 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">Isolated Python Interpreter</h3>
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
                WebAssembly
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 leading-none">
              Client-side script execution compiled directly inside an isolated main-thread Web Worker.
            </p>
          </div>
        </div>

        {/* Template Select Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-500 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5" /> Template:
          </span>
          <div className="inline-flex gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-900 w-full sm:w-auto overflow-x-auto">
            {Object.keys(TEMPLATES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectTemplate(key)}
                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedTemplate === key
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {TEMPLATES[key].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor & Terminal Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-900 h-[500px]">
        
        {/* Editor Area (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col border-r border-slate-900 h-full relative">
          
          {/* Header Bar */}
          <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-900 select-none">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-500 tracking-widest uppercase ml-1">
                workspace_main.py
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                title="Copy code"
                className="p-1 px-2.5 text-[10px] text-gray-400 hover:text-white hover:bg-slate-900 rounded-md transition-all border border-transparent hover:border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleResetCode}
                title="Reset code template"
                className="p-1 px-2.5 text-[10px] text-gray-400 hover:text-white hover:bg-slate-900 rounded-md transition-all border border-transparent hover:border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Editor Sandbox Area */}
          <div className="flex-1 w-full bg-[#1e1e1e] relative min-h-[160px]">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 13,
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

            {/* WASM Engine Lazy Downloading Loader Spinner */}
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
                  First-time startup fetches complete Pyodide system bundles (~15MB CDN source).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Terminal Area (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950 flex flex-col h-full relative" id="sandbox-output-console">
          
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-[#030712] border-b border-slate-900 flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Execution Sandbox Output</span>
            </div>
            
            <button
              onClick={handleClearTerminal}
              title="Clear terminal records"
              className="p-1 px-2 text-[10px] text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 rounded transition-all border border-transparent hover:border-rose-950/40 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Console Output Screen */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 whitespace-pre-wrap select-text selection:bg-indigo-500/30">
            {outputs.length === 0 ? (
              <div className="text-gray-600 italic">Empty terminal frame. Ready to run python script...</div>
            ) : (
              outputs.map((out, idx) => {
                let colorClass = 'text-slate-300';
                if (out.type === 'stdout') colorClass = 'text-[#38bdf8]';
                if (out.type === 'stderr') colorClass = 'text-rose-400 border-l border-rose-500 pl-2 my-1';
                if (out.type === 'result') colorClass = 'text-[#10b981] bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 font-bold my-1.5';
                if (out.type === 'status') colorClass = 'text-[#a78bfa]';

                return (
                  <div key={idx} className={`${colorClass} leading-relaxed`}>
                    {out.text}
                  </div>
                );
              })
            )}

            {/* Run spinner within terminals during execute */}
            {isRunning && (
              <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-3 border-t border-slate-900 pt-2 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compiler running python instructions...</span>
              </div>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Bottom Execution Bar */}
          <div className="p-3 bg-[#020617] border-t border-slate-900 flex items-center justify-between gap-4">
            <span className="text-[9.5px] text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-400" />
              Type and press evaluation trigger.
            </span>
            <button
              id="run-python-sandbox-btn"
              disabled={!isEngineReady || isRunning}
              onClick={handleRunCode}
              className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md select-none ${
                !isEngineReady || isRunning
                  ? 'bg-slate-800 text-gray-500 cursor-not-allowed opacity-50 scale-100'
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

      {/* Info footer */}
      <div className="bg-[#030712] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-xs">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Interactive, reactive, fully isolated and immune to server-side outages.</span>
        </span>
        <span className="font-mono text-[10px] text-gray-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Web Worker isolation guarantees UI thread won't freeze.
        </span>
      </div>
    </div>
  );
};
