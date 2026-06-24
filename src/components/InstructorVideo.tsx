import React, { useEffect, useRef, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Circle, Square, Video } from 'lucide-react';

interface InstructorVideoProps {
  lessonId: string | number;
  socket: any; // Socket instance from parent
  user: {
    email: string;
    name?: string;
  };
  isChosenForRecording?: boolean;
}

export const InstructorVideo: React.FC<InstructorVideoProps> = ({ lessonId, socket, user, isChosenForRecording = false }) => {
  const [generatedPassword] = useState(() => Math.random().toString(36).slice(-8));
  const [isJoined, setIsJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const jitsiApiRef = useRef<any>(null);

  const currentRoom = `MountechAcademy-LiveClass-${lessonId}`;

  useEffect(() => {
    // If the socket reconnects or is ready, re-emit the stream state so any new/late students can catch it
    if (socket && isJoined && jitsiApiRef.current) {
      console.log(`[InstructorVideo] Emitting live-stream-ready to room ${currentRoom} with password`);
      socket.emit('live-stream-ready', {
        lessonId,
        roomName: currentRoom,
        password: generatedPassword,
      });
    }
  }, [socket, isJoined, generatedPassword, lessonId, currentRoom]);

  const handleApiReady = (api: any) => {
    jitsiApiRef.current = api;

    // Listen for videoConferenceJoined to execute moderator tasks
    api.addListener('videoConferenceJoined', (event: any) => {
      console.log('[InstructorVideo] Instructor successfully joined Jitsi Meeting:', event);
      setIsJoined(true);

      // Lock the room with the secure randomized password
      api.executeCommand('password', generatedPassword);

      // Emit socket event to notify all students
      if (socket) {
        socket.emit('live-stream-ready', {
          lessonId,
          roomName: currentRoom,
          password: generatedPassword,
        });
      }
    });

    api.addListener('videoConferenceLeft', () => {
      console.log('[InstructorVideo] Instructor left Jitsi Meeting');
      setIsJoined(false);
      setIsRecording(false);
    });

    // Listen for recording status changes to sync our state
    api.addListener('recordingStatusChanged', (event: any) => {
      console.log('[InstructorVideo] Recording status changed:', event);
      if (event && event.on) {
        setIsRecording(true);
      } else {
        setIsRecording(false);
      }
    });
  };

  const handleToggleRecording = () => {
    if (!jitsiApiRef.current) return;
    if (isRecording) {
      console.log('[InstructorVideo] Executing stopRecording command...');
      jitsiApiRef.current.executeCommand('stopRecording', { mode: 'file' });
      setIsRecording(false);
    } else {
      console.log('[InstructorVideo] Executing startRecording command...');
      jitsiApiRef.current.executeCommand('startRecording', { mode: 'file' });
      setIsRecording(true);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col" id="instructor-video-root">
      <div className="bg-indigo-950/80 border-b border-indigo-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
            Live Stream Moderator Console
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={!isJoined}
            className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
            }`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>Record Livestream</span>
              </>
            )}
          </button>

          <div className="text-[10px] font-mono text-gray-400 hidden sm:block">
            Room Lock Code: <span className="text-amber-400 font-bold font-mono">{generatedPassword}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={currentRoom}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
            localRecording: {
              enabled: false
            },
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              ...(isChosenForRecording ? ['recording'] : []),
              'settings', 'videoquality', 'filmstrip', 'participants-pane'
            ],
            subject: 'Mountech Academy Instructor Room',
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#090f1d',
          }}
          userInfo={{
            displayName: user.name || user.email || 'Instructor',
            email: user.email,
          }}
          onApiReady={handleApiReady}
          getIFrameRef={(iframeRef) => {
            if (iframeRef) {
              iframeRef.style.width = '100%';
              iframeRef.style.height = '100%';
              iframeRef.style.border = '0';
            }
          }}
        />
      </div>
    </div>
  );
};
