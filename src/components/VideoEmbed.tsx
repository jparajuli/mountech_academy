import React from 'react';

interface VideoEmbedProps {
  lessonId: number | string | null | undefined;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ lessonId }) => {
  if (!lessonId) {
    return (
      <div 
        id="video-embed-placeholder"
        className="w-full aspect-[16/9] flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-lg text-center bg-slate-950/40"
      >
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
          <span className="text-indigo-400 font-mono text-sm font-semibold animate-pulse">!</span>
        </div>
        <span className="text-sm font-mono text-gray-300 font-semibold mb-2">
          No Active Live Classroom Stream
        </span>
        <p className="text-xs text-gray-500 max-w-md leading-relaxed">
          Select a lesson from the syllabus or wait for the instructor to activate the live classroom theater session.
        </p>
      </div>
    );
  }

  // Construct uniquely namespaced room for Jitsi Meet dynamically based on the lesson ID
  const jitsiRoomName = `MountechAcademy-LiveClass-${lessonId}`;
  const embedUrl = `https://meet.jit.si/${jitsiRoomName}`;

  return (
    <div 
      id="video-embed-player-wrapper"
      className="w-full aspect-[16/9] relative overflow-hidden rounded-lg border border-gray-800 shadow-lg bg-black"
    >
      <iframe
        id="jitsi-meet-iframe"
        src={embedUrl}
        title={`Live Class Room Session - ${jitsiRoomName}`}
        frameBorder="0"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};
