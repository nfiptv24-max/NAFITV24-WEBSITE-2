import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, DataSnapshot } from 'firebase/database';
import { Channel, LiveEvent, Movie, Playlist, StreamServer } from '../types';
import { DEFAULT_LOGO, DEFAULT_POSTER } from '../data/defaultData';

export const FIREBASE_DB_URL = 'https://nafitv24-live-default-rtdb.firebaseio.com';
export const UPDATE_CHANNEL_M3U_URL = 'https://raw.githubusercontent.com/nafitv24-web/NAFI-TV/refs/heads/main/Update%20Channel.m3u';

export interface FirebaseSyncedData {
  events: LiveEvent[];
  movies: Movie[];
  playlists: Playlist[];
  channels: Channel[];
  marqueeNews: string;
  activeUsersCount: number;
  totalUsersCount: number;
  moviesConfigUrl?: string;
  isConnected: boolean;
  lastSyncedAt: Date | null;
}

// Initialize Firebase App
export function getFirebaseDb() {
  try {
    const app = getApps().length === 0
      ? initializeApp({ databaseURL: FIREBASE_DB_URL })
      : getApp();
    return getDatabase(app);
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    return null;
  }
}

// Normalize servers from various formats (array, object, or single url)
export function normalizeServers(rawServers: any, fallbackUrl: string): StreamServer[] {
  if (Array.isArray(rawServers) && rawServers.length > 0) {
    return rawServers.map((s, idx) => ({
      name: typeof s === 'string' ? `Server ${idx + 1}` : (s.name || s.server_name || `Server ${idx + 1}`),
      url: typeof s === 'string' ? s : (s.url || fallbackUrl)
    })).filter(s => !!s.url && s.url.trim() !== '');
  }

  if (rawServers && typeof rawServers === 'object') {
    const list: StreamServer[] = [];
    Object.keys(rawServers).forEach((key, idx) => {
      const val = rawServers[key];
      if (typeof val === 'string') {
        list.push({ name: key || `Server ${idx + 1}`, url: val });
      } else if (val && typeof val === 'object' && val.url) {
        list.push({ name: val.name || val.server_name || key || `Server ${idx + 1}`, url: val.url });
      }
    });
    if (list.length > 0) return list.filter(s => !!s.url && s.url.trim() !== '');
  }

  if (fallbackUrl && fallbackUrl.trim() !== '') {
    return [{ name: 'Main Server', url: fallbackUrl }];
  }

  return [];
}

// Normalize Channels from Firebase Realtime DB
export function normalizeChannel(key: string, item: any): Channel {
  const mainUrl = item.url || item.streamUrl || item.link || item.server1 || (item.servers && item.servers[0]?.url) || '';
  return {
    id: key,
    name: item.name || item.title || item.channelName || 'Unnamed Channel',
    logo: item.logo || item.icon || item.image || item.logoUrl || item.poster || DEFAULT_LOGO,
    url: mainUrl,
    category: item.category || item.group || item.genre || 'Live TV',
    servers: normalizeServers(item.servers, mainUrl)
  };
}

// Normalize Live Events from Firebase Realtime DB
export function normalizeEvent(key: string, item: any): LiveEvent {
  const mainUrl = item.url || item.streamUrl || item.link || (item.servers && item.servers[0]?.url) || '';
  const itemLogo = item.logo || item.logoUrl || item.poster || DEFAULT_LOGO;
  const eventName = item.name || item.title || item.tournament || 'Live Match';

  // Team 1
  let team1 = { name: '', logo: itemLogo };
  if (item.team1 && typeof item.team1 === 'string' && item.team1.trim()) {
    team1.name = item.team1;
    team1.logo = item.team1Logo || itemLogo;
  } else if (item.team1 && typeof item.team1 === 'object') {
    team1 = { name: item.team1.name || 'Team 1', logo: item.team1.logo || itemLogo };
  } else {
    team1 = { name: eventName, logo: itemLogo };
  }

  // Team 2
  let team2 = { name: '', logo: itemLogo };
  if (item.team2 && typeof item.team2 === 'string' && item.team2.trim()) {
    team2.name = item.team2;
    team2.logo = item.team2Logo || itemLogo;
  } else if (item.team2 && typeof item.team2 === 'object') {
    team2 = { name: item.team2.name || 'Team 2', logo: item.team2.logo || itemLogo };
  } else {
    team2 = { name: item.tournament || 'Live Match', logo: itemLogo };
  }

  // Start Time
  let startTime = Date.now();
  if (item.startTime && !isNaN(Number(item.startTime)) && Number(item.startTime) > 0) {
    startTime = Number(item.startTime);
  } else if (item.eventTime || item.matchTimeFormatted) {
    const parsed = new Date(item.eventTime || item.matchTimeFormatted).getTime();
    if (!isNaN(parsed) && parsed > 0) startTime = parsed;
  }

  const isLive = item.isLive === true ||
    (typeof item.status === 'string' && item.status.toLowerCase().includes('live')) ||
    item.status === 'Live Now';

  return {
    id: key,
    sport: item.sport || item.category || 'Cricket',
    status: isLive ? 'Live' : 'Upcoming',
    tournament: item.tournament || item.category || 'Live Sports',
    team1,
    team2,
    startTime,
    name: eventName,
    logo: itemLogo,
    url: mainUrl,
    servers: normalizeServers(item.servers, mainUrl)
  };
}

