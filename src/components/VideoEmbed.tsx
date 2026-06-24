import React from 'react';
import { InstructorVideo } from './InstructorVideo';
import { StudentVideo } from './StudentVideo';

interface VideoEmbedProps {
  lessonId: number | string | null | undefined;
  socket: any;
  user: any;
  isChosenForRecording?: boolean;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ lessonId, socket, user, isChosenForRecording = false }) => {
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

  const isModerator = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <div 
      id="video-embed-player-wrapper"
      className="w-full aspect-[16/9] relative overflow-hidden rounded-lg border border-gray-800 shadow-lg bg-black"
    >
      {isModerator ? (
        <InstructorVideo lessonId={lessonId} socket={socket} user={user} isChosenForRecording={isChosenForRecording} />
      ) : (
        <StudentVideo lessonId={lessonId} socket={socket} user={user} />
      )}
    </div>
  );
};
