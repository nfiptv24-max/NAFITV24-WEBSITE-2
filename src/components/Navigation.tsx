import React from 'react';
import { Trophy, Tv, Clapperboard, FolderOpen, Menu, Zap } from 'lucide-react';
import { AppMode, TabView } from '../types';

interface NavigationProps {
  currentTab: TabView;
  appMode: AppMode;
  onSelectTab: (tab: TabView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, appMode, onSelectTab }) => {
  const navItems: { id: TabView; label: string; icon: React.ReactNode }[] = [
    { id: 'events', label: 'Events', icon: <Trophy className="w-5 h-5" /> },
    { id: 'live-tv', label: 'Live TV', icon: <Tv className="w-5 h-5" /> },
    { id: 'movies', label: 'Movies', icon: <Clapperboard className="w-5 h-5" /> },
    { id: 'playlist', label: 'Playlist', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'menu', label: 'Menu', icon: <Menu className="w-5 h-5" /> },
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
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-cyan-400'
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

  // Mobile Bottom Nav matching screenshot exactly
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[#080d1a]/95 backdrop-blur-lg border-t border-slate-800/80 z-40 py-1.5 px-2 flex justify-around items-center shadow-2xl">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const isRestricted = item.id === 'events' || item.id === 'movies';

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
              isActive
                ? 'text-[#22d3ee] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all relative ${
                isActive ? 'bg-cyan-500/15 text-[#22d3ee]' : ''
              }`}
            >
              {item.icon}
              {isRestricted && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[8px] font-black leading-none shadow-sm">
                  APP
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-tight mt-0.5">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
