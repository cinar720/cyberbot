import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { hasGuildAccess } from '../auth/session.js';
import { getPrisma } from '../../services/database/index.js';
import { asyncHandler } from '../controllers/errorHandler.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('MUSIC');
const router = Router();

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

function hasManagePermission(permissions: string): boolean {
  try {
    const perms = BigInt(permissions);
    return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    log.error('Permission parse hatası: ' + permissions);
    return false;
  }
}

router.get('/:guildId/music/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
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
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
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
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  const prisma = getPrisma();
  const queue = await prisma.musicQueue.findMany({
    where: { guildId },
    orderBy: { position: 'asc' },
  });

  res.json({ success: true, data: queue });
}));

router.post('/:guildId/music/play', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  const { query } = req.body;
  if (!query) {
    res.status(400).json({ success: false, error: { message: 'Query parametresi gerekli.' } });
    return;
  }

  log.info(`Music play request for guild ${guildId}: ${query}`);
  res.json({ success: true, data: { message: 'Müzik oynatma isteği alındı.', query } });
}));

router.post('/:guildId/music/stop', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  log.info(`Music stop request for guild ${guildId}`);
  res.json({ success: true, data: { message: 'Müzik durduruldu.' } });
}));

router.post('/:guildId/music/skip', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  log.info(`Music skip request for guild ${guildId}`);
  res.json({ success: true, data: { message: 'Parça atlandı.' } });
}));

router.post('/:guildId/music/pause', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  log.info(`Music pause request for guild ${guildId}`);
  res.json({ success: true, data: { message: 'Müzik duraklatıldı.' } });
}));

router.post('/:guildId/music/resume', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (guild && !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  log.info(`Music resume request for guild ${guildId}`);
  res.json({ success: true, data: { message: 'Müzik devam ettirildi.' } });
}));

export default router;
