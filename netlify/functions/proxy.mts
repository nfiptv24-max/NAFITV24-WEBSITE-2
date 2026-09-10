// Netlify Serverless Function for Stream Proxy (V2)
// Automatically handles CORS, Mixed Content (HTTP on HTTPS), Astra/Cesbo IPTV tokens, and M3U8 rewriting

function rewriteM3U8(content: string, baseUrl: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
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

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delayMs = 300): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
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

export default async (req: Request): Promise<Response> => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    const rawTarget = reqUrl.searchParams.get('url');

    if (!rawTarget) {
      return new Response('Missing "url" parameter', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const targetUrl = rawTarget.trim();

    let customReferer = reqUrl.searchParams.get('ref') || reqUrl.searchParams.get('referer');
    let customOrigin = reqUrl.searchParams.get('origin');

    if (!customReferer) {
      try {
        const u = new URL(targetUrl);
        customReferer = u.origin + '/';
        customOrigin = u.origin;
      } catch (_) {}
    }

    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
    };

    if (customReferer) forwardHeaders['Referer'] = customReferer;
    if (customOrigin) forwardHeaders['Origin'] = customOrigin;

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) forwardHeaders['Range'] = rangeHeader;

    let upstreamRes: Response;
    try {
      upstreamRes = await fetchWithRetry(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'follow',
        cache: 'no-store',
      });
    } catch (fetchErr: any) {
      if (targetUrl.includes('/play/') && targetUrl.endsWith('.m3u8') && !targetUrl.includes('index.m3u8')) {
        const parentUrl = targetUrl.replace(/\/[^/]+\.m3u8(\?.*)?$/, '/index.m3u8$1');
        upstreamRes = await fetchWithRetry(parentUrl, {
          method: 'GET',
          headers: forwardHeaders,
          redirect: 'follow',
          cache: 'no-store',
        });
      } else {
        throw fetchErr;
      }
    }

    // Auto-recovery for Astra 404
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
          cache: 'no-store',
        });
        if (parentRes.ok) {
          upstreamRes = parentRes;
        }
      } catch (_) {}
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Upstream returned HTTP ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    const isM3U8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      targetUrl.toLowerCase().includes('.m3u8') ||
      targetUrl.toLowerCase().includes('index.m3u8');

    const resHeaders = new Headers(corsHeaders);
    resHeaders.set('Access-Control-Allow-Origin', '*');

    const headersToForward = ['accept-ranges', 'content-range', 'content-length', 'cache-control'];
    for (const h of headersToForward) {
      const val = upstreamRes.headers.get(h);
      if (val) resHeaders.set(h, val);
    }

    if (isM3U8 && req.method !== 'HEAD') {
      const text = await upstreamRes.text();
      if (text.trim().startsWith('#EXTM3U') || text.includes('#EXTINF') || text.includes('#EXT-X-STREAM-INF')) {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
              cache: 'no-store',
            });
            if (childRes.ok) {
              const childText = await childRes.text();
              const rewrittenChild = rewriteM3U8(childText, childRes.url || childAbs);
              resHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
              resHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
              resHeaders.set('Pragma', 'no-cache');
              resHeaders.set('Expires', '0');
              return new Response(rewrittenChild, {
                status: 200,
                headers: resHeaders,
              });
            }
          } catch (_) {}
        }

        const rewritten = rewriteM3U8(text, upstreamRes.url || targetUrl);
        resHeaders.set('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        resHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        resHeaders.set('Pragma', 'no-cache');
        resHeaders.set('Expires', '0');
        return new Response(rewritten, {
          status: 200,
          headers: resHeaders,
        });
      }
    }

    // Direct stream for TS segments, MP4, MKV
    resHeaders.set('Content-Disposition', 'inline');
    resHeaders.set('Accept-Ranges', 'bytes');

    if (contentType) {
      if (
        contentType.includes('matroska') ||
        contentType.includes('mkv') ||
        targetUrl.toLowerCase().includes('.mkv') ||
        (contentType.includes('octet-stream') && !targetUrl.includes('.ts'))
      ) {
        resHeaders.set('Content-Type', 'video/mp4');
      } else {
        resHeaders.set('Content-Type', contentType);
      }
    } else if (targetUrl.endsWith('.ts') || targetUrl.includes('.ts?')) {
      resHeaders.set('Content-Type', 'video/mp2t');
    } else {
      resHeaders.set('Content-Type', 'video/mp4');
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    return new Response(`Proxy error: ${error.message || 'Failed to fetch upstream URL'}`, {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
};

export const config = {
  path: '/api/proxy',
};
