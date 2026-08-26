import { Router, type Request, type Response } from 'express';
import { getOAuth2Url, exchangeCode, getDiscordUser, getDiscordGuilds, verifyOAuthState } from '../auth/oauth2.js';
import { createSession, destroySession, getSession } from '../auth/session.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('AUTH');
const router = Router();

router.get('/login', (_req: Request, res: Response) => {
  const url = getOAuth2Url();
  log.info('OAuth2 redirect: ' + url);
  res.redirect(url);
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const state = req.query.state as string;

    if (error) {
      log.error('Discord OAuth2 hatası: ' + error);
      res.redirect('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (!code || !verifyOAuthState(state || '')) {
      log.error('Callback code eksik');
      res.redirect('/login?error=invalid_state');
      return;
    }

    log.info('Token exchange başlıyor...');
    const accessToken = await exchangeCode(code);
    log.info('Token alındı, kullanıcı bilgileri çekiliyor...');

    const [user, guilds] = await Promise.all([
      getDiscordUser(accessToken),
      getDiscordGuilds(accessToken),
    ]);

    log.info('Kullanıcı: ' + user.username + ' (' + user.id + ')');
    log.info('Guild sayısı: ' + guilds.length);
    for (const g of guilds.slice(0, 5)) {
      log.info('  Guild: ' + g.name + ' (' + g.id + ') perms=' + g.permissions);
    }
    const token = createSession({
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar ?? '',
      guilds,
      accessToken,
    });

    res.cookie('cyberbot_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log.success('Oturum oluşturuldu: ' + user.username);
    res.redirect('/dashboard');
  } catch (err) {
    log.error('Callback hatası: ' + (err instanceof Error ? err.message : String(err)));
    res.redirect('/login?error=auth_failed');
  }
});

router.get('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.['cyberbot_session'];
  if (token) {
    destroySession(token);
  }
  res.clearCookie('cyberbot_session');
  res.redirect('/login');
});

router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.['cyberbot_session'];
  if (!token) {
    res.json({ success: false, data: null });
    return;
  }
  const session = getSession(token);
  if (!session) {
    res.json({ success: false, data: null });
    return;
  }
  res.json({
    success: true,
    data: {
      userId: session.userId,
      username: session.username,
      discriminator: session.discriminator,
      avatar: session.avatar,
    },
  });
});

router.get('/support', (_req: Request, res: Response) => {
  res.redirect('https://discord.gg/cyberbot');
});

export default router;
