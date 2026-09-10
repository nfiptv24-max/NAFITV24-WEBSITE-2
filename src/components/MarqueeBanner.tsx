import React from 'react';

interface MarqueeBannerProps {
  news: string;
  activeUsers?: number;
  isConnected?: boolean;
}

export const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  news,
  activeUsers = 0,
  isConnected = true,
}) => {
  if (!news) return null;

  return (
    <div className="w-full px-3 sm:px-5 py-2">
      <div className="max-w-6xl mx-auto bg-[#101728] border border-red-950/60 rounded-xl p-1 sm:p-1.5 flex items-center gap-2 sm:gap-3 overflow-hidden shadow-md">
        {/* Red Breaking News Pill matching screenshot */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#dc2626] text-white font-bold text-[11px] shadow-sm tracking-tight">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>ব্রেকিং নিউজ</span>
        </div>

        {/* Scrolling Ticker Text */}
        <div className="flex-1 overflow-hidden whitespace-nowrap relative">
          <div className="inline-block animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused] text-xs font-medium text-slate-200">
            {news}
          </div>
        </div>

        {/* Online / Status Pill */}
        {activeUsers > 0 && (
          <div className="shrink-0 hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{activeUsers} অনলাইন</span>
          </div>
        )}
      </div>
    </div>
  );
};
