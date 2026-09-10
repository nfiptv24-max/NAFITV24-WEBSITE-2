import React from 'react';
import { PlayCircle, Smartphone, Tv, RotateCcw, Cloud, Sparkles } from 'lucide-react';
import { AppMode, TabView } from '../types';

interface HeaderProps {
  currentTab: TabView;
  appMode: AppMode;
  onSetAppMode: (mode: AppMode) => void;
  onOpenNetlifyGuide: () => void;
  onRefreshData: () => void;
  isFirebaseConnected?: boolean;
  activeUsersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  appMode,
  onSetAppMode,
  onOpenNetlifyGuide,
  onRefreshData,
  isFirebaseConnected = true,
  activeUsersCount = 0,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'events': return 'লাইভ খেলা ও ইভেন্ট (Live Events)';
      case 'live-tv': return 'লাইভ টিভি (Live TV Channels)';
      case 'movies': return 'সিনেমা ও মুভি (Movies)';
      case 'playlist': return 'প্লেলিস্ট ও M3U (Playlists)';
      case 'menu': return 'মেনু ও সেটিংস (Settings)';
      case 'netlify-guide': return 'Netlify হোস্ট গাইড (Netlify Guide)';
      default: return 'NAFI TV 24';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/90 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Current View */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <PlayCircle className="w-5 h-5 fill-white/20" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                NAFI TV <span className="text-sky-400 font-black">24</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firebase Live
              </span>
              {activeUsersCount > 0 && (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">
                  {activeUsersCount} অনলাইন
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">
              {getTabTitle()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Netlify Guide Trigger */}
          <button
            onClick={onOpenNetlifyGuide}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all cursor-pointer"
            title="Netlify Hosting Guide"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Netlify গাইড</span>
          </button>

          {/* Mode Switcher: Mobile vs TV */}
          <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => onSetAppMode('mobile')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                appMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Layout"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
            <button
              onClick={() => onSetAppMode('tv')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                appMode === 'tv'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="TV Remote Layout"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline">TV</span>
            </button>
          </div>

          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
            title="চ্যানেল ও খেলা রিফ্রেশ করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
