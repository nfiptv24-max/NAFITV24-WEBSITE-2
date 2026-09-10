import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { EventsView } from './components/EventsView';
import { LiveTvView } from './components/LiveTvView';
import { MoviesView } from './components/MoviesView';
import { PlaylistsView } from './components/PlaylistsView';
import { Navigation } from './components/Navigation';
import { NetlifyGuideModal } from './components/NetlifyGuideModal';
import {
  Channel,
  LiveEvent,
  Movie,
  Playlist,
  AppMode,
  TabView,
  StreamServer,
} from './types';
import {
  FALLBACK_CHANNELS,
  INITIAL_EVENTS,
  INITIAL_MOVIES,
  INITIAL_PLAYLISTS,
  M3U_SOURCES,
  DEFAULT_LOGO,
} from './data/defaultData';
import { parseM3U } from './utils/streamUtils';

export default function App() {
  // App settings & view state
  const [appMode, setAppMode] = useState<AppMode>('mobile');
  const [currentTab, setCurrentTab] = useState<TabView>('events');
  const [isNetlifyGuideOpen, setIsNetlifyGuideOpen] = useState(false);

  // Content Data
  const [channels, setChannels] = useState<Channel[]>(FALLBACK_CHANNELS);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [movies] = useState<Movie[]>(INITIAL_MOVIES);
  const [playlists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // Active Streaming Media State
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    title: string;
    logo?: string;
    servers: StreamServer[];
  } | null>(null);
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(0);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  const showToast = useCallback((msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  // Mode persistence & initial loading
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('nafitv_mode') as AppMode;
      if (savedMode === 'tv' || savedMode === 'mobile') {
        setAppMode(savedMode);
      }
    } catch (_) {}

    // Initial fetch of public M3U channels
    loadRemoteM3uChannels();
  }, []);

  const handleSetAppMode = (mode: AppMode) => {
    setAppMode(mode);
    try {
      localStorage.setItem('nafitv_mode', mode);
    } catch (_) {}
    showToast(mode === 'tv' ? '📺 TV মোড চালু হয়েছে' : '📱 মোবাইল মোড চালু হয়েছে');
  };

  // Fetch channels from M3U list with fallback
  const loadRemoteM3uChannels = async () => {
    for (const src of M3U_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(src, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) continue;
        const text = await resp.text();
        const parsed = parseM3U(text);
        if (parsed.length > 0) {
          setChannels(parsed);
          return;
        }
      } catch (_) {
        continue;
      }
    }
  };

  // Play a specific channel
  const handleSelectChannel = (channel: Channel, index: number) => {
    setCurrentChannelIndex(index);
    setActiveMedia({
      url: channel.url,
      title: channel.name,
      logo: channel.logo || DEFAULT_LOGO,
      servers: channel.servers || [{ name: 'Main', url: channel.url }],
    });
  };

  // Play a live event
  const handleSelectEvent = (event: LiveEvent) => {
    const streamUrl = event.url || event.servers[0]?.url || '';
    setActiveMedia({
      url: streamUrl,
      title: event.name || `${event.team1.name} vs ${event.team2.name}`,
      logo: event.logo || event.team1.logo || DEFAULT_LOGO,
      servers: event.servers || [{ name: 'Main', url: streamUrl }],
    });
  };

  // Play a movie
  const handleSelectMovie = (movie: Movie) => {
    const streamUrl = movie.url || movie.servers[0]?.url || '';
    setActiveMedia({
      url: streamUrl,
      title: movie.name,
      logo: movie.poster,
      servers: movie.servers || [{ name: 'Main', url: streamUrl }],
    });
  };

  // Play custom direct link
  const handlePlayDirectUrl = (url: string) => {
    setActiveMedia({
      url,
      title: 'সরাসরি স্ট্রিম (Direct Stream)',
      logo: DEFAULT_LOGO,
      servers: [{ name: 'Direct Link', url }],
    });
    showToast('সরাসরি স্ট্রিম চালু হচ্ছে');
  };

  // Load custom M3U playlist URL
  const handleLoadPlaylistUrl = async (url: string, title: string) => {
    setIsLoadingPlaylist(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const parsed = parseM3U(text);
      if (parsed.length > 0) {
        setChannels(parsed);
        setCurrentTab('live-tv');
        showToast(`✅ ${parsed.length} টি চ্যানেল লোড হয়েছে (${title})`);
      } else {
        showToast('⚠️ প্লেলিস্টে কোনো কার্যকর চ্যানেল পাওয়া যায়নি');
      }
    } catch (err: any) {
      showToast(`❌ প্লেলিস্ট লোড ব্যর্থ: ${err.message || 'CORS বা নেটওয়ার্ক ইরোর'}`);
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  // Channel switching
  const handleNextChannel = () => {
    if (channels.length === 0) return;
    const nextIdx = (currentChannelIndex + 1) % channels.length;
    handleSelectChannel(channels[nextIdx], nextIdx);
  };

  const handlePrevChannel = () => {
    if (channels.length === 0) return;
    const prevIdx = (currentChannelIndex - 1 + channels.length) % channels.length;
    handleSelectChannel(channels[prevIdx], prevIdx);
  };

  // Auto failover when active stream errors
  const handleFailover = () => {
    if (channels.length <= 1) return;
    showToast('⚠️ স্ট্রিম বন্ধ, পরবর্তী চ্যানেলে অটো-সুইচ হচ্ছে...');
    handleNextChannel();
  };

  // Switch server for currently playing media
  const handleSelectServer = (url: string) => {
    if (!activeMedia) return;
    setActiveMedia((prev) => (prev ? { ...prev, url } : null));
    showToast('সার্ভার পরিবর্তন করা হয়েছে');
  };

  const handleRefreshData = () => {
    loadRemoteM3uChannels();
    showToast('🔄 চ্যানেল ও ডাটা রিফ্রেশ করা হয়েছে');
  };

  return (
    <div className={`min-h-screen bg-[#060913] text-[#eef2ff] flex flex-col ${appMode === 'tv' ? 'pl-16' : 'pb-20'}`}>
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        appMode={appMode}
        onSetAppMode={handleSetAppMode}
        onOpenNetlifyGuide={() => setIsNetlifyGuideOpen(true)}
        onRefreshData={handleRefreshData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5">
        {/* Active Streaming Video Player */}
        {activeMedia && (
          <VideoPlayer
            streamUrl={activeMedia.url}
            title={activeMedia.title}
            logo={activeMedia.logo}
            servers={activeMedia.servers}
            onClose={() => setActiveMedia(null)}
            onNextChannel={handleNextChannel}
            onPrevChannel={handlePrevChannel}
            onFailover={handleFailover}
            onSelectServer={handleSelectServer}
          />
        )}

        {/* Tab Views */}
        {currentTab === 'events' && (
          <EventsView events={events} onSelectEvent={handleSelectEvent} />
        )}

        {currentTab === 'live-tv' && (
          <LiveTvView
            channels={channels}
            currentChannelUrl={activeMedia?.url}
            onSelectChannel={handleSelectChannel}
            onReloadChannels={handleRefreshData}
          />
        )}

        {currentTab === 'movies' && (
          <MoviesView movies={movies} onSelectMovie={handleSelectMovie} />
        )}

        {currentTab === 'playlist' && (
          <PlaylistsView
            playlists={playlists}
            onLoadPlaylistUrl={handleLoadPlaylistUrl}
            onPlayDirectUrl={handlePlayDirectUrl}
            isLoading={isLoadingPlaylist}
          />
        )}

        {currentTab === 'netlify-guide' && (
          <div className="py-2">
            <NetlifyGuideModal onClose={() => setCurrentTab('events')} />
          </div>
        )}
      </main>

      {/* Navigation (Bottom for Mobile, Sidebar for TV) */}
      <Navigation
        currentTab={currentTab}
        appMode={appMode}
        onSelectTab={(tab) => {
          if (tab === 'netlify-guide') {
            setIsNetlifyGuideOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
      />

      {/* Netlify Guide Modal */}
      {isNetlifyGuideOpen && (
        <NetlifyGuideModal onClose={() => setIsNetlifyGuideOpen(false)} />
      )}

      {/* Toast Notification */}
      <div
        className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <div className="px-4 py-2 rounded-full bg-slate-900/95 border border-sky-500/40 text-white text-xs font-semibold shadow-2xl backdrop-blur-md">
          {toast.message}
        </div>
      </div>
    </div>
  );
}
