import React, { useEffect, useRef, useState } from 'react';
import { JaaSMeeting } from '@jitsi/react-sdk';
import { Loader2 } from 'lucide-react';
import { getJaasTokenRequest } from '../api';

interface StudentVideoProps {
  lessonId: string | number;
  socket: any; // Socket instance from parent
  user: {
    email: string;
    name?: string;
  };
}

export const StudentVideo: React.FC<StudentVideoProps> = ({ lessonId, socket, user }) => {
  const [streamConfig, setStreamConfig] = useState<{ roomName: string; password: string } | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const jitsiApiRef = useRef<any>(null);

  useEffect(() => {
    if (!streamConfig) return;

    let active = true;
    const fetchToken = async () => {
      try {
        setIsLoadingToken(true);
        setFetchError(null);
        const res = await getJaasTokenRequest(lessonId);
        if (active) {
          if (res.success && res.token) {
            setJwtToken(res.token);
          } else {
            throw new Error("Unable to obtain standard JaaS JWT security token.");
          }
        }
      } catch (err: any) {
        if (active) {
          setFetchError(err?.message || "Secure stream token fetch failed.");
        }
      } finally {
        if (active) {
          setIsLoadingToken(false);
        }
      }
    };
    fetchToken();
    return () => {
      active = false;
    };
  }, [streamConfig, lessonId]);

  useEffect(() => {
    if (!socket) return;

    // Listen for live-stream-ready socket updates
    const handleStreamReady = (data: { lessonId?: string | number; roomName: string; password: string }) => {
      // Make sure the event is for the active lesson to support parallel course delivery
      if (data.lessonId === undefined || String(data.lessonId) === String(lessonId)) {
        console.log('[StudentVideo] Received secure live stream broadcast:', data);
        setStreamConfig({
          roomName: data.roomName,
          password: data.password,
        });
      }
    };

    socket.on('live-stream-ready', handleStreamReady);

    // Also request current live stream details just in case it was already broadcast
    socket.emit('request-live-stream', { lessonId });

    return () => {
      socket.off('live-stream-ready', handleStreamReady);
    };
  }, [socket, lessonId]);

  const handleApiReady = (api: any) => {
    jitsiApiRef.current = api;

    // Add listener for password challenge
    api.addListener('passwordRequired', () => {
      if (streamConfig?.password) {
        console.log('[StudentVideo] Jitsi requested password; injecting secure key automatically...');
        api.executeCommand('password', streamConfig.password);
      }
    });

    // In case the room has already been password locked before joining completes, we can also retry setting it on join
    api.addListener('videoConferenceJoined', () => {
      if (streamConfig?.password) {
        console.log('[StudentVideo] Student joined conference. Forcing password validation.');
        api.executeCommand('password', streamConfig.password);
      }
    });
  };

  if (!streamConfig) {
    return (
      <div 
        id="student-waiting-container"
        className="w-full aspect-[16/9] flex flex-col items-center justify-center p-6 border border-dashed border-slate-800 rounded-lg text-center bg-slate-950/60"
      >
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-sm font-mono text-gray-300 font-semibold mb-2">
          Waiting for Instructor to start the broadcast...
        </span>
        <p className="text-xs text-gray-500 max-w-md leading-relaxed">
          The interactive Jitsi Meet stream will automatically load here as soon as the instructor launches the lecture. Please stay tuned!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col" id="student-video-root">
      <div className="bg-slate-950 border-b border-slate-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wide">
            Connected to Secure Classroom Stream
          </span>
        </div>
        <div className="text-[10px] font-mono text-emerald-400 font-semibold">
          🔐 Automated Security Handshake Active
        </div>
      </div>

      <div className="flex-grow relative aspect-[16/9] w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {isLoadingToken ? (
          <div className="flex flex-col items-center justify-center p-6 text-center" id="jaas-token-loading">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <span className="text-sm font-mono text-gray-300 font-semibold mb-2">
              Authenticating Secure Video Stream...
            </span>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              Establishing a secure connection with JaaS Room.
            </p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center" id="jaas-token-error">
            <span className="text-lg mb-2">⚠️</span>
            <span className="text-sm font-mono text-red-400 font-bold mb-2">
              Secure Stream Authentication Failed
            </span>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed mb-4">
              {fetchError}
            </p>
            <button
              onClick={() => {
                setIsLoadingToken(true);
                setFetchError(null);
                getJaasTokenRequest(lessonId).then((res) => {
                  if (res.success && res.token) {
                    setJwtToken(res.token);
                    setIsLoadingToken(false);
                  } else {
                    setFetchError("Failed to fetch token on retry.");
                    setIsLoadingToken(false);
                  }
                }).catch(e => {
                  setFetchError(e.message || "Failed to fetch token.");
                  setIsLoadingToken(false);
                });
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : jwtToken ? (
          <JaaSMeeting
            appId={(import.meta as any).env.VITE_JAAS_APP_ID || ''}
            jwt={jwtToken}
            roomName={streamConfig.roomName}
            configOverwrite={{
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              prejoinPageEnabled: false,
              disableInviteFunctions: true,
              hideConferenceSubject: true,
              hideConferenceTimer: true,
              toolbarButtons: [
                'microphone', 'camera', 'closedcaptions', 'fullscreen',
                'fodeviceselection', 'hangup', 'chat', 'raisehand', 'videoquality', 'filmstrip'
              ],
              subject: 'Mountech Academy Live Room',
            }}
            interfaceConfigOverwrite={{
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              DEFAULT_BACKGROUND: '#090f1d',
            }}
            userInfo={{
              displayName: user.name || user.email || 'Student',
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
        ) : null}
      </div>
    </div>
  );
};
