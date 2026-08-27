import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import guildsRouter from './routes/guilds.js';
import healthRouter from './routes/health.js';
import discordRouter from './routes/discord.js';
import roleConnectionsRouter from './routes/roleConnections.js';
import musicRouter from './routes/music.js';
import levelRouter from './routes/level.js';
import voiceRouter from './routes/voice.js';
import { errorHandler, notFoundHandler } from './controllers/errorHandler.js';
import { optionalAuth } from './middleware/auth.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('WEB');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key && rest.length) {
      cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  }
  return cookies;
}

export function createWebServer(): void {
  const app: Express = express();
  const port = parseInt(process.env.WEB_PORT || '3000', 10);

  app.use('/api/discord', express.raw({ type: 'application/json' }), discordRouter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(join(__dirname, 'public'), { index: false }));

  app.use((req, _res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    next();
  });

  app.use('/api/auth', authRouter);
  app.use('/api/guilds', guildsRouter);
  app.use('/api/guilds', musicRouter);
  app.use('/api/guilds', levelRouter);
  app.use('/api/guilds', voiceRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/role-connections', roleConnectionsRouter);
  app.use('/api', apiRouter);

  app.get('/login', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'login.html'));
  });

  app.get('/music', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'music.html'));
  });

  app.get('/level', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'level.html'));
  });

  app.get('/voice', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'voice.html'));
  });

  app.get('/callback', (req, res) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    res.redirect('/api/auth/callback' + (qs ? '?' + qs : ''));
  });

  app.get('/logout', (_req, res) => {
    res.redirect('/api/auth/logout');
  });

  app.get('/support', (_req, res) => {
    res.redirect('/api/auth/support');
  });

  app.use(optionalAuth);

  app.get('/dashboard', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });
  app.get('/dashboard/:page', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  app.get('/', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'landing.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(port, () => {
    log.success(`Web paneli http://localhost:${port} adresinde çalışıyor.`);
  });
}
