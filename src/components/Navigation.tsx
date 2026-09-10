import React from 'react';
import { Podcast, Star, Film, FolderOpen, Zap } from 'lucide-react';
import { AppMode, TabView } from '../types';

interface NavigationProps {
  currentTab: TabView;
  appMode: AppMode;
  onSelectTab: (tab: TabView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, appMode, onSelectTab }) => {
  const navItems: { id: TabView; label: string; icon: React.ReactNode }[] = [
    { id: 'events', label: 'ইভেন্ট', icon: <Podcast className="w-5 h-5" /> },
    { id: 'live-tv', label: 'লাইভ টিভি', icon: <Star className="w-5 h-5" /> },
    { id: 'movies', label: 'মুভি', icon: <Film className="w-5 h-5" /> },
    { id: 'playlist', label: 'প্লেলিস্ট', icon: <FolderOpen className="w-5 h-5" /> },
  ];

  if (appMode === 'tv') {
    return (
      <aside className="fixed top-0 left-0 bottom-0 w-16 bg-[#080d1a]/95 border-r border-white/10 z-40 flex flex-col items-center py-4 gap-3 shadow-2xl">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-2">
          <Zap className="w-5 h-5" />
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              tabIndex={0}
              onClick={() => onSelectTab(item.id)}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer outline-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 focus:ring-2 focus:ring-sky-400'
              }`}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </aside>
    );
  }

  // Mobile Bottom Nav
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[#080d1a]/95 backdrop-blur-lg border-t border-white/10 z-40 py-1.5 px-2 flex justify-around items-center shadow-2xl">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-sky-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-sky-500/15' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
