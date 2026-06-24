import React from 'react';

interface VideoEmbedProps {
  channelId: string | null | undefined;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ channelId }) => {
  if (!channelId) {
    return (
      <div 
        id="video-embed-placeholder"
        className="w-full aspect-[16/9] flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-lg text-center bg-slate-950/40"
      >
        <span className="text-sm font-mono text-gray-400 font-semibold mb-2">
          No YouTube Live Broadcast Configured
        </span>
        <p className="text-xs text-gray-500 max-w-md">
          Instructors or admins can configure a YouTube Channel ID under this lesson's settings to start a parallel live stream broadcast.
        </p>
      </div>
    );
  }

  // Generate compliant iframe src URL for streaming live content from the configured channel ID
  const embedUrl = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;

  return (
    <div 
      id="video-embed-player-wrapper"
      className="w-full aspect-[16/9] relative overflow-hidden rounded-lg border border-gray-800 shadow-lg bg-black"
    >
      <iframe
        id="youtube-live-iframe"
        src={embedUrl}
        title="Live Lesson Broadcast Stream"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};
