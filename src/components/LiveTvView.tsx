import React, { useState } from 'react';
import { Search, Tv, Radio } from 'lucide-react';
import { Channel } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';

interface LiveTvViewProps {
  channels: Channel[];
  currentChannelUrl?: string;
  onSelectChannel: (channel: Channel, index: number) => void;
  onReloadChannels: () => void;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  channels,
  currentChannelUrl,
  onSelectChannel,
  onReloadChannels,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(channels.map((c) => c.category || 'General')))];

  const filteredChannels = channels.filter((ch) => {
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || (ch.category || 'General').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="চ্যানেল খুঁজুন (Search channel)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Counter & Reload */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-sky-400 border border-blue-500/20 font-semibold">
            {channels.length} টি চ্যানেল
          </span>
          <button
            onClick={onReloadChannels}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            রিলোড
          </button>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {cat === 'All' ? 'সব চ্যানেল' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Channels Grid */}
      {filteredChannels.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
          <Tv className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-50" />
          <p className="text-sm font-medium">কোনো চ্যানেল পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500 mt-1">ভিন্ন কীওয়ার্ড দিয়ে সার্চ করুন</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {filteredChannels.map((ch, idx) => {
            const isPlayingThis = currentChannelUrl === ch.url;
            return (
              <div
                key={ch.id || idx}
                onClick={() => onSelectChannel(ch, idx)}
                className={`group relative p-3 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${
                  isPlayingThis
                    ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-white/20'
                }`}
              >
                {/* Playing Indicator Badge */}
                {isPlayingThis && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                )}

                {/* Logo wrapper */}
                <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/15 p-1.5 mb-2 flex items-center justify-center border border-white/10 transition-transform group-hover:scale-105 shadow-inner">
                  <img
                    src={ch.logo || DEFAULT_LOGO}
                    alt={ch.name}
                    className="w-full h-full object-contain rounded-full"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO; }}
                  />
                </div>

                {/* Channel Name */}
                <span className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-1 w-full">
                  {ch.name}
                </span>

                {/* Servers / Category tag */}
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-0.5">
                  {ch.servers.length > 1 ? `${ch.servers.length} সার্ভার` : ch.category || 'HD'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
