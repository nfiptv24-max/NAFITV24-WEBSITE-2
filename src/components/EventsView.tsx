import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Play } from 'lucide-react';
import { LiveEvent } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';

interface EventsViewProps {
  events: LiveEvent[];
  onSelectEvent: (event: LiveEvent) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, onSelectEvent }) => {
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [now, setNow] = useState(Date.now());

  // Real-time ticking for live timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sports = ['All', ...Array.from(new Set(events.map((e) => e.sport || 'Cricket')))];
  const statuses = ['All', 'Live', 'Upcoming'];

  const filteredEvents = events.filter((ev) => {
    const sportMatch = selectedSport === 'All' || ev.sport.toLowerCase() === selectedSport.toLowerCase();
    const statusMatch = selectedStatus === 'All' || ev.status.toLowerCase() === selectedStatus.toLowerCase();
    return sportMatch && statusMatch;
  });

  const formatElapsedTime = (startTime: number) => {
    const elapsed = now - startTime;
    if (elapsed <= 0) return 'শুরু হচ্ছে';
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const formatCountdown = (startTime: number) => {
    const remaining = startTime - now;
    if (remaining <= 0) return 'শুরু হচ্ছে';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${h > 0 ? `${h}ঘণ্টা ` : ''}${m}মি. ${s}সে. পর`;
  };

  return (
    <div className="space-y-4">
      {/* Category Pills Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sports.map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSport(sp)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSport === sp
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {sp === 'All' ? 'সকল খেলা (All)' : sp}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {st === 'All' ? 'সকল স্ট্যাটাস' : st === 'Live' ? '● লাইভ' : '⏳ আসন্ন (Upcoming)'}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-50" />
          <p className="text-sm font-medium">কোনো ম্যাচ পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500 mt-1">অন্য কোনো ফিল্টার সিলেক্ট করে চেষ্টা করুন</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredEvents.map((ev, index) => {
            const isLive = ev.status === 'Live';
            return (
              <div
                key={ev.id || index}
                onClick={() => onSelectEvent(ev)}
                className="group relative p-4 rounded-2xl bg-slate-900/75 hover:bg-slate-900 border border-white/10 hover:border-blue-500/50 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              >
                {/* Background ambient gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all"></div>

                {/* Top info bar */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-sky-400 border border-blue-500/20 truncate max-w-[200px] sm:max-w-xs">
                    <Trophy className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">{ev.name || ev.tournament}</span>
                  </span>

                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      লাইভ চলছে
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Clock className="w-3 h-3" />
                      আসন্ন
                    </span>
                  )}
                </div>

                {/* Matchup visual */}
                <div className="flex items-center justify-between gap-3">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center text-center w-5/12 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 p-1.5 mb-2 border border-white/10 shadow-inner group-hover:scale-105 transition-transform flex items-center justify-center">
                      <img
                        src={ev.team1.logo}
                        alt={ev.team1.name}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO; }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {ev.team1.name}
                    </span>
                  </div>

                  {/* Center VS info */}
                  <div className="flex flex-col items-center text-center w-3/12 shrink-0">
                    {isLive ? (
                      <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
                        {formatElapsedTime(ev.startTime)}
                      </div>
                    ) : (
                      <div className="text-[11px] font-medium text-amber-300">
                        {formatCountdown(ev.startTime)}
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-slate-500 mt-1">VS</span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center text-center w-5/12 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 p-1.5 mb-2 border border-white/10 shadow-inner group-hover:scale-105 transition-transform flex items-center justify-center">
                      <img
                        src={ev.team2.logo}
                        alt={ev.team2.name}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO; }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {ev.team2.name}
                    </span>
                  </div>
                </div>

                {/* Bottom hover action hint */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{ev.sport} ম্যাচ</span>
                  <span className="flex items-center gap-1 text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <Play className="w-3 h-3 fill-sky-400" />
                    এখন দেখুন
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
