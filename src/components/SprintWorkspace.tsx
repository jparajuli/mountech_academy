import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Bookmark, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SprintWorkspaceProps {
  studentCode: string;
  setStudentCode: (code: string) => void;
  hasSubmitted: boolean;
  challengeTimeRemaining: number;
  isWasmReady: boolean;
  isWasmRunning: boolean;
  wasmStatus: string;
  secondsElapsed: number;
  onSaveToSummary: () => void;
  onRunWasm: () => void;
  onSubmitChallenge: (status: 'success' | 'failure') => void;
}

/**
 * Heavy, dynamic coding workspace containing the Monaco code editor.
 * This component is designed to be lazy-loaded to prevent loading Monaco on standard lecture sessions,
 * eliminating initial asset bloat.
 */
export const SprintWorkspace: React.FC<SprintWorkspaceProps> = ({
  studentCode,
  setStudentCode,
  hasSubmitted,
  challengeTimeRemaining,
  isWasmReady,
  isWasmRunning,
  wasmStatus,
  secondsElapsed,
  onSaveToSummary,
  onRunWasm,
  onSubmitChallenge,
}) => {
  return (
    <div id="student-sprint-workspace-card" className="flex flex-col justify-between border-r border-slate-900 h-full">
      {/* Toolbar actions */}
      <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between border-b border-slate-900 text-[10px] font-mono">
        <span className="text-gray-500">Student Editor Compiler Terminal</span>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isWasmReady ? 'bg-emerald-500' : 'bg-amber-500 animate-bounce'}`} />
          <span className="text-indigo-400 text-[9px] uppercase font-bold tracking-wider">{wasmStatus}</span>
        </div>
      </div>

      {/* Embedded Monaco Editor */}
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
          loading={
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 font-mono text-[10px] text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Calibrating Monaco Syntax Liners...</span>
            </div>
          }
        />
      </div>

      {/* Student execution control bar */}
      <div className="bg-[#03060c] p-2.5 flex items-center justify-between gap-2 border-t border-slate-900">
        <span className="text-[9px] font-mono text-slate-500">Sprints elapsed: {secondsElapsed}s</span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onSaveToSummary}
            type="button"
            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 hover:border-slate-800 text-slate-450 hover:text-indigo-400 rounded text-[9.5px] font-bold font-mono tracking-wide flex items-center gap-1 transition-all cursor-pointer border border-slate-900"
            title="Record your active code block into the Study Summary compilation"
          >
            <Bookmark className="w-3 h-3 text-indigo-400" />
            <span>Save to Summary</span>
          </button>

          <button
            disabled={!isWasmReady || isWasmRunning || challengeTimeRemaining === 0}
            onClick={onRunWasm}
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
            onClick={() => onSubmitChallenge('success')}
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
  );
};
