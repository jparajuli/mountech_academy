import React, { useState, useEffect } from 'react';
import { ShieldCheck, Video, Clock, HelpCircle, ArrowLeft, RefreshCw, LogIn, Lock, GraduationCap, Check } from 'lucide-react';
import { StudentVideo } from './StudentVideo';
import { Presentation } from './Presentation';
import { PreFlightSetup } from './PreFlightSetup';
import { PresenterHUD } from './PresenterHUD';

interface LiveClassroomWrapperProps {
  user: any;
  lessonId: string | number;
  lessonTitle: string;
  courseId: string;
  slides: Array<{ t: string; d: string; code: string; lang?: string }>;
  activeSlide: number;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  socket: any;
  videoLayoutMode: 'prominent' | 'floating';
  setVideoLayoutMode: (mode: 'prominent' | 'floating') => void;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  onSyncSandbox: () => void;
  children: React.ReactNode;
}

export const LiveClassroomWrapper: React.FC<LiveClassroomWrapperProps> = ({
  user,
  lessonId,
  lessonTitle,
  courseId,
  slides,
  activeSlide,
  onNextSlide,
  onPrevSlide,
  socket,
  videoLayoutMode,
  setVideoLayoutMode,
  isRecording,
  setIsRecording,
  onSyncSandbox,
  children,
}) => {
  const isAuthorized = user?.role === 'instructor' || user?.role === 'admin';
  
  // Track live session status: 'setup' | 'live' | 'ended'
  const [sessionStatus, setSessionStatus] = useState<'setup' | 'live' | 'ended'>(() => {
    const saved = localStorage.getItem(`mountech_session_status_${lessonId}`);
    if (saved === 'live' || saved === 'ended' || saved === 'setup') {
      return saved;
    }
    return 'setup';
  });

  const [fullscreenPresentation, setFullscreenPresentation] = useState(false);

  // Synchronize status changes with students via WebSockets
  useEffect(() => {
    if (!socket) return;

    // Listen to classroom activation events
    socket.on('live-stream-ready', (data: any) => {
      if (Number(data.lessonId) === Number(lessonId)) {
        console.log('[LiveClassroomWrapper] Received stream-ready signal from instructor');
        setSessionStatus('live');
        localStorage.setItem(`mountech_session_status_${lessonId}`, 'live');
      }
    });

    socket.on('classroom-session-ended', (data: any) => {
      if (Number(data.lessonId) === Number(lessonId)) {
        console.log('[LiveClassroomWrapper] Received session-ended signal from instructor');
        setSessionStatus('ended');
        localStorage.setItem(`mountech_session_status_${lessonId}`, 'ended');
      }
    });

    // Check if session status is already active when joining
    socket.emit('get-session-status', { lessonId });
    socket.on('session-status-response', (data: any) => {
      if (data && data.lessonId === lessonId && data.status) {
        setSessionStatus(data.status);
        localStorage.setItem(`mountech_session_status_${lessonId}`, data.status);
      }
    });

    return () => {
      socket.off('live-stream-ready');
      socket.off('classroom-session-ended');
      socket.off('session-status-response');
    };
  }, [socket, lessonId]);

  // Save session status state helper
  const handleSessionChange = (status: 'setup' | 'live' | 'ended') => {
    setSessionStatus(status);
    localStorage.setItem(`mountech_session_status_${lessonId}`, status);
    if (socket) {
      socket.emit('broadcast-session-status', {
        lessonId,
        status,
      });
    }
  };

  const handleLaunchLive = (password: string) => {
    handleSessionChange('live');
  };

  const handleEndLiveSession = () => {
    if (window.confirm('Are you sure you want to end the live lecture session? This will push an offline overlay to all active students.')) {
      handleSessionChange('ended');
    }
  };

  // --- RENDERING STRATEGIES ---

  // 1. If user is a student:
  if (!isAuthorized) {
    if (sessionStatus === 'setup') {
      return (
        <div 
          id="student-waiting-lobby"
          className="flex flex-col items-center justify-center p-12 bg-[#090f1d] border border-gray-800 rounded-xl text-center shadow-xl min-h-[400px]"
        >
          <div className="w-16 h-16 rounded-full bg-[#0070f3]/10 border border-[#0070f3]/25 flex items-center justify-center mb-5 animate-bounce">
            <Video className="w-8 h-8 text-[#38bdf8] animate-pulse" />
          </div>
          <span className="font-mono text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block mb-1">
            Lecture Broadcast Pending
          </span>
          <h3 className="text-lg font-bold text-white mb-2">
            Waiting for Instructor
          </h3>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed mb-6">
            The lecture stream is currently undergoing pre-flight configurations. Please stay in this classroom lobby; the slides and video feeds will launch automatically once initialized.
          </p>
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-900 text-[11px] text-gray-500 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Polling Secure Gateway Connection...</span>
          </div>
        </div>
      );
    }

    if (sessionStatus === 'ended') {
      return (
        <div 
          id="student-concluded-lobby"
          className="flex flex-col items-center justify-center p-12 bg-[#090f1d] border border-gray-800 rounded-xl text-center shadow-xl min-h-[400px]"
        >
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-5">
            <GraduationCap className="w-8 h-8 text-gray-500" />
          </div>
          <span className="font-mono text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block mb-1">
            Session Terminated
          </span>
          <h3 className="text-lg font-bold text-white mb-2">
            Live Seminar Has Concluded
          </h3>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed mb-6">
            Thank you for attending today's live classroom. The instructor has concluded the broadcast. Check your Student Profile and Lecture Resources tabs to download course syllabus PDFs and practice coding in our standalone sandboxes.
          </p>
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-900 text-xs font-mono text-emerald-400">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Attendance Logged Successfully</span>
          </div>
        </div>
      );
    }

    // STUDENT VIEW: Live Session is Active! Purely render StudentVideo and Presentation components.
    return (
      <div id="student-live-theater-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Live Stream Video Feed (5 columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-800 shadow-lg bg-black aspect-[16/9] w-full">
            <StudentVideo lessonId={lessonId} socket={socket} user={user} />
          </div>
          
          <div className="p-4 bg-slate-900/60 border border-gray-850 rounded-lg space-y-1.5 text-xs text-left">
            <span className="font-mono text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider block">Live Stream Synchronized 📡</span>
            <p className="text-gray-300 leading-relaxed italic">
              "You are connected directly to the instructor secure WebRTC node. Slide modifications and database script adjustments will push automatically to your view in real-time."
            </p>
          </div>
        </div>

        {/* Presentation Slide deck (7 columns) */}
        <div className="lg:col-span-7 h-full">
          <Presentation
            activeSlide={activeSlide}
            slides={slides}
            courseId={courseId}
            isLectureFullscreen={fullscreenPresentation}
            onToggleFullscreen={() => setFullscreenPresentation(!fullscreenPresentation)}
          />
        </div>
      </div>
    );
  }

  // 2. If user is Authorized (Instructor / Admin):
  if (sessionStatus === 'setup') {
    return (
      <PreFlightSetup
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        socket={socket}
        user={user}
        onLaunch={handleLaunchLive}
      />
    );
  }

  if (sessionStatus === 'ended') {
    return (
      <div 
        id="instructor-ended-lobby"
        className="max-w-xl mx-auto bg-[#0a0f1d] border border-gray-800 rounded-xl p-8 text-white shadow-2xl text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600" />
        <div className="w-16 h-16 rounded-full bg-rose-950/20 border border-rose-800/40 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-rose-500" />
        </div>
        <span className="font-mono text-[9px] text-rose-400 font-extrabold uppercase tracking-widest block mb-1">
          Broadcast Teardown
        </span>
        <h3 className="text-xl font-bold text-white mb-2">
          Live Lecture Session Concluded
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          This broadcast channel has been securely closed, and students have been redirected to the lecture summary board. If you made a mistake, you can re-activate the pre-flight lobby settings.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleSessionChange('setup')}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-850 text-gray-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors rounded-lg font-mono text-xs uppercase font-bold cursor-pointer"
          >
            Re-open Setup Lobby
          </button>
        </div>
      </div>
    );
  }

  // INSTRUCTOR LIVE MODE: Render the full Interactive children layout, PLUS the floating PresenterHUD wrapper.
  return (
    <div id="instructor-live-broadcast-layout" className="relative pb-24">
      {/* Primary Workspace Children */}
      {children}

      {/* Floating Presenter HUD Toolbar */}
      <PresenterHUD
        activeSlide={activeSlide}
        totalSlides={slides.length}
        onNextSlide={onNextSlide}
        onPrevSlide={onPrevSlide}
        isRecording={isRecording}
        onToggleRecording={() => {
          // Trigger the recording function of Jitsi inside InstructorVideo component
          const recordBtn = document.querySelector('[title="Start Recording"], [title="Stop Recording"]');
          if (recordBtn) {
            (recordBtn as HTMLButtonElement).click();
          } else {
            setIsRecording(!isRecording);
          }
        }}
        isPiPEnabled={videoLayoutMode === 'floating'}
        onTogglePiP={() => {
          setVideoLayoutMode(videoLayoutMode === 'floating' ? 'prominent' : 'floating');
        }}
        onSyncSandbox={onSyncSandbox}
        onEndLiveSession={handleEndLiveSession}
      />
    </div>
  );
};
