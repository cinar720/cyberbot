import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { hasGuildAccess } from '../auth/session.js';
import { getPrisma } from '../../services/database/index.js';
import { asyncHandler } from '../controllers/errorHandler.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('LEVEL');
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

router.get('/:guildId/level/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const config = await prisma.levelConfig.findUnique({ where: { guildId } });

  res.json({ success: true, data: config || null });
}));

router.put('/:guildId/level/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const { xpPerMessage, xpCooldown, levelUpChannelId, levelUpMessage, enabled } = req.body;

  const config = await prisma.levelConfig.upsert({
    where: { guildId },
    update: {
      ...(xpPerMessage !== undefined && { xpPerMessage: Number(xpPerMessage) }),
      ...(xpCooldown !== undefined && { xpCooldown: Number(xpCooldown) }),
      ...(levelUpChannelId !== undefined && { levelUpChannelId }),
      ...(levelUpMessage !== undefined && { levelUpMessage }),
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    },
    create: {
      guildId,
      xpPerMessage: xpPerMessage ? Number(xpPerMessage) : 15,
      xpCooldown: xpCooldown ? Number(xpCooldown) : 60,
      levelUpChannelId: levelUpChannelId || null,
      levelUpMessage: levelUpMessage || 'Tebrikler {user}, **Level {level}** oldun!',
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    },
  });

  log.info(`Level config updated for guild ${guildId}`);
  res.json({ success: true, data: config });
}));

router.get('/:guildId/level/leaderboard', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const leaderboard = await prisma.userLevel.findMany({
    where: { guildId },
    orderBy: { level: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: leaderboard });
}));

router.get('/:guildId/level/user/:userId', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const userId = String(req.params.userId);
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
  const userLevel = await prisma.userLevel.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });

  if (!userLevel) {
    res.status(404).json({ success: false, error: { message: 'Kullanıcı bulunamadı.' } });
    return;
  }

  res.json({ success: true, data: userLevel });
}));

export default router;
