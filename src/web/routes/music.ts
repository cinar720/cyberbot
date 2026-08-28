import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { hasGuildAccess } from '../auth/session.js';
import { getPrisma } from '../../services/database/index.js';
import { MusicService } from '../../services/music/MusicService.js';
import { getDiscordClient } from '../discord-client.js';
import { asyncHandler } from '../controllers/errorHandler.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('MUSIC-WEB');
const router = Router();

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

function hasManagePermission(permissions: string): boolean {
  try {
    const perms = BigInt(permissions);
    return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

router.get('/:guildId/music/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const prisma = getPrisma();
  const config = await prisma.musicConfig.findUnique({ where: { guildId } });

  res.json({ success: true, data: config || null });
}));

router.put('/:guildId/music/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const prisma = getPrisma();
  const { djRoleId, volume, autoLeave, autoLeaveTimer, announceSongs } = req.body;

  const config = await prisma.musicConfig.upsert({
    where: { guildId },
    update: {
      ...(djRoleId !== undefined && { djRoleId }),
      ...(volume !== undefined && { volume: Number(volume) }),
      ...(autoLeave !== undefined && { autoLeave: Boolean(autoLeave) }),
      ...(autoLeaveTimer !== undefined && { autoLeaveTimer: Number(autoLeaveTimer) }),
      ...(announceSongs !== undefined && { announceSongs: Boolean(announceSongs) }),
    },
    create: {
      guildId,
      djRoleId: djRoleId || null,
      volume: volume ? Number(volume) : 80,
      autoLeave: autoLeave !== undefined ? Boolean(autoLeave) : true,
      autoLeaveTimer: autoLeaveTimer ? Number(autoLeaveTimer) : 300,
      announceSongs: announceSongs !== undefined ? Boolean(announceSongs) : true,
    },
  });

  log.info(`Music config updated for guild ${guildId}`);
  res.json({ success: true, data: config });
}));

router.get('/:guildId/music/queue', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  const queue = musicService.getQueueByGuildId(guildId);

  if (!queue) {
    res.json({ success: true, data: { tracks: [], nowPlaying: null } });
    return;
  }

  const tracks = queue.tracks.map((track, i) => ({
    position: i + 1,
    title: track.title,
    url: track.url,
    duration: track.duration,
    requestedBy: (track.requestedBy as any)?.user?.tag || (track.requestedBy as any)?.tag || 'Bilinmiyor',
  }));

  const nowPlaying = queue.currentTrack ? {
    title: queue.currentTrack.title,
    url: queue.currentTrack.url,
    duration: queue.currentTrack.duration,
    requestedBy: (queue.currentTrack.requestedBy as any)?.user?.tag || (queue.currentTrack.requestedBy as any)?.tag || 'Bilinmiyor',
  } : null;

  res.json({ success: true, data: { tracks, nowPlaying } });
}));

router.get('/:guildId/music/now-playing', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  const queue = musicService.getQueueByGuildId(guildId);

  if (!queue || !queue.currentTrack) {
    res.json({ success: true, data: null });
    return;
  }

  const track = queue.currentTrack;
  res.json({
    success: true,
    data: {
      title: track.title,
      url: track.url,
      duration: track.duration,
      requestedBy: (track.requestedBy as any)?.user?.tag || (track.requestedBy as any)?.tag || 'Bilinmiyor',
      isPlaying: queue.node.isPlaying(),
      isPaused: queue.node.isPaused(),
      volume: queue.node.volume,
    },
  });
}));

