import React, { useState } from 'react';
import { PlayCircle, Tv, RotateCcw, Bell } from 'lucide-react';
import { AppMode, TabView } from '../types';

interface HeaderProps {
  currentTab: TabView;
  appMode: AppMode;
  onSetAppMode: (mode: AppMode) => void;
  onRefreshData: () => void;
  isFirebaseConnected?: boolean;
  activeUsersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  appMode,
  onSetAppMode,
  onRefreshData,
  isFirebaseConnected = true,
  activeUsersCount = 0,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const getTabTitle = () => {
    switch (currentTab) {
      case 'events':
        return 'Live Events';
      case 'live-tv':
        return 'Live TV';
      case 'movies':
        return 'Movies';
      case 'playlist':
        return 'Playlist';
      case 'menu':
        return 'Menu';
      default:
        return 'Live Events';
    }
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080d1a]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Current View (matches screenshot) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <PlayCircle className="w-4 h-4 fill-white" />
            </div>
            <span className="text-[8px] font-black text-slate-300 tracking-tighter uppercase -mt-0.5">
              NAFI TV
            </span>
          </div>

          <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white truncate">
            {getTabTitle()}
          </h1>
        </div>

        {/* Action buttons matching screenshot */}
        <div className="flex items-center gap-2 shrink-0">
          {/* TV Mode Pill Button: 📺 টিভি মোড */}
          <button
            onClick={() => onSetAppMode(appMode === 'tv' ? 'mobile' : 'tv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              appMode === 'tv'
                ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                : 'bg-sky-950/30 hover:bg-sky-900/40 text-sky-300 border-sky-500/40'
            }`}
            title="টিভি বা মোবাইল মোড পরিবর্তন করুন"
          >
            <Tv className="w-3.5 h-3.5 text-sky-300" />
            <span>টিভি মোড</span>
          </button>

          {/* Notification Bell with Dot */}
          <button
            onClick={() => setShowNotificationModal((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 flex items-center justify-center transition-all cursor-pointer relative"
            title="বিজ্ঞপ্তি"
          >
            <Bell className="w-3.5 h-3.5 fill-sky-300/30 text-sky-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </button>

          {/* Refresh / Reload Circular Button */}
          <button
            onClick={handleRefreshClick}
            className={`w-8 h-8 rounded-full bg-[#131b2e] hover:bg-[#1e293b] border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer ${
              isRefreshing ? 'animate-spin text-sky-400' : ''
            }`}
            title="লাইভ ডাটা ও সার্ভার রিফ্রেশ করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Notification Dropdown */}
      {showNotificationModal && (
        <div className="absolute right-3 sm:right-6 top-14 w-72 p-3 bg-[#0d1527] border border-sky-500/30 rounded-xl shadow-2xl z-50 text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-sky-400" />
              নোটিফিকেশন
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              সক্রিয়
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            লাইভ খেলা এবং মুভি দেখার জন্য ধন্যবাদ। সার্ভার সমস্যা হলে প্লেয়ারের <strong>'সার্ভার'</strong> বাটন চেপে ব্যাকআপ সার্ভার বেছে নিন।
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-end">
            <button
              onClick={() => setShowNotificationModal(false)}
              className="text-[11px] text-sky-400 font-semibold hover:underline"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
