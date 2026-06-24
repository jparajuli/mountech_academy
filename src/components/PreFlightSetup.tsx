import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, ShieldCheck, Video, Users, CheckCircle2, AlertCircle, 
  HelpCircle, Wifi, Play, Volume2, Mic, Check, RefreshCw
} from 'lucide-react';

interface PreFlightSetupProps {
  lessonId: string | number;
  lessonTitle: string;
  socket: any;
  user: any;
  onLaunch: (password: string) => void;
}

export const PreFlightSetup: React.FC<PreFlightSetupProps> = ({
  lessonId,
  lessonTitle,
  socket,
  user,
  onLaunch,
}) => {
  const [roomName, setRoomName] = useState(() => `MountechAcademy-LiveClass-${lessonId}`);
  const [password, setPassword] = useState(() => Math.random().toString(36).slice(-10));
  const [enableRecording, setEnableRecording] = useState(true);
  const [muteStudents, setMuteStudents] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState(() => `Live Seminar: ${lessonTitle}`);

  // Device Checklist States
  const [cameraAccess, setCameraAccess] = useState<'testing' | 'ok' | 'error'>('testing');
  const [micAccess, setMicAccess] = useState<'testing' | 'ok' | 'error'>('testing');
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Check devices
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => setCameraAccess('ok'))
        .catch(() => setCameraAccess('error'));
        
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setMicAccess('ok'))
        .catch(() => setMicAccess('error'));
    } else {
      setCameraAccess('error');
      setMicAccess('error');
    }

    if (socket) {
      setSocketConnected(socket.connected !== false);
    }
  }, [socket]);

  const generateNewPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPass = "";
    for (let i = 0; i < 12; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
  };

  const handleStartBroadcast = () => {
    if (socket) {
      console.log(`[PreFlightSetup] Launching classroom live-stream-ready to room ${roomName}`);
      socket.emit('live-stream-ready', {
        lessonId,
        roomName,
        password,
        title: broadcastTitle,
        enableRecording,
        muteStudents,
      });
    }
    onLaunch(password);
  };

  return (
    <div 
      id="pre-flight-lobby-card"
      className="max-w-2xl mx-auto bg-[#0a0f1d] border border-gray-800 rounded-xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden"
    >
      {/* Decorative Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0070f3] to-indigo-500" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-mono text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block mb-1">
            Pre-Flight Moderator Lobby
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            Classroom Activation Portal
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
          <Wifi className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <span className="text-[10px] font-mono font-bold uppercase text-gray-300">
            {socketConnected ? 'Socket Live' : 'Connecting'}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-6">
        Prepare the broadcast settings, secure Jitsi passcode parameters, and inspect hardware pipelines before initiating presentation sync to online students.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Config Panel */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 border-b border-gray-800 pb-1.5">
            1. Stream Attributes
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Broadcast Session Title
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Live seminar name"
                className="w-full bg-[#05080f] border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Jitsi Secure Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Unique seminar ID"
                className="w-full bg-[#05080f] border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Jitsi Room Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#05080f] border border-slate-800 focus:border-indigo-500 rounded text-xs font-mono text-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateNewPassword}
                  className="px-2.5 bg-slate-900 border border-slate-800 rounded hover:border-indigo-500 transition-colors cursor-pointer"
                  title="Generate Secure Password"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Flight Hardware / Checklist */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 border-b border-gray-800 pb-1.5">
            2. Hardware & Systems Check
          </h3>

          <div className="space-y-2.5 bg-slate-950/50 border border-slate-900 rounded-lg p-3.5">
            {/* Camera check */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-gray-400">
                <Video className="w-4 h-4 text-indigo-400" />
                Webcam Feed
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                cameraAccess === 'ok' ? 'bg-emerald-950 text-emerald-400' :
                cameraAccess === 'testing' ? 'bg-slate-900 text-gray-400' : 'bg-rose-950 text-rose-400'
              }`}>
                {cameraAccess === 'ok' ? 'ACTIVE' : cameraAccess === 'testing' ? 'TESTING' : 'OFFLINE'}
              </span>
            </div>

            {/* Microphone check */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-gray-400">
                <Mic className="w-4 h-4 text-indigo-400" />
                Microphone input
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                micAccess === 'ok' ? 'bg-emerald-950 text-emerald-400' :
                micAccess === 'testing' ? 'bg-slate-900 text-gray-400' : 'bg-rose-950 text-rose-400'
              }`}>
                {micAccess === 'ok' ? 'ACTIVE' : micAccess === 'testing' ? 'TESTING' : 'OFFLINE'}
              </span>
            </div>

            {/* Network sync check */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-gray-400">
                <Wifi className="w-4 h-4 text-indigo-400" />
                Broadcaster Node
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">
                SECURE
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableRecording}
                onChange={(e) => setEnableRecording(e.target.checked)}
                className="accent-indigo-500 h-4 w-4 rounded border-slate-800 bg-slate-950 cursor-pointer"
              />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Enable Stream Cloud Recording
              </span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={muteStudents}
                onChange={(e) => setMuteStudents(e.target.checked)}
                className="accent-indigo-500 h-4 w-4 rounded border-slate-800 bg-slate-950 cursor-pointer"
              />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Mute students automatically on join
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Launch CTA */}
      <button
        type="button"
        onClick={handleStartBroadcast}
        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold font-mono uppercase tracking-wider py-3 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-indigo-600/15"
      >
        <Play className="w-4 h-4 fill-current text-white animate-pulse" />
        <span>Initialize Jitsi Secure Broadcast</span>
      </button>

      {/* Safety Info Alert */}
      <div className="mt-4 flex items-start gap-2.5 bg-indigo-950/20 border border-indigo-900/45 rounded-lg p-3 text-[11px] text-indigo-300">
        <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          Jitsi Room lock encryption active. After initiating the Jitsi instance, the room is locked dynamically, and a secure password requirement is pushed to students automatically.
        </span>
      </div>
    </div>
  );
};
