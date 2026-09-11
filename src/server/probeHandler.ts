import { IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';

export function handleProbeMedia(req: IncomingMessage, res: ServerResponse) {
  // Universal CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '', 'http://localhost');
  const targetUrl = parsedUrl.searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing "url" parameter' }));
    return;
  }

  let customReferer = parsedUrl.searchParams.get('ref');
  if (!customReferer) {
    try {
      const u = new URL(targetUrl);
      customReferer = u.origin + '/';
    } catch (_) {}
  }

  const headerString = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36\r\n` +
    (customReferer ? `Referer: ${customReferer}\r\n` : '');

  const probe = spawn('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-headers', headerString,
    targetUrl
  ]);

  let stdoutData = '';
  let stderrData = '';

  probe.stdout.on('data', (d) => {
    stdoutData += d.toString();
  });

  probe.stderr.on('data', (d) => {
    stderrData += d.toString();
  });

  const timer = setTimeout(() => {
    try {
      probe.kill('SIGKILL');
    } catch (_) {}
    if (!res.headersSent) {
      res.statusCode = 504;
      res.end(JSON.stringify({ error: 'Probe timeout' }));
    }
  }, 10000);

  probe.on('close', (code) => {
    clearTimeout(timer);
    if (res.headersSent) return;

    if (code === 0 && stdoutData) {
      try {
        const parsed = JSON.parse(stdoutData);
        const format = parsed.format || {};
        const streams = parsed.streams || [];
        const videoStream = streams.find((s: any) => s.codec_type === 'video');
        const audioStream = streams.find((s: any) => s.codec_type === 'audio');

        const duration = parseFloat(format.duration) || 0;
        const result = {
          success: true,
          duration,
          formattedDuration: formatDuration(duration),
          size: parseInt(format.size, 10) || 0,
          title: format.tags?.title || '',
          formatName: format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: evalFps(videoStream.r_frame_rate)
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            channels: audioStream.channels,
            sampleRate: audioStream.sample_rate
          } : null
        };

        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to parse probe JSON', details: err.message }));
      }
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'ffprobe failed', code, stderr: stderrData }));
    }
  });

  probe.on('error', (err) => {
    clearTimeout(timer);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function evalFps(rateStr: string): number {
  if (!rateStr) return 0;
  const parts = rateStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    return den ? Math.round((num / den) * 100) / 100 : 0;
  }
  return parseFloat(rateStr) || 0;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
