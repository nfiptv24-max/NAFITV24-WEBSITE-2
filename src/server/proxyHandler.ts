import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

export function rewriteM3U8(content: string, baseUrl: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Rewrite any URI attributes in tags like #EXT-X-KEY:METHOD=...,URI="..." or #EXT-X-MAP:URI="..."
      const rewrittenTag = trimmed.replace(/URI=["']([^"']+)["']/g, (_match, uri) => {
        try {
          const abs = new URL(uri, baseUrl).toString();
          return `URI="/api/proxy?url=${encodeURIComponent(abs)}"`;
        } catch {
          return _match;
        }
      });
      out.push(rewrittenTag);
    } else {
      // Line is a media segment or sub-playlist URL
      try {
        const abs = new URL(trimmed, baseUrl).toString();
        out.push(`/api/proxy?url=${encodeURIComponent(abs)}`);
      } catch {
        out.push(line);
      }
    }
  }

  return out.join('\n');
}

export async function handleStreamProxy(req: IncomingMessage, res: ServerResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const parsedReqUrl = new URL(req.url || '', 'http://localhost');
    const targetUrl = parsedReqUrl.searchParams.get('url');

    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Missing "url" query parameter');
      return;
    }

    // Build headers to forward
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.statusCode = upstreamRes.status;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Upstream returned HTTP ${upstreamRes.status}`);
      return;
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const isM3U8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      targetUrl.toLowerCase().includes('.m3u8') ||
      targetUrl.toLowerCase().includes('index.m3u8');

    // Forward status code (e.g. 200 or 206 Partial Content)
    res.statusCode = upstreamRes.status;

    // Forward key caching and range headers
    const headersToForward = ['accept-ranges', 'content-range', 'content-length', 'cache-control'];
    for (const h of headersToForward) {
      const val = upstreamRes.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    if (isM3U8 && req.method !== 'HEAD') {
      const text = await upstreamRes.text();
      // Check if it really is M3U format
      if (text.trim().startsWith('#EXTM3U') || text.includes('#EXTINF') || text.includes('#EXT-X-STREAM-INF')) {
        const rewritten = rewriteM3U8(text, upstreamRes.url || targetUrl);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(rewritten).toString());
        res.end(rewritten);
        return;
      }
    }

    // Direct streaming for TS segments, MP4, MKV, etc.
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else if (targetUrl.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }

    if (req.method === 'HEAD' || !upstreamRes.body) {
      res.end();
      return;
    }

    // Pipe response body to client
    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.pipe(res);

    nodeStream.on('error', (err) => {
      console.warn('Proxy streaming error:', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Streaming error');
      }
    });
  } catch (error: any) {
    console.error('Proxy handler error:', error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Proxy error: ${error.message || 'Failed to fetch upstream URL'}`);
    }
  }
}
