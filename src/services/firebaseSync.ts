import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, DataSnapshot } from 'firebase/database';
import { Channel, LiveEvent, Movie, Playlist, StreamServer } from '../types';
import { DEFAULT_LOGO, DEFAULT_POSTER } from '../data/defaultData';
import { parseM3U } from '../utils/streamUtils';

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
  sportsConfigUrl?: string;
  liveTvConfigUrl?: string;
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
    })).filter(s => !!s.url && typeof s.url === 'string' && s.url.trim() !== '');
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
    if (list.length > 0) return list.filter(s => !!s.url && typeof s.url === 'string' && s.url.trim() !== '');
  }

  if (fallbackUrl && fallbackUrl.trim() !== '') {
    return [{ name: 'Server 1', url: fallbackUrl }];
  }

  return [];
}

// Extract all potential servers, mirrors, and stream URLs from any item node
export function extractServersFromItem(item: any, fallbackUrl: string): StreamServer[] {
  const servers: StreamServer[] = [];
  const seenUrls = new Set<string>();

  const add = (name: string, url: any) => {
    if (typeof url === 'string' && url.trim().startsWith('http')) {
      const cleanUrl = url.trim();
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        servers.push({
          name: name || `Server ${servers.length + 1}`,
          url: cleanUrl,
        });
      }
    }
  };

  // 1. Array or object servers
  if (item?.servers) {
    normalizeServers(item.servers, '').forEach((s) => add(s.name, s.url));
  }
  if (item?.sources) {
    normalizeServers(item.sources, '').forEach((s) => add(s.name, s.url));
  }

  // 2. Multi-server fields (server1..server8, link1..link8, etc.)
  for (let i = 1; i <= 8; i++) {
    if (item?.[`server${i}`]) add(`Server ${i}`, item[`server${i}`]);
    if (item?.[`server_${i}`]) add(`Server ${i}`, item[`server_${i}`]);
    if (item?.[`link${i}`]) add(`Server ${i}`, item[`link${i}`]);
    if (item?.[`link_${i}`]) add(`Server ${i}`, item[`link_${i}`]);
    if (item?.[`stream_url${i}`]) add(`Server ${i}`, item[`stream_url${i}`]);
  }

  if (item?.backup_url) add('Backup Server', item.backup_url);
  if (item?.alternate_url) add('Alternate Server', item.alternate_url);

  // 3. Fallback main URL
  if (fallbackUrl) {
    add('Server 1', fallbackUrl);
  }

  return servers.length > 0 ? servers : fallbackUrl ? [{ name: 'Server 1', url: fallbackUrl }] : [];
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
    servers: extractServersFromItem(item, mainUrl)
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
    servers: extractServersFromItem(item, mainUrl)
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
    servers: extractServersFromItem(item, mainUrl),
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

