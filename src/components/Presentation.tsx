import React from 'react';
import { Maximize2, Minimize2, Radio } from 'lucide-react';
import { PythonSandbox } from './PythonSandbox';

interface PresentationProps {
  activeSlide: number;
  slides: Array<{ t: string; d: string; code: string; lang?: string }>;
  courseId: string;
  isLectureFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Presentation: React.FC<PresentationProps> = ({
  activeSlide,
  slides,
  courseId,
  isLectureFullscreen,
  onToggleFullscreen,
}) => {
  const currentSlide = slides[activeSlide] || slides[0] || { t: 'Introduction', d: 'No slide available', code: '' };

  return (
    <div 
      id="lecture-presentation-container"
      className="flex flex-col h-full bg-[#080d16] border border-gray-850 p-6 rounded-xl shadow-lg"
    >
      {/* Top Watermark bar */}
      <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse inline-block" />
          Live Lecture Presentation Broadcast
        </span>
        <div className="flex items-center gap-3">
          <span>Mountech Lecture Node #00{activeSlide + 1}</span>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1 rounded bg-[#090f1d] border border-slate-800 hover:bg-slate-800 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 normal-case font-semibold text-[10px]"
            title={isLectureFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isLectureFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Central Slide Context Area */}
      <div className="my-auto py-2 space-y-4 flex-grow flex flex-col justify-center">
        <div className="space-y-1.5">
          <span className={`uppercase font-mono font-bold text-blue-400 block tracking-wider ${isLectureFullscreen ? 'text-xs md:text-sm' : 'text-[10px]'}`}>
            Slide Module {activeSlide + 1} of {slides.length}
          </span>
          <h4 className={`font-bold tracking-tight text-white leading-tight ${isLectureFullscreen ? 'text-2xl md:text-4xl' : 'text-lg md:text-2xl'}`}>
            {currentSlide.t}
          </h4>
          <p className={`text-gray-300 leading-relaxed max-w-4xl ${isLectureFullscreen ? 'text-sm md:text-base' : 'text-xs md:text-sm'}`}>
            {currentSlide.d}
          </p>
        </div>

        {/* Code companion illustration inside presentation screen */}
        {currentSlide.lang === 'python-runnable' || currentSlide.lang === 'language-python-runnable' ? (
          <div className="w-full mt-2 rounded border border-gray-850 bg-[#080d16]/95 p-3 overflow-y-auto max-h-[380px]">
            <div className="text-[10px] uppercase font-mono text-indigo-400 font-bold mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                Live Runnable Python Sandbox
              </span>
              <span className="text-gray-500 text-[8px]">Interactive Slide Module</span>
            </div>
            <PythonSandbox
              lessonId={parseInt(courseId) || null}
              initialCode={currentSlide.code}
            />
          </div>
        ) : (
          <div className="bg-[#080d16] border border-gray-850 p-4 rounded font-mono text-[10px] md:text-xs text-emerald-400 overflow-x-auto shadow-inner select-all relative">
            <span className="absolute top-2 right-2 text-[8px] text-gray-650 uppercase font-mono select-none">
              {currentSlide.lang ? `${currentSlide.lang.toUpperCase()} Code Segment` : "Whiteboard Code Segment"}
            </span>
            <pre className="whitespace-pre">{currentSlide.code}</pre>
          </div>
        )}

        {/* Interactive Live Whiteboard SVG Node Map graph (Changes visually on Slide clicks!) */}
        <div className="border border-gray-800 bg-[#070c17]/40 rounded-md p-3 max-h-[110px] hidden md:flex items-center justify-between mt-2">
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
    </div>
  );
};
