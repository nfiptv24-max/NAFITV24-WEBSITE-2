import { Channel, LiveEvent, Movie, Playlist } from '../types';

export const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/716/716429.png";
export const DEFAULT_POSTER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80";

export const M3U_SOURCES = [
  'https://raw.githubusercontent.com/nafitv24-web/NAFI-TV/refs/heads/main/Update%20Channel.m3u',
  'https://raw.githubusercontent.com/nfiptv24-max/NAFITV/refs/heads/main/Nafitv24.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/22.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/14.m3u',
];

export const FALLBACK_CHANNELS: Channel[] = [
  {
    name: 'BBC News',
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/gb/bbc-world-news.png',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    servers: [
      { name: 'Server 1 (HLS)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      { name: 'Server 2 (Akamai)', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' }
    ],
    category: 'News'
  },
  {
    name: 'Sky News Live',
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/gb/sky-news.png',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    servers: [
      { name: 'Main (HD)', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' },
      { name: 'Mux CDN', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    category: 'News'
  },
  {
    name: 'Al Jazeera English',
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/qa/al-jazeera.png',
    url: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8',
    servers: [
      { name: 'Direct HLS', url: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8' },
      { name: 'Backup', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    category: 'News'
  },
  {
    name: 'DW News HD',
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/de/dw.png',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    servers: [
      { name: 'Akamai 102', url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8' },
      { name: 'Akamai Test', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' }
    ],
    category: 'News'
  },
  {
    name: 'France 24 English',
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/fr/france-24.png',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
    servers: [
      { name: 'France24 CDN', url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8' },
      { name: 'Mux Backup', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    category: 'News'
  },
  {
    name: 'Sports HD Stream 1',
    logo: 'https://cdn-icons-png.flaticon.com/512/861/861512.png',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    servers: [
      { name: 'Main 1080p', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      { name: 'Backup 720p', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' }
    ],
    category: 'Sports'
  },
  {
    name: 'Big Buck Bunny (4K Test)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    servers: [
      { name: 'Direct MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { name: 'HLS Mux', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    category: 'Entertainment'
  },
  {
    name: 'Tears of Steel (Sci-Fi)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Tears_of_Steel_poster.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    servers: [
      { name: 'Direct MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ],
    category: 'Movies'
  },
  {
    name: 'Sintel Open Movie',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Sintel_poster.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    servers: [
      { name: 'Direct MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
    ],
    category: 'Movies'
  }
];

export const INITIAL_EVENTS: LiveEvent[] = [
  {
    sport: 'Cricket',
    status: 'Live',
    tournament: 'ICC Champions Trophy',
    team1: { name: 'Bangladesh', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/bd/bd.png' },
    team2: { name: 'India', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/in/in.png' },
    startTime: Date.now() - 1800000, // started 30 mins ago
    servers: [
      { name: 'Server 1 (FHD)', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' },
      { name: 'Server 2 (HD)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/bd/bd.png',
    name: 'Bangladesh vs India'
  },
  {
    sport: 'Football',
    status: 'Live',
    tournament: 'UEFA Champions League',
    team1: { name: 'Real Madrid', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/real-madrid.png' },
    team2: { name: 'Manchester City', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/manchester-city.png' },
    startTime: Date.now() - 2700000, // started 45 mins ago
    servers: [
      { name: 'Server 1', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      { name: 'Server 2', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' }
    ],
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/real-madrid.png',
    name: 'Real Madrid vs Manchester City'
  },
  {
    sport: 'Football',
    status: 'Upcoming',
    tournament: 'English Premier League',
    team1: { name: 'Manchester Utd', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/manchester-united.png' },
    team2: { name: 'Liverpool', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/liverpool.png' },
    startTime: Date.now() + 7200000, // in 2 hours
    servers: [
      { name: 'Main Feed', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' },
      { name: 'Backup Feed', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ],
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/clubs/manchester-united.png',
    name: 'Manchester Utd vs Liverpool'
  },
  {
    sport: 'Cricket',
    status: 'Upcoming',
    tournament: 'Asia Cup Super 4',
    team1: { name: 'Pakistan', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/pk/pk.png' },
    team2: { name: 'Sri Lanka', logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/lk/lk.png' },
    startTime: Date.now() + 14400000, // in 4 hours
    servers: [
      { name: 'Feed A', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      { name: 'Feed B', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' }
    ],
    logo: 'https://cdn.jsdelivr.net/gh/iptv-org/icons@master/country/pk/pk.png',
    name: 'Pakistan vs Sri Lanka'
  }
];

export const INITIAL_MOVIES: Movie[] = [
  {
    name: 'The Dark Knight',
    category: 'Hollywood',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    servers: [
      { name: '1080p Stream', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { name: 'Backup HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ]
  },
  {
    name: 'Inception',
    category: 'Hollywood',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    servers: [
      { name: 'HD Stream', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  },
  {
    name: 'Interstellar',
    category: 'Hollywood',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    servers: [
      { name: 'Full HD', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
    ]
  },
  {
    name: '3 Idiots',
    category: 'Bollywood',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTMzNjg3YTAtZWM4OC00ZDk2LTg2NmQtMjRlMjVhMmFmZjliXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    servers: [
      { name: 'Server 1', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
    ]
  },
  {
    name: 'Sholay',
    category: 'Bollywood',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWE1YzA5MjUtNzI1MS00NWY5LWEzNjYtZWU3YzZkOWU2ODk0XkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    servers: [
      { name: 'Classic Server', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  },
  {
    name: 'Pather Panchali',
    category: 'Bangla',
    poster: 'https://m.media-amazon.com/images/M/MV5BZjZkZjE1NzMtN2I2ZS00YzI0LWE1M2YtNTY2ZTViNzhjY2E1XkEyXkFqcGdeQXVyNzUxNDE4ODU@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    servers: [
      { name: 'Main Feed', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
    ]
  },
  {
    name: 'Hawa (হাওয়া)',
    category: 'Bangla',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA0ZGVhMTktMmJhYi00YzM4LWJjNzEtOGVmMmQ4YjJmY2FkXkEyXkFqcGc@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    servers: [
      { name: 'Server 1', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
    ]
  },
  {
    name: 'Dangal',
    category: 'Hindi',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTQ4MzQzMzM2Nl5BMl5BanBnXkFtZTgwMTQ1NzU3MDI@._V1_.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    servers: [
      { name: 'Hindi HD', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  }
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    name: 'NAFI Sports HD',
    url: 'https://raw.githubusercontent.com/nfiptv24-max/NAFITV/refs/heads/main/Nafitv24.m3u',
    logo: 'https://cdn-icons-png.flaticon.com/512/861/861512.png',
    description: 'Live Cricket, Football & Sports Channels'
  },
  {
    name: 'World News 24/7',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/22.m3u',
    logo: 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png',
    description: 'International verified news feeds'
  },
  {
    name: 'Entertainment & Music',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/14.m3u',
    logo: 'https://cdn-icons-png.flaticon.com/512/3845/3845868.png',
    description: 'Music, Drama & Entertainment TV'
  }
];
