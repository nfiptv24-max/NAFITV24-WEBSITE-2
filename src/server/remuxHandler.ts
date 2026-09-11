import { IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';

export function handleRemuxStream(req: IncomingMessage, res: ServerResponse) {
  // Universal CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '', 'http://localhost');
  const targetUrl = parsedUrl.searchParams.get('url');
  const seekParam = parsedUrl.searchParams.get('ss') || '0';
  const seekSeconds = Math.max(0, parseFloat(seekParam) || 0);

  if (!targetUrl) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Missing "url" parameter');
    return;
  }

  // Derive referer & headers
  let customReferer = parsedUrl.searchParams.get('ref') || parsedUrl.searchParams.get('referer');
  if (!customReferer) {
    try {
      const u = new URL(targetUrl);
      customReferer = u.origin + '/';
    } catch (_) {}
  }

  // Set streaming media headers
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Accept-Ranges', 'none'); // streamed fMP4 pipe
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.end();
    return;
  }

  res.statusCode = 200;

  // Build FFmpeg command arguments
  const headerString = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36\r\n` +
    (customReferer ? `Referer: ${customReferer}\r\n` : '');

  const ffmpegArgs: string[] = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-reconnect', '1',
    '-reconnect_at_eof', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-headers', headerString,
  ];

  if (seekSeconds > 0) {
    ffmpegArgs.push('-ss', seekSeconds.toString());
  }

  ffmpegArgs.push(
    '-i', targetUrl,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1'
  );

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  let isKilled = false;
  const killFfmpeg = () => {
    if (!isKilled) {
      isKilled = true;
      try {
        ffmpeg.kill('SIGKILL');
      } catch (_) {}
    }
  };

  req.on('close', killFfmpeg);
  req.on('end', killFfmpeg);
  res.on('close', killFfmpeg);
  res.on('finish', killFfmpeg);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', (chunk) => {
    const msg = chunk.toString();
    if (!msg.includes('deprecated pixel format')) {
      console.warn('[FFmpeg Remux]:', msg.trim());
    }
  });

  ffmpeg.on('error', (err) => {
    console.error('[FFmpeg Process Error]:', err.message);
    killFfmpeg();
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end('FFmpeg transcoding error');
    }
  });

  ffmpeg.on('close', (code) => {
    if (code !== 0 && code !== 255 && !isKilled) {
      console.warn(`[FFmpeg] Exited with code ${code}`);
    }
    if (!res.writableEnded) {
      res.end();
    }
  });
}