router.post('/:guildId/music/play', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guildPerm = session.guilds.find((g) => g.id === guildId);
  if (guildPerm && !hasManagePermission(guildPerm.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const { query, channelId } = req.body;
  if (!query) {
    res.status(400).json({ success: false, error: { message: 'Query gerekli.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) {
    res.status(500).json({ success: false, error: { message: 'Discord istemcisi hazir degil.' } });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } });
    return;
  }

  let voiceChannel = null;
  if (channelId) {
    voiceChannel = await guild.channels.fetch(channelId).catch(() => null);
  }
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    voiceChannel = guild.channels.cache.find(
      (ch) => ch.isVoiceBased() && ch.permissionsFor(guild.members.me!)?.has('Connect'),
    );
  }
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    res.status(400).json({ success: false, error: { message: 'Gecerli ses kanali bulunamadi.' } });
    return;
  }

  const botMember = guild.members.me;
  if (!botMember) {
    res.status(500).json({ success: false, error: { message: 'Bot uyesi bulunamadi.' } });
    return;
  }

  try {
    const musicService = MusicService.getInstance();
    const { track } = await musicService.play(guild, voiceChannel, query, botMember);

    res.json({
      success: true,
      data: {
        title: track.title,
        duration: track.duration,
        url: track.url,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    log.error(`Play error for guild ${guildId}: ${msg}`);
    res.status(500).json({ success: false, error: { message: msg } });
  }
}));

router.post('/:guildId/music/stop', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guildPerm = session.guilds.find((g) => g.id === guildId);
  if (guildPerm && !hasManagePermission(guildPerm.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) {
    res.status(500).json({ success: false, error: { message: 'Discord istemcisi hazir degil.' } });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  musicService.stop(guild);

  res.json({ success: true, data: { message: 'Muzik durduruldu.' } });
}));

router.post('/:guildId/music/skip', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guildPerm = session.guilds.find((g) => g.id === guildId);
  if (guildPerm && !hasManagePermission(guildPerm.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) {
    res.status(500).json({ success: false, error: { message: 'Discord istemcisi hazir degil.' } });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  const skipped = musicService.skip(guild);

  res.json({
    success: true,
    data: { message: skipped ? `${skipped.title} atlandi.` : 'Atlanacak parc bulunamadi.' },
  });
}));

router.post('/:guildId/music/pause', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guildPerm = session.guilds.find((g) => g.id === guildId);
  if (guildPerm && !hasManagePermission(guildPerm.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) {
    res.status(500).json({ success: false, error: { message: 'Discord istemcisi hazir degil.' } });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  const ok = musicService.pause(guild);

  res.json({
    success: true,
    data: { message: ok ? 'Muzik duraklatildi.' : 'Duraklatilacak muzik bulunamadi.' },
  });
}));

router.post('/:guildId/music/resume', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const guildPerm = session.guilds.find((g) => g.id === guildId);
  if (guildPerm && !hasManagePermission(guildPerm.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yonetim yetkiniz yok.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) {
    res.status(500).json({ success: false, error: { message: 'Discord istemcisi hazir degil.' } });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } });
    return;
  }

  const musicService = MusicService.getInstance();
  const ok = musicService.resume(guild);

  res.json({
    success: true,
    data: { message: ok ? 'Muzik devam ettirildi.' : 'Devam ettirilecek muzik bulunamadi.' },
  });
}));

router.post('/:guildId/music/shuffle', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) { res.status(500).json({ success: false, error: { message: 'Client yok.' } }); return; }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) { res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } }); return; }

  const musicService = MusicService.getInstance();
  const ok = musicService.shuffle(guild);

  res.json({ success: true, data: { message: ok ? 'Kuyruk karistirildi.' : 'Kuyruk bos.' } });
}));

router.post('/:guildId/music/volume', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erisim yetkiniz yok.' } });
    return;
  }

  const { level } = req.body;
  if (level === undefined || typeof level !== 'number') {
    res.status(400).json({ success: false, error: { message: 'level gerekli.' } });
    return;
  }

  const client = getDiscordClient();
  if (!client) { res.status(500).json({ success: false, error: { message: 'Client yok.' } }); return; }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) { res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadi.' } }); return; }

  const musicService = MusicService.getInstance();
  const ok = musicService.volume(guild, level);

  res.json({ success: true, data: { message: ok ? `Ses: %${level}` : 'Muzik bulunamadi.' } });
}));

export default router;
