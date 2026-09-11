import express from 'express';
import path from 'path';
import { handleStreamProxy } from './src/server/proxyHandler';
import { handleRemuxStream } from './src/server/remuxHandler';
import { handleProbeMedia } from './src/server/probeHandler';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Universal Stream proxy API endpoint
  app.all('/api/proxy', (req, res) => {
    handleStreamProxy(req, res);
  });

  // Universal on-the-fly video remuxer (MKV, TS, AVI, FLV -> high-speed fMP4)
  app.all('/api/remux', (req, res) => {
    handleRemuxStream(req, res);
  });

  // Media probe metadata (duration, format, resolution)
  app.all('/api/probe', (req, res) => {
    handleProbeMedia(req, res);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