// Fetch remote sports playlists and JSON event sources (matches, tournaments, streams)
export async function fetchRemoteSportsPlaylists(sportsConfigUrl?: string): Promise<LiveEvent[]> {
  const allEvents: LiveEvent[] = [];
  if (!sportsConfigUrl) return allEvents;

  const urls = sportsConfigUrl
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));

  for (const url of urls) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) continue;
      const text = await resp.text();
      const trimmed = text.trim();

      // 1. JSON Sports Event Formats (Matches, matches, live_matches, upcoming_matches)
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const json = JSON.parse(trimmed);
        const list =
          json.Matches ||
          json.matches ||
          json.live_matches ||
          json.upcoming_matches ||
          (Array.isArray(json) ? json : []);

        if (Array.isArray(list)) {
          list.forEach((item: any, idx: number) => {
            const title =
              item.title ||
              item.name ||
              (item.localteam_name && item.visitorteam_name
                ? `${item.localteam_name} vs ${item.visitorteam_name}`
                : `Sports Event ${idx + 1}`);

            // Servers extraction
            const servers: StreamServer[] = [];
            if (Array.isArray(item.link_live)) {
              item.link_live.forEach((l: any, lIdx: number) => {
                const sUrl = l.stream_link || l.videoURL;
                if (sUrl && typeof sUrl === 'string' && sUrl.trim()) {
                  servers.push({
                    name: l.display_name || `Server ${lIdx + 1}`,
                    url: sUrl.trim(),
                  });
                }
              });
            }
            if (item.stream_url_alpha && typeof item.stream_url_alpha === 'object') {
              Object.entries(item.stream_url_alpha).forEach(([sName, sUrl]) => {
                if (typeof sUrl === 'string' && sUrl.trim()) {
                  servers.push({ name: sName, url: sUrl.trim() });
                }
              });
            }
            if (item.stream_url_bravo && typeof item.stream_url_bravo === 'object') {
              Object.entries(item.stream_url_bravo).forEach(([sName, sUrl]) => {
                if (typeof sUrl === 'string' && sUrl.trim()) {
                  servers.push({ name: sName, url: sUrl.trim() });
                }
              });
            }
            if (Array.isArray(item.servers)) {
              servers.push(...normalizeServers(item.servers, ''));
            }

            const mainUrl =
              servers[0]?.url ||
              item.stream_url ||
              item.url ||
              item.videoURL ||
              item.stream_link ||
              '';

            if (mainUrl) {
              if (servers.length === 0) {
                servers.push({ name: 'Live Stream', url: mainUrl });
              }

              const logo =
                item.cover_image ||
                item.league_logo ||
                item.logo ||
                item.poster ||
                item.localteam_logo ||
                DEFAULT_POSTER;

              const team1Name =
                item.localteam_name ||
                item.team1?.name ||
                (typeof item.team1 === 'string' ? item.team1 : title);
              const team1Logo =
                item.localteam_logo || item.team1?.logo || item.team1Logo || logo;
              const team2Name =
                item.visitorteam_name ||
                item.team2?.name ||
                (typeof item.team2 === 'string' ? item.team2 : 'Opponent');
              const team2Logo =
                item.visitorteam_logo || item.team2?.logo || item.team2Logo || logo;

              let startTime = Date.now();
              if (item.timestamp && !isNaN(Number(item.timestamp))) {
                startTime = Number(item.timestamp) * 1000;
              } else if (item.start_at && !isNaN(Number(item.start_at))) {
                startTime = Number(item.start_at) * 1000;
              }

              const isLive =
                item.status === 'LIVE' ||
                item.is_playing === true ||
                (typeof item.status === 'string' &&
                  item.status.toLowerCase().includes('live'));

              allEvents.push({
                id: `sports_${idx}_${Date.now()}`,
                name: title,
                sport:
                  item.sport || item.category || item.league_name || 'Live Sports',
                status: isLive ? 'Live' : 'Upcoming',
                tournament:
                  item.league_name ||
                  item.tournament ||
                  item.category ||
                  'Live Sports',
                team1: { name: team1Name, logo: team1Logo },
                team2: { name: team2Name, logo: team2Logo },
                startTime,
                logo,
                url: mainUrl,
                servers,
              });
            }
          });
        }
      } else if (trimmed.includes('#EXTINF')) {
        // 2. M3U Sports Playlist format
        const lines = trimmed.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
            const nextLine = lines[i + 1]?.trim();
            if (
              nextLine &&
              !nextLine.startsWith('#') &&
              (nextLine.startsWith('http://') || nextLine.startsWith('https://'))
            ) {
              const nameMatch = line.match(/,(.+)$/);
              const title = nameMatch ? nameMatch[1].trim() : 'Live Sports Stream';
              const logoMatch = line.match(/tvg-logo="([^"]+)"/);
              const logo = logoMatch ? logoMatch[1] : DEFAULT_POSTER;
              const groupMatch = line.match(/group-title="([^"]+)"/);
              const sport = groupMatch ? groupMatch[1] : 'Live Sports';

              allEvents.push({
                id: `m3u_sports_${i}`,
                name: title,
                sport,
                status: 'Live',
                tournament: sport,
                team1: { name: title, logo },
                team2: { name: 'Live Stream', logo },
                startTime: Date.now(),
                logo,
                url: nextLine,
                servers: [{ name: 'Server 1', url: nextLine }],
              });
              i++; // skip nextLine
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching sports playlist:', url, err);
    }
  }

  return allEvents;
}

// Fetch remote channels from liveTvM3uUrl configuration
export async function loadRemoteChannelsFromConfig(
  liveTvConfigUrl?: string
): Promise<Channel[]> {
  const allChannels: Channel[] = [];
  if (!liveTvConfigUrl) return allChannels;

  const urls = liveTvConfigUrl
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('http://') || s.startsWith('https://'));

  for (const url of urls) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const text = await resp.text();
      const parsed = parseM3U(text);
      allChannels.push(...parsed);
    } catch (err) {
      console.warn('Error fetching live tv m3u from config:', url, err);
    }
  }

  return allChannels;
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

  // 1. Events / Sports / Matches from all active Firebase nodes
  const eventMap = new Map<string, LiveEvent>();
  const collectEvents = (container: any) => {
    if (container && typeof container === 'object') {
      Object.keys(container).forEach((key) => {
        const item = container[key];
        if (item && typeof item === 'object') {
          const ev = normalizeEvent(key, item);
          if (ev.name) {
            eventMap.set(ev.name.trim().toLowerCase(), ev);
          }
        }
      });
    }
  };

  collectEvents(data.sports);
  collectEvents(data.matches);
  collectEvents(data.events);
  collectEvents(data.live_events);
  collectEvents(data.sports_events);

  if (eventMap.size > 0) {
    result.events = Array.from(eventMap.values());
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

  // 7. Config URLs in app_config
  if (data.app_config?.moviesM3uUrl) {
    result.moviesConfigUrl = data.app_config.moviesM3uUrl;
  }
  if (data.app_config?.sportsM3uUrl) {
    result.sportsConfigUrl = data.app_config.sportsM3uUrl;
  }
  if (data.app_config?.liveTvM3uUrl) {
    result.liveTvConfigUrl = data.app_config.liveTvM3uUrl;
  }

  result.lastSyncedAt = new Date();
  result.isConnected = true;

  return result;
}

// Combine and deduplicate events from direct Firebase and remote sports playlists
export async function loadAllEvents(
  fbEvents: LiveEvent[] = [],
  sportsConfigUrl?: string
): Promise<LiveEvent[]> {
  try {
    const remoteEvents = await fetchRemoteSportsPlaylists(sportsConfigUrl);
    const seen = new Set<string>();
    const combined: LiveEvent[] = [];

    // Prioritize direct Firebase events
    fbEvents.forEach((ev) => {
      const key = (ev.name || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(ev);
      }
    });

    // Then parsed remote events
    remoteEvents.forEach((ev) => {
      const key = (ev.name || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(ev);
      }
    });

    return combined.length > 0 ? combined : fbEvents;
  } catch (err) {
    console.warn('Error loading all events:', err);
    return fbEvents;
  }
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
