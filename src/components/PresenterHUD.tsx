import React from 'react';
import { 
  ChevronLeft, ChevronRight, Layout, Circle, Square, 
  RefreshCw, Power, Radio, ShieldAlert 
} from 'lucide-react';

interface PresenterHUDProps {
  activeSlide: number;
  totalSlides: number;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isPiPEnabled: boolean;
  onTogglePiP: () => void;
  onSyncSandbox: () => void;
  onEndLiveSession: () => void;
}

export const PresenterHUD: React.FC<PresenterHUDProps> = ({
  activeSlide,
  totalSlides,
  onNextSlide,
  onPrevSlide,
  isRecording,
  onToggleRecording,
  isPiPEnabled,
  onTogglePiP,
  onSyncSandbox,
  onEndLiveSession,
}) => {
  return (
    <div 
      id="presenter-floating-hud"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-white"
    >
      {/* Group 1: HUD Indicator */}
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <div className="text-left">
          <span className="font-mono text-[9px] text-[#38bdf8] font-bold uppercase tracking-widest block">
            Presenter HUD Active
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            Instructor Control Center
          </span>
        </div>
      </div>

      {/* Main Grid divided into 3 system groups */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Core System 1: Presentation (Slides) */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={onPrevSlide}
            disabled={activeSlide === 0}
            className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-gray-300 hover:text-white cursor-pointer"
            title="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-[11px] font-mono font-bold px-1.5 text-blue-400">
            {activeSlide + 1} / {totalSlides}
          </span>

          <button
            type="button"
            onClick={onNextSlide}
            disabled={activeSlide === totalSlides - 1}
            className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-gray-300 hover:text-white cursor-pointer"
            title="Next Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Core System 2: Video Stream Controls */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-1 gap-1">
          {/* PiP Layout Toggle */}
          <button
            type="button"
            onClick={onTogglePiP}
            className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold ${
              isPiPEnabled 
                ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' 
                : 'text-gray-300 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
            title="Toggle Picture-in-Picture Layout"
          >
            <Layout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PiP {isPiPEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Cloud Recording Toggle */}
          <button
            type="button"
            onClick={onToggleRecording}
            className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold ${
              isRecording 
                ? 'bg-rose-950 text-rose-400 border border-rose-900/50 animate-pulse' 
                : 'text-gray-300 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
            title={isRecording ? "Stop Cloud Recording" : "Start Cloud Recording"}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Circle className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
            <span className="hidden sm:inline">{isRecording ? 'Stop Rec' : 'Record'}</span>
          </button>
        </div>

        {/* Core System 3: Code & Session State */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg p-1 gap-1">
          {/* Sync Sandbox State */}
          <button
            type="button"
            onClick={onSyncSandbox}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors text-gray-300 hover:text-white cursor-pointer flex items-center gap-1 text-xs font-mono font-bold border border-transparent"
            title="Force Sandbox Code Sync with Students"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sync Code</span>
          </button>
        </div>
      </div>

      {/* Extreme System Command: End Live Session */}
      <button
        type="button"
        onClick={onEndLiveSession}
        className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900 text-rose-200 hover:text-white rounded-lg text-xs font-mono font-bold border border-rose-800/60 transition-all cursor-pointer flex items-center gap-1.5"
        title="Terminate Live Broadcast"
      >
        <Power className="w-3.5 h-3.5" />
        <span>End Session</span>
      </button>
    </div>
  );
};
