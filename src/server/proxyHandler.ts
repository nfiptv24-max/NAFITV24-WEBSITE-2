import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { handleRemuxStream } from './remuxHandler';

// Rewrite M3U8 URLs so segments and nested playlists are routed through the proxy
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

// Helper to fetch with automatic retry on transient connection failures
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delayMs = 300
): Promise<Response> {
  let lastError: any;
  const mergedOptions: RequestInit = {
    ...options,
    cache: 'no-store',
  };
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, mergedOptions);
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

export async function handleStreamProxy(req: IncomingMessage, res: ServerResponse) {
  // Universal CORS Headers allowing all players, webviews, and iframes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const parsedReqUrl = new URL(req.url || '', 'http://localhost');
    const rawTargetUrl = parsedReqUrl.searchParams.get('url');

    if (!rawTargetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Missing "url" query parameter');
      return;
    }

    const targetUrl = rawTargetUrl.trim();

    // Derive or detect appropriate headers to bypass hotlinking and geo/referrer restrictions
    let customReferer = parsedReqUrl.searchParams.get('ref') || parsedReqUrl.searchParams.get('referer');
    let customOrigin = parsedReqUrl.searchParams.get('origin');

    // Extract referer embedded in stream query string (e.g. ?hls https://share.google/... or ?referer=...)
    if (!customReferer) {
      const shareMatch = targetUrl.match(/https?:\/\/[^\s"',]+/);
      if (shareMatch && targetUrl.includes('?hls') && shareMatch[0] !== targetUrl) {
        try {
          const u = new URL(shareMatch[0]);
          customReferer = u.origin + '/';
          customOrigin = u.origin;
        } catch (_) {}
      }
    }

    if (!customReferer) {
      try {
        const u = new URL(targetUrl);
        customReferer = u.origin + '/';
        customOrigin = u.origin;
      } catch (_) {}
    }

    // Modern Chrome/Android User-Agent
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    if (customReferer) forwardHeaders['Referer'] = customReferer;
    if (customOrigin) forwardHeaders['Origin'] = customOrigin;
    if (req.headers.range) forwardHeaders['Range'] = req.headers.range;

    let upstreamRes: Response;
    try {
      upstreamRes = await fetchWithRetry(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'follow',
      });
    } catch (fetchErr: any) {
      // If direct request failed with ECONNREFUSED or connection error, check if this is an expired Astra child URL
      if (targetUrl.includes('/play/') && targetUrl.endsWith('.m3u8') && !targetUrl.includes('index.m3u8')) {
        const parentUrl = targetUrl.replace(/\/[^/]+\.m3u8(\?.*)?$/, '/index.m3u8$1');
        try {
          upstreamRes = await fetchWithRetry(parentUrl, {
            method: 'GET',
            headers: forwardHeaders,
            redirect: 'follow',
          });
        } catch {
          throw fetchErr;
        }
      } else {
        throw fetchErr;
      }
    }

    // Auto-recovery for Astra/Cesbo IPTV temporary rotating tokens:
    // If a child playlist returned 404, deduce parent index.m3u8 and fetch that instead
    if (
      upstreamRes.status === 404 &&
      targetUrl.includes('/play/') &&
      targetUrl.endsWith('.m3u8') &&
      !targetUrl.includes('index.m3u8')
    ) {
      const parentUrl = targetUrl.replace(/\/[^/]+\.m3u8(\?.*)?$/, '/index.m3u8$1');
      try {
        const parentRes = await fetchWithRetry(parentUrl, {
          method: 'GET',
          headers: forwardHeaders,
          redirect: 'follow',
        });
        if (parentRes.ok) {
          upstreamRes = parentRes;
        }
      } catch (_) {}
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.statusCode = upstreamRes.status;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Upstream returned HTTP ${upstreamRes.status}`);
      return;
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();

    // Check if target is an MKV or non-native video container that requires on-the-fly remuxing
    const isMkvOrUnsupportedContainer =
      targetUrl.toLowerCase().includes('.mkv') ||
      targetUrl.toLowerCase().includes('.avi') ||
      contentType.includes('matroska') ||
      contentType.includes('x-matroska');

    if (isMkvOrUnsupportedContainer) {
      handleRemuxStream(req, res);
      return;
    }

    // Check if target is a known binary media segment or key
    const isKeyRequest =
      targetUrl.includes('&key=') ||
      targetUrl.includes('?key=') ||
      targetUrl.includes('/key') ||
      targetUrl.endsWith('.key');

    const isExplicitBinary =
      targetUrl.includes('.ts') ||
      targetUrl.includes('.mp4') ||
      targetUrl.includes('.m4s') ||
      targetUrl.includes('.mkv') ||
      targetUrl.includes('.aac') ||
      targetUrl.includes('.mp3') ||
      targetUrl.includes('.webm') ||
      targetUrl.includes('&segment=') ||
      targetUrl.includes('_seg_') ||
      contentType.includes('video/mp2t') ||
      contentType.includes('video/mp4') ||
      isKeyRequest;

    const couldBePlaylist =
      !isExplicitBinary &&
      (contentType.includes('mpegurl') ||
        contentType.includes('x-mpegurl') ||
        contentType.includes('text/') ||
        contentType.includes('application/octet-stream') ||
        contentType === '' ||
        targetUrl.toLowerCase().includes('.m3u8') ||
        targetUrl.toLowerCase().includes('index.m3u8') ||
        targetUrl.toLowerCase().includes('live.php') ||
        targetUrl.toLowerCase().includes('chunks=') ||
        targetUrl.toLowerCase().includes('playlist') ||
        targetUrl.toLowerCase().includes('manifest'));

    // Forward status code (e.g. 200 or 206 Partial Content)
    res.statusCode = upstreamRes.status;

    // Forward key caching and range headers
    const headersToForward = ['accept-ranges', 'content-range', 'content-length', 'cache-control'];
    for (const h of headersToForward) {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (couldBePlaylist && req.method !== 'HEAD') {
      const text = await upstreamRes.text();
      const trimmedHead = text.trim();

      // Check if it's M3U format (either starts with #EXTM3U or contains HLS tags)
      if (
        trimmedHead.startsWith('#EXTM3U') ||
        text.includes('#EXTINF') ||
        text.includes('#EXT-X-STREAM-INF') ||
        text.includes('#EXT-X-TARGETDURATION')
      ) {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        // ASTRA / CESBO / SINGLE-VARIANT UNWRAPPING:
        // If this is a master playlist containing a single variant stream pointing to temporary or rotating playlists,
        // immediately fetch that child variant and return its media playlist directly.
        const streamInfIdx = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
        const variantUrls = lines.filter((l) => !l.startsWith('#'));

        if (streamInfIdx !== -1 && variantUrls.length === 1) {
          const childRaw = variantUrls[0];
          try {
            const childAbs = new URL(childRaw, upstreamRes.url || targetUrl).toString();
            const childRes = await fetchWithRetry(childAbs, {
              method: 'GET',
              headers: forwardHeaders,
              redirect: 'follow',
            });
            if (childRes.ok) {
              const childText = await childRes.text();
              const rewrittenChild = rewriteM3U8(childText, childRes.url || childAbs);
              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.setHeader('Content-Length', Buffer.byteLength(rewrittenChild).toString());
              res.end(rewrittenChild);
              return;
            }
          } catch (childErr) {
            console.warn('Could not unwrap single variant child:', childErr);
          }
        }

        // Standard multi-variant or media playlist rewriting
        const rewritten = rewriteM3U8(text, upstreamRes.url || targetUrl);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Length', Buffer.byteLength(rewritten).toString());
        res.end(rewritten);
        return;
      } else {
        // If it was text/html or text/plain that was NOT M3U, return as is
        res.setHeader('Content-Type', contentType || 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(text).toString());
        res.end(text);
        return;
      }
    }

    // Direct streaming for TS segments, MP4, MKV, WebM, AES keys, etc.
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');

    if (isKeyRequest) {
      res.setHeader('Content-Type', 'application/octet-stream');
    } else if (
      targetUrl.endsWith('.ts') ||
      targetUrl.includes('.ts?') ||
      targetUrl.includes('_seg_') ||
      targetUrl.includes('&segment=')
    ) {
      res.setHeader('Content-Type', 'video/mp2t');
    } else if (contentType) {
      if (
        contentType.includes('matroska') ||
        contentType.includes('mkv') ||
        targetUrl.toLowerCase().includes('.mkv') ||
        (contentType.includes('octet-stream') && !targetUrl.includes('.ts'))
      ) {
        res.setHeader('Content-Type', 'video/mp4');
      } else {
        res.setHeader('Content-Type', contentType);
      }
    } else if (targetUrl.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else {
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

