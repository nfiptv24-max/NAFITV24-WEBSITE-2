export interface StreamServer {
  name: string;
  url: string;
}

export interface Channel {
  id?: string;
  name: string;
  logo: string;
  url: string;
  servers: StreamServer[];
  category?: string;
}

export interface LiveEvent {
  id?: string;
  sport: 'Cricket' | 'Football' | string;
  status: 'Live' | 'Upcoming';
  tournament: string;
  team1: { name: string; logo: string };
  team2: { name: string; logo: string };
  startTime: number;
  servers: StreamServer[];
  logo?: string;
  name?: string;
  url?: string;
}

export interface Movie {
  id?: string;
  name: string;
  category: 'Bangla' | 'Hindi' | 'Hollywood' | 'Bollywood' | string;
  poster: string;
  url: string;
  servers: StreamServer[];
}

export interface Playlist {
  name: string;
  url: string;
  logo: string;
  description?: string;
}

export type AppMode = 'mobile' | 'tv';

export type TabView = 'events' | 'live-tv' | 'movies' | 'playlist' | 'menu' | 'netlify-guide';