// Normalize Movies from Firebase Realtime DB
export function normalizeMovie(key: string, item: any): Movie {
  const mainUrl = item.url || item.streamUrl || item.link || (item.servers && item.servers[0]?.url) || '';
  return {
    id: key,
    name: item.name || item.title || 'Movie',
    category: item.category || item.category_name || item.genre || item.sport || 'NAFI OTT',
    poster: item.poster || item.logo || item.logoUrl || item.image || DEFAULT_POSTER,
    url: mainUrl,
    servers: normalizeServers(item.sources || item.servers, mainUrl),
    description: item.description,
    year: item.year,
    rating: item.rating,
    language: item.language,
  };
}

// Parse custom Movie JSON format ({ categories: [ { category_name, movies: [ { title, poster, sources, ... } ] } ] })
export function parseMovieJsonFormat(data: any): Movie[] {
  if (!data || typeof data !== 'object') return [];
  const list: Movie[] = [];

  if (Array.isArray(data.categories)) {
    data.categories.forEach((cat: any) => {
      const catName = cat.category_name || cat.name || 'Movie';
      const movies = cat.movies || cat.items || [];
      if (Array.isArray(movies)) {
        movies.forEach((m: any, idx: number) => {
          const rawSources = m.sources || m.servers || [];
          const servers = normalizeServers(rawSources, m.url || '');
          const mainUrl = servers[0]?.url || m.url || '';
          list.push({
            id: `m_json_${catName}_${idx}_${(m.title || m.name || '').replace(/\s+/g, '_')}`,
            name: m.title || m.name || 'Untitled Movie',
            category: catName,
            poster: m.poster || m.image || DEFAULT_POSTER,
            url: mainUrl,
            servers: servers.length > 0 ? servers : [{ name: 'Main', url: mainUrl }],
            description: m.description,
            year: m.year,
            rating: m.rating,
            language: m.language,
          });
        });
      }
    });
  }

  return list;
}

// Fetch all movie JSON playlist files specified in Firebase app_config.moviesM3uUrl
export async function fetchRemoteMovieJsonPlaylists(urlsString?: string): Promise<Movie[]> {
  const rawUrls = (urlsString || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const targetUrls = rawUrls.length > 0 ? rawUrls : [
    'https://raw.githubusercontent.com/nafitv24-web/NAFI-TV/refs/heads/main/Kolkata%20serial.json',
    'https://raw.githubusercontent.com/nafitv24-web/NAFI-TV/refs/heads/main/movies.json',
  ];

  const allMovies: Movie[] = [];
  for (const url of targetUrls) {
    if (url.toLowerCase().endsWith('.json') || url.includes('.json')) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const text = await resp.text();
        if (text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          const parsed = parseMovieJsonFormat(json);
          allMovies.push(...parsed);
        }
      } catch (err) {
        console.warn('Error fetching movie json playlist:', url, err);
      }
    }
  }
  return allMovies;
}

// Normalize Playlists from Firebase Realtime DB
export function normalizePlaylist(key: string, item: any): Playlist {
  return {
    name: item.name || item.title || 'Playlist',
    url: item.url || item.link || '',
    logo: item.logo || item.logoUrl || item.icon || item.image || DEFAULT_LOGO,
    description: item.description || item.desc || (item.isAdmin ? 'Admin Curated Playlist' : 'M3U Stream Playlist')
  };
}

