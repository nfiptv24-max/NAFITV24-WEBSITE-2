import { Channel } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';

// Normalize Unicode mathematical stylized characters to standard ASCII/Unicode
export function normalizeUnicodeText(text: string): string {
  if (!text) return '';
  return text
    // Mathematical Bold Capital (0x1D400 - 0x1D419) -> A-Z
    .replace(/[\uD835][\uDC00-\uDC19]/g, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1D400 + 65))
    // Mathematical Bold Small (0x1D41A - 0x1D433) -> a-z
    .replace(/[\uD835][\uDC1A-\uDC33]/g, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1D41A + 97))
    // Mathematical Sans-Serif Bold Capital (0x1D5D4 - 0x1D5ED) -> A-Z
    .replace(/[\uD835][\uDDD4-\uDDED]/g, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1D5D4 + 65))
    // Mathematical Sans-Serif Bold Small (0x1D5EE - 0x1D607) -> a-z
    .replace(/[\uD835][\uDDEE-\uDE07]/g, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1D5EE + 97))
    .trim();
}

export function parseM3U(text: string): Channel[] {
  const trimmed = text.trim();

  // 1. Try parsing JSON format (NAFI TV Update Channel format uses JSON with categories and movies/channels)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const parsedChannels: Channel[] = [];

      // Structure: { categories: [ { category_name: 'BANGLADESH', movies: [ { title, poster, sources: [{server_name, url}] } ] } ] }
      if (data && Array.isArray(data.categories)) {
        data.categories.forEach((cat: any) => {
          const categoryName = cat.category_name || cat.name || 'General';
          const items = cat.movies || cat.channels || cat.streams || [];
          if (Array.isArray(items)) {
            items.forEach((item: any, idx: number) => {
              const name = item.title || item.name || `Channel ${idx + 1}`;
              const logo = item.poster || item.logo || item.icon || DEFAULT_LOGO;
              
              // Extract servers/sources
              const servers: { name: string; url: string }[] = [];
              if (Array.isArray(item.sources)) {
                item.sources.forEach((s: any, sIdx: number) => {
                  if (s && s.url && typeof s.url === 'string' && s.url.trim()) {
                    servers.push({
                      name: s.server_name || s.name || `Server ${sIdx + 1}`,
                      url: s.url.trim()
                    });
                  }
                });
              } else if (Array.isArray(item.servers)) {
                item.servers.forEach((s: any, sIdx: number) => {
                  if (s && s.url) {
                    servers.push({
                      name: s.name || `Server ${sIdx + 1}`,
                      url: s.url.trim()
                    });
                  }
                });
              }

              const mainUrl = servers[0]?.url || item.url || item.streamUrl || '';
              if (mainUrl) {
                if (servers.length === 0) {
                  servers.push({ name: 'Main Server', url: mainUrl });
                }
                parsedChannels.push({
                  name,
                  logo,
                  category: categoryName,
                  url: mainUrl,
                  servers
                });
              }
            });
          }
        });
      }

      // If array of channels or object
      if (parsedChannels.length === 0) {
        const rawList = Array.isArray(data) ? data : (data.channels || data.streams || []);
        if (Array.isArray(rawList)) {
          rawList.forEach((item: any, idx: number) => {
            const name = item.name || item.title || `Channel ${idx + 1}`;
            const logo = item.logo || item.poster || DEFAULT_LOGO;
            const url = item.url || item.streamUrl || '';
            if (url) {
              parsedChannels.push({
                name,
                logo,
                category: item.category || 'General',
                url,
                servers: [{ name: 'Main', url }]
              });
            }
          });
        }
      }

      if (parsedChannels.length > 0) {
        return parsedChannels;
      }
    } catch (_) {
      // Fall through to standard M3U line parser
    }
  }

  // 2. Standard #EXTM3U parser
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      current = {
        name: 'Channel',
        logo: DEFAULT_LOGO,
        url: '',
        servers: []
      };

      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) {
        current.logo = logoMatch[1];
      }

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1]) {
        current.category = normalizeUnicodeText(groupMatch[1]);
      }

      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        const name = line.substring(commaIndex + 1).trim();
        if (name) current.name = normalizeUnicodeText(name);
      }
      continue;
    }

    if (current && line && !line.startsWith('#')) {
      const streamUrl = line;
      current.url = streamUrl;
      current.servers = [{ name: 'Server 1', url: streamUrl }];

      // Check if channel already exists; if so, add as another server option
      const existing = channels.find(c => c.name.toLowerCase() === current!.name?.toLowerCase());
      if (existing && streamUrl !== existing.url) {
        if (!existing.servers) {
          existing.servers = [{ name: 'Server 1', url: existing.url }];
        }
        existing.servers.push({
          name: `Server ${existing.servers.length + 1}`,
          url: streamUrl
        });
      } else {
        channels.push(current as Channel);
      }
      current = null;
    }
  }

  // Fallback for simple raw URL lists without #EXTINF
  if (channels.length === 0) {
    const urlLines = lines.filter(l => l.trim() && !l.startsWith('#') && (l.startsWith('http://') || l.startsWith('https://')));
    urlLines.forEach((u, idx) => {
      channels.push({
        name: `Stream Channel ${idx + 1}`,
        logo: DEFAULT_LOGO,
        url: u,
        servers: [{ name: 'Server 1', url: u }]
      });
    });
  }

  return channels;
}

export function formatSeconds(secs: number): string {
  if (isNaN(secs) || !isFinite(secs) || secs < 0) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export class WakeLockManager {
  private wakeLock: any = null;
  private interval: any = null;

  async request(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator) {
        if (this.wakeLock) {
          try { await this.wakeLock.release(); } catch (_) {}
          this.wakeLock = null;
        }
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        return true;
      }
    } catch (e) {
      // Wake lock request error
    }
    return false;
  }

  release(): void {
    if (this.wakeLock) {
      try { this.wakeLock.release(); } catch (_) {}
      this.wakeLock = null;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  startKeepAlive(isPlaying: () => boolean): void {
    this.release();
    this.interval = setInterval(async () => {
      if (isPlaying()) {
        await this.request();
      } else {
        this.release();
      }
    }, 10000);
  }
}
