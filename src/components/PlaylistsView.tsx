import React, { useState } from 'react';
import { FolderOpen, Link as LinkIcon, Play, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Playlist } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';

interface PlaylistsViewProps {
  playlists: Playlist[];
  onLoadPlaylistUrl: (url: string, title: string) => Promise<void>;
  onPlayDirectUrl: (url: string) => void;
  isLoading: boolean;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  onLoadPlaylistUrl,
  onPlayDirectUrl,
  isLoading,
}) => {
  const [customM3uUrl, setCustomM3uUrl] = useState('');
  const [directStreamUrl, setDirectStreamUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCustomM3uSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = customM3uUrl.trim();
    if (!trimmed) {
      setErrorMsg('দয়া করে একটি বৈধ M3U URL প্রদান করুন');
      return;
    }
    if (trimmed.startsWith('http://')) {
      // Alert about Netlify HTTPS mixed content
      setErrorMsg('সতর্কতা: Netlify-তে HTTPS বাধ্যতামূলক। এই লিঙ্কটি http:// হওয়ায় ব্রাউজার ব্লক করতে পারে। সম্ভব হলে https:// লিঙ্ক ব্যবহার করুন।');
    }
    onLoadPlaylistUrl(trimmed, 'Custom M3U Playlist');
  };

  const handleDirectStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = directStreamUrl.trim();
    if (!trimmed) {
      setErrorMsg('দয়া করে স্ট্রিম লিঙ্ক (m3u8/mp4) প্রদান করুন');
      return;
    }
    onPlayDirectUrl(trimmed);
  };

  return (
    <div className="space-y-6">
      {/* Curated Playlists section */}
      <div>
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-sky-400" />
          তৈরি করা M3U প্লেলিস্টসমূহ (Curated Playlists)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {playlists.map((pl, idx) => (
            <div
              key={idx}
              onClick={() => onLoadPlaylistUrl(pl.url, pl.name)}
              className="group p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer flex items-center gap-3.5 shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src={pl.logo || DEFAULT_LOGO}
                  alt={pl.name}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO; }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white group-hover:text-sky-300 truncate transition-colors">
                  {pl.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {pl.description || 'লাইভ টিভি স্ট্রিম'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-semibold mt-1">
                  লোড করুন <Play className="w-2.5 h-2.5 fill-sky-400" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom M3U Playlist Loader */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg">
        <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-2">
          <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
          কাস্টম M3U প্লেলিস্ট লিঙ্ক লোড করুন
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">
          যেকোনো পাবলিক M3U বা M3U8 প্লেলিস্টের URL দিন।
        </p>

        <form onSubmit={handleCustomM3uSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="https://example.com/playlist.m3u"
            value={customM3uUrl}
            onChange={(e) => setCustomM3uUrl(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-blue-600/20"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            প্লেলিস্ট লোড করুন
          </button>
        </form>
      </div>

      {/* Direct Single Stream Link Player */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg">
        <h4 className="text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          সরাসরি একক স্ট্রিম লিংক প্লে করুন (Direct Stream Link)
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">
          যেকোনো সরাসরি HLS (.m3u8), DASH (.mpd) বা MP4 ভিডিও লিংক পেস্ট করে তৎক্ষণাৎ প্লে করুন।
        </p>

        <form onSubmit={handleDirectStreamSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            value={directStreamUrl}
            onChange={(e) => setDirectStreamUrl(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            প্লে করুন
          </button>
        </form>
      </div>

      {/* Feedback / Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