// Parse entire raw Firebase JSON payload
export function parseFirebasePayload(data: any): Partial<FirebaseSyncedData> {
  if (!data || typeof data !== 'object') return {};

  const result: Partial<FirebaseSyncedData> = {};

  // 1. Events / Sports / Matches
  const rawSports = data.sports || data.matches || data.events || {};
  if (rawSports && typeof rawSports === 'object') {
    const list: LiveEvent[] = [];
    Object.keys(rawSports).forEach((key) => {
      const item = rawSports[key];
      if (item && typeof item === 'object') {
        list.push(normalizeEvent(key, item));
      }
    });
    if (list.length > 0) result.events = list;
  }

  // 2. Movies
  const rawMovies = data.movies || {};
  if (rawMovies && typeof rawMovies === 'object') {
    const list: Movie[] = [];
    Object.keys(rawMovies).forEach((key) => {
      const item = rawMovies[key];
      if (item && typeof item === 'object') {
        list.push(normalizeMovie(key, item));
      }
    });
    if (list.length > 0) result.movies = list;
  }

  // 3. Playlists
  const rawPlaylists = data.playlists || {};
  if (rawPlaylists && typeof rawPlaylists === 'object') {
    const list: Playlist[] = [];
    Object.keys(rawPlaylists).forEach((key) => {
      const item = rawPlaylists[key];
      if (item && typeof item === 'object' && item.url) {
        list.push(normalizePlaylist(key, item));
      }
    });
    if (list.length > 0) result.playlists = list;
  }

  // 4. Custom Channels added in Firebase (channels, live_tv, etc.)
  const rawChannels = data.channels || data.live_tv || data.live_tv_channels || data.liveTv || {};
  if (rawChannels && typeof rawChannels === 'object') {
    const list: Channel[] = [];
    Object.keys(rawChannels).forEach((key) => {
      const item = rawChannels[key];
      if (item && typeof item === 'object') {
        list.push(normalizeChannel(key, item));
      }
    });
    if (list.length > 0) result.channels = list;
  }

  // 5. Marquee News
  if (typeof data.marquee_news === 'string') {
    result.marqueeNews = data.marquee_news;
  } else if (data.marquee_news && typeof data.marquee_news === 'object') {
    const vals = Object.values(data.marquee_news);
    if (vals.length > 0 && typeof vals[0] === 'string') {
      result.marqueeNews = vals[0];
    }
  }

  // 6. User Stats
  if (data.active_users && typeof data.active_users === 'object') {
    result.activeUsersCount = Object.keys(data.active_users).length;
  }
  if (data.all_users && typeof data.all_users === 'object') {
    result.totalUsersCount = Object.keys(data.all_users).length;
  }

  // 7. Movies Config in app_config
  if (data.app_config?.moviesM3uUrl) {
    result.moviesConfigUrl = data.app_config.moviesM3uUrl;
  }

  result.lastSyncedAt = new Date();
  result.isConnected = true;

  return result;
}

// Combine and deduplicate movies from direct Firebase and remote JSON playlists
export async function loadAllMovies(
  fbMovies: Movie[] = [],
  moviesConfigUrl?: string
): Promise<Movie[]> {
  try {
    const jsonMovies = await fetchRemoteMovieJsonPlaylists(moviesConfigUrl);
    const seen = new Set<string>();
    const combined: Movie[] = [];

    // Prioritize JSON playlists (rich categories, episodes & posters), then Firebase direct
    [...jsonMovies, ...fbMovies].forEach((m) => {
      const key = `${m.name.trim().toLowerCase()}_${m.category.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(m);
      }
    });

    return combined.length > 0 ? combined : fbMovies;
  } catch (err) {
    console.warn('Error loading all movies:', err);
    return fbMovies;
  }
}

// REST fallback fetcher
export async function fetchFirebaseRootRest(): Promise<Partial<FirebaseSyncedData> | null> {
  try {
    const resp = await fetch(`${FIREBASE_DB_URL}/.json`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return parseFirebasePayload(json);
  } catch (err) {
    console.warn('Firebase REST fetch error:', err);
    return null;
  }
}

// Subscribe to real-time changes in Firebase
export function subscribeToFirebase(
  onUpdate: (data: Partial<FirebaseSyncedData>) => void
): () => void {
  // First, immediately attempt REST fetch for fastest initial load
  fetchFirebaseRootRest().then((initialData) => {
    if (initialData) {
      onUpdate(initialData);
    }
  });

  const db = getFirebaseDb();
  if (!db) {
    // If Firebase SDK cannot initialize, poll via REST every 15 seconds
    const interval = setInterval(async () => {
      const data = await fetchFirebaseRootRest();
      if (data) onUpdate(data);
    }, 15000);
    return () => clearInterval(interval);
  }

  const rootRef = ref(db);
  const unsubscribe = onValue(
    rootRef,
    (snapshot: DataSnapshot) => {
      const val = snapshot.val();
      if (val) {
        const parsed = parseFirebasePayload(val);
        onUpdate(parsed);
      }
    },
    (error) => {
      console.warn('Firebase RTDB onValue listener error:', error);
      // Fallback to REST polling
      fetchFirebaseRootRest().then((data) => {
        if (data) onUpdate(data);
      });
    }
  );

  return () => {
    try {
      off(rootRef);
    } catch (_) {}
  };
}
