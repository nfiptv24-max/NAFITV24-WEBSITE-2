import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { MarqueeBanner } from './components/MarqueeBanner';
import { VideoPlayer } from './components/VideoPlayer';
import { EventsView } from './components/EventsView';
import { LiveTvView } from './components/LiveTvView';
import { MoviesView } from './components/MoviesView';
import { PlaylistsView } from './components/PlaylistsView';
import { Navigation } from './components/Navigation';
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
import {
  subscribeToFirebase,
  fetchFirebaseRootRest,
  loadAllMovies,
  UPDATE_CHANNEL_M3U_URL,
  FIREBASE_DB_URL,
  FirebaseSyncedData,
} from './services/firebaseSync';

export default function App() {
  // App settings & view state
  const [appMode, setAppMode] = useState<AppMode>('mobile');
  const [currentTab, setCurrentTab] = useState<TabView>('events');

  // Content Data State
  const [m3uChannels, setM3uChannels] = useState<Channel[]>([]);
  const [firebaseChannels, setFirebaseChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [movies, setMovies] = useState<Movie[]>(INITIAL_MOVIES);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Firebase Realtime Metadata State
  const [marqueeNews, setMarqueeNews] = useState<string>(
    'NAFI TV 24 এ ক্রিকেট, ফুটবল ও লাইভ টিভি চ্যানেল মুভি সিরিজ উপভোগ করুন।'
  );
  const [activeUsersCount, setActiveUsersCount] = useState<number>(4);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

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

  // Combined channels: Firebase admin-added channels first, then M3U playlist channels
  const channels = useMemo(() => {
    if (firebaseChannels.length === 0 && m3uChannels.length === 0) {
      return FALLBACK_CHANNELS;
    }
    // Deduplicate by name & url
    const seen = new Set<string>();
    const list: Channel[] = [];

    [...firebaseChannels, ...m3uChannels].forEach((ch) => {
      const key = `${ch.name.toLowerCase()}_${ch.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(ch);
      }
    });

    return list.length > 0 ? list : FALLBACK_CHANNELS;
  }, [firebaseChannels, m3uChannels]);

  // Mode persistence & initial loading
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('nafitv_mode') as AppMode;
      if (savedMode === 'tv' || savedMode === 'mobile') {
        setAppMode(savedMode);
      }
    } catch (_) {}

    // 1. Initial fetch of Update Channel M3U
    loadRemoteM3uChannels();

    // Load initial movies including remote JSON playlists (Kolkata serial, Bangla movies, etc.)
    loadAllMovies(INITIAL_MOVIES).then((loaded) => {
      if (loaded && loaded.length > 0) {
        setMovies(loaded);
      }
    });

    // 2. Subscribe to Firebase Realtime Database
    const unsubscribe = subscribeToFirebase((syncedData: Partial<FirebaseSyncedData>) => {
      if (syncedData.events && syncedData.events.length > 0) {
        setEvents(syncedData.events);
      }
      // Load both direct Firebase movies and JSON playlists specified in app_config.moviesM3uUrl
      loadAllMovies(syncedData.movies || [], syncedData.moviesConfigUrl).then((allMovies) => {
        if (allMovies && allMovies.length > 0) {
          setMovies(allMovies);
        }
      });
      if (syncedData.playlists && syncedData.playlists.length > 0) {
        setPlaylists(syncedData.playlists);
      }
      if (syncedData.channels && syncedData.channels.length > 0) {
        setFirebaseChannels(syncedData.channels);
      }
      if (syncedData.marqueeNews) {
        setMarqueeNews(syncedData.marqueeNews);
      }
      if (typeof syncedData.activeUsersCount === 'number') {
        setActiveUsersCount(syncedData.activeUsersCount);
      }
      if (typeof syncedData.isConnected === 'boolean') {
        setIsFirebaseConnected(syncedData.isConnected);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSetAppMode = (mode: AppMode) => {
    setAppMode(mode);
    try {
      localStorage.setItem('nafitv_mode', mode);
    } catch (_) {}
    showToast(mode === 'tv' ? '📺 TV মোড চালু হয়েছে' : '📱 মোবাইল মোড চালু হয়েছে');
  };

  // Fetch channels from M3U list (starting with Update Channel.m3u)
  const loadRemoteM3uChannels = async () => {
    setIsLoadingChannels(true);
    for (const src of M3U_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(src, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resp.ok) continue;
        const text = await resp.text();
        const parsed = parseM3U(text);
        if (parsed.length > 0) {
          setM3uChannels(parsed);
          setIsLoadingChannels(false);
          return;
        }
      } catch (_) {
        continue;
      }
    }
    setIsLoadingChannels(false);
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
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const parsed = parseM3U(text);
      if (parsed.length > 0) {
        setM3uChannels(parsed);
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

  const handleRefreshData = async () => {
    showToast('🔄 ডাটা ও চ্যানেল রিফ্রেশ হচ্ছে...');
    loadRemoteM3uChannels();
    const updated = await fetchFirebaseRootRest();
    if (updated) {
      if (updated.events) setEvents(updated.events);
      if (updated.movies) setMovies(updated.movies);
      if (updated.playlists) setPlaylists(updated.playlists);
      if (updated.channels) setFirebaseChannels(updated.channels);
      if (updated.marqueeNews) setMarqueeNews(updated.marqueeNews);
      if (typeof updated.activeUsersCount === 'number') {
        setActiveUsersCount(updated.activeUsersCount);
      }
    }
    showToast('✅ Firebase ও M3U চ্যানেল রিফ্রেশ সম্পন্ন');
  };

  return (
    <div className={`min-h-screen bg-[#060913] text-[#eef2ff] flex flex-col ${appMode === 'tv' ? 'pl-16' : 'pb-20'}`}>
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        appMode={appMode}
        onSetAppMode={handleSetAppMode}
        onRefreshData={handleRefreshData}
        isFirebaseConnected={isFirebaseConnected}
        activeUsersCount={activeUsersCount}
      />

      {/* Marquee Notice Banner from Firebase */}
      <MarqueeBanner
        news={marqueeNews}
        activeUsers={activeUsersCount}
        isConnected={isFirebaseConnected}
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
            isLoading={isLoadingChannels}
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
      </main>

      {/* Navigation (Bottom for Mobile, Sidebar for TV) */}
      <Navigation
        currentTab={currentTab}
        appMode={appMode}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

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
