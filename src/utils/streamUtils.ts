import { Channel } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';

export function parseM3U(text: string): Channel[] {
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
        current.category = groupMatch[1];
      }

      const commaIndex = line.lastIndexOf(',');
      if (commaIndex !== -1) {
        const name = line.substring(commaIndex + 1).trim();
        if (name) current.name = name;
      }
      continue;
    }

    if (current && line && !line.startsWith('#')) {
      const streamUrl = line;
      current.url = streamUrl;
      current.servers = [{ name: 'Main', url: streamUrl }];
      channels.push(current as Channel);
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
        servers: [{ name: 'Main', url: u }]
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
