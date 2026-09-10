import React, { useState, useEffect } from 'react';
import { Trophy, Play, Clock, Hourglass } from 'lucide-react';
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

  const baseSports = ['All', 'Cricket', 'Football', 'Hockey', 'More', 'US Open'];
  const eventSports = Array.from(new Set(events.map((e) => e.sport || 'Football')));
  const allSports = Array.from(new Set([...baseSports, ...eventSports]));

  const statuses = [
    { id: 'All', label: 'All' },
    { id: 'Live', label: 'Live', isLive: true },
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Today', label: 'Today' },
    { id: 'Recent Results', label: 'Recent Results' },
  ];

  const filteredEvents = events.filter((ev) => {
    // Sport filter
    if (selectedSport !== 'All') {
      if (selectedSport === 'More') {
        if (['Cricket', 'Football', 'Hockey', 'US Open'].includes(ev.sport)) {
          return false;
        }
      } else if (ev.sport.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }
    }

    // Status filter
    if (selectedStatus === 'Live' && ev.status !== 'Live') return false;
    if (selectedStatus === 'Upcoming' && ev.status !== 'Upcoming') return false;
    if (selectedStatus === 'Today') {
      const eventDate = new Date(ev.startTime).toDateString();
      const todayDate = new Date(now).toDateString();
      if (eventDate !== todayDate) return false;
    }
    if (selectedStatus === 'Recent Results' && ev.status !== 'Live' && ev.startTime > now) {
      return false;
    }

    return true;
  });

  const formatCountdownTimer = (startTime: number) => {
    const remaining = startTime - now;
    if (remaining <= 0) return '00h 00m 00s';
    const h = String(Math.floor(remaining / 3600000)).padStart(2, '0');
    const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
  };

  const formatUpcomingTime = (ev: LiveEvent) => {
    if (ev.matchTimeFormatted) return ev.matchTimeFormatted;
    try {
      const d = new Date(ev.startTime);
      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = String(hours % 12 || 12).padStart(2, '0');
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${formattedHours}:${minutes} ${ampm}, ${day} ${month}`;
    } catch (_) {
      return '01:00 AM, 11 Sep';
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Filter Row 1: Sports Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {allSports.map((sp) => {
          const isActive = selectedSport === sp;
          return (
            <button
              key={sp}
              onClick={() => setSelectedSport(sp)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-[#131b2e] hover:bg-[#1e293b] text-slate-300 border border-slate-700/50'
              }`}
            >
              {sp}
            </button>
          );
        })}
      </div>

      {/* Filter Row 2: Match Statuses */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map((st) => {
          const isActive = selectedStatus === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-[#131b2e] hover:bg-[#1e293b] text-slate-300 border border-slate-700/50'
              }`}
            >
              {st.isLive && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
              )}
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Events List Cards */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-[#0c1220] border border-slate-800/80 text-slate-400">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-50" />
          <p className="text-sm font-medium">কোনো ম্যাচ পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500 mt-1">অন্য কোনো ফিল্টার সিলেক্ট করে চেষ্টা করুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev, index) => {
            const isLive = ev.status === 'Live';
            const matchday = ev.matchday || 'MATCHDAY 1';

            return (
              <div
                key={ev.id || index}
                className="group relative p-3 sm:p-3.5 rounded-2xl bg-[#0c1220] hover:bg-[#0f172a] border border-slate-800/80 hover:border-blue-500/40 shadow-xl transition-all overflow-hidden"
              >
                <div className="flex flex-row items-stretch gap-3 sm:gap-4">
                  {/* Left Column: Single Match/Channel Logo & Tournament Pill */}
                  <div className="w-24 sm:w-28 shrink-0 flex flex-col justify-between">
                    {/* Single Event Channel Logo */}
                    <div className="w-full h-[74px] sm:h-20 rounded-xl overflow-hidden relative flex items-center justify-center p-2 bg-gradient-to-tr from-[#0b1437] via-[#111c47] to-[#1d1b54] border border-blue-500/30 shadow-inner group-hover:border-sky-400/50 transition-colors">
                      {/* Radial glow */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.25)_0%,_transparent_70%)] pointer-events-none"></div>

                      {/* Single prominent logo */}
                      <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 backdrop-blur-sm p-1.5 flex items-center justify-center shadow-lg border border-white/15">
                        <img
                          src={ev.logo || ev.banner || ev.team1?.logo || DEFAULT_LOGO}
                          alt={ev.name || ev.tournament}
                          className="w-full h-full object-contain rounded-lg drop-shadow"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO;
                          }}
                        />
                      </div>
                    </div>

                    {/* Tournament Pill below thumbnail */}
                    <div
                      className="w-full mt-1.5 py-1 px-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-300 flex items-center justify-center gap-1 truncate text-center"
                      title={ev.tournament}
                    >
                      <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{ev.tournament}</span>
                    </div>
                  </div>

                  {/* Right Column: Title, Status Badge, and Action Buttons */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                    {/* Header Row: Matchday & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#f59e0b] font-extrabold text-[11px] tracking-wider uppercase truncate">
                        {matchday}
                      </span>

                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase bg-rose-600/10 text-rose-400 border border-rose-600/50 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight bg-amber-500/10 text-amber-300 border border-amber-500/40 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          UPCOMING • {formatUpcomingTime(ev)}
                        </span>
                      )}
                    </div>

                    {/* Match Title */}
                    <h4
                      className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 group-hover:text-sky-300 transition-colors"
                      title={ev.name || `${ev.team1.name} vs ${ev.team2.name}`}
                    >
                      {ev.name || `${ev.team1.name} vs ${ev.team2.name} | ${ev.tournament}`}
                    </h4>

                    {/* Action Rows */}
                    {isLive ? (
                      <div className="space-y-1.5 pt-0.5">
                        {/* Live Running Box */}
                        <div className="w-full py-1 px-2 rounded-lg bg-[#06241a] border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>ম্যাচটি এখন লাইভ চলছে</span>
                        </div>

                        {/* Watch Live Button */}
                        <button
                          onClick={() => onSelectEvent(ev)}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>লাইভ দেখুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-0.5">
                        {/* Countdown Box */}
                        <div className="w-full py-1 px-2 rounded-lg bg-[#0c1527] border border-slate-700/60 text-[#f59e0b] font-mono text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                          <span>বাকি: {formatCountdownTimer(ev.startTime)}</span>
                        </div>

                        {/* Channel Link Coming Box / Optional Preview Button */}
                        <button
                          onClick={() => onSelectEvent(ev)}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#111827] border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Hourglass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>চ্যানেল লিংক আসছে</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
