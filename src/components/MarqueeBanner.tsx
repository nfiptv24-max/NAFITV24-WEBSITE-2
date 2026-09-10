import React from 'react';
import { Megaphone, Users, Wifi } from 'lucide-react';

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
    <div className="w-full bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-blue-950/60 border-b border-blue-500/20 px-3 py-1.5 flex items-center gap-3 overflow-hidden text-xs text-slate-200">
      {/* Live Badge */}
      <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-blue-500/30 font-semibold text-[10px]">
        <Megaphone className="w-3 h-3 text-sky-400" />
        <span>বিজ্ঞপ্তি</span>
      </div>

      {/* Scrolling Text */}
      <div className="flex-1 overflow-hidden whitespace-nowrap relative">
        <div className="inline-block animate-[marquee_25s_linear_infinite] hover:[animation-play-state:paused] font-medium text-slate-300">
          {news}
        </div>
      </div>

      {/* Active count & RTDB indicator */}
      <div className="shrink-0 hidden md:flex items-center gap-2 text-[11px] text-slate-400">
        {activeUsers > 0 && (
          <span className="flex items-center gap-1 text-sky-400">
            <Users className="w-3 h-3" />
            <span>{activeUsers} অনলাইন</span>
          </span>
        )}
        <span
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
          title="Firebase Realtime Database"
        >
          <Wifi className="w-2.5 h-2.5" />
          <span>{isConnected ? 'Firebase সিঙ্ক' : 'অফলাইন'}</span>
        </span>
      </div>
    </div>
  );
};
