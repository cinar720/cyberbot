import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { hasGuildAccess } from '../auth/session.js';
import { getPrisma } from '../../services/database/index.js';
import { PremiumService } from '../../services/premium/PremiumService.js';
import { AuditService } from '../../services/moderation/AuditService.js';
import { asyncHandler } from '../controllers/errorHandler.js';
import { getInviteUrl } from '../auth/oauth2.js';
import { getDiscordClient } from '../discord-client.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('GUILDS');
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

function isBotInGuild(guildId: string): boolean {
  const client = getDiscordClient();
  if (!client) return false;
  return client.guilds.cache.has(guildId);
}

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = req.session!;
    log.info('Guild isteği - Kullanıcı: ' + session.username + ' (' + session.userId + ')');
    log.info('Toplam guild: ' + session.guilds.length);

    const manageable = session.guilds.filter((g) => {
      const hasPerm = hasManagePermission(g.permissions);
      return hasPerm;
    });

    log.info('Yönetilebilir guild: ' + manageable.length);

    const prisma = getPrisma();
    let dbGuildIds = new Set<string>();

    try {
      const dbGuilds = await prisma.guild.findMany({
        where: { guildId: { in: manageable.map((g) => g.id) } },
        select: { guildId: true },
      });
      dbGuildIds = new Set(dbGuilds.map((g) => g.guildId));
    } catch (err) {
      log.error('DB guild sorgulama hatası: ' + (err instanceof Error ? err.message : String(err)));
    }

    const guilds = manageable.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      canManage: true,
      hasBot: dbGuildIds.has(g.id) || isBotInGuild(g.id),
      inviteUrl: getInviteUrl(g.id),
    }));

    log.info('Döndürülen guild: ' + guilds.length);
    res.json({ success: true, data: guilds });
  } catch (err) {
    log.error('Guild listesi hatası: ' + (err instanceof Error ? err.message : String(err)));
    res.status(500).json({ success: false, error: { message: 'Sunucu listesi alınamadı.' } });
  }
});

router.get('/:guildId', authMiddleware, (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Bu sunucuya erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (!guild) {
    res.status(404).json({ success: false, error: { message: 'Sunucu bulunamadı.' } });
    return;
  }

  if (!hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Bu sunucuyu yönetme yetkiniz yok.' } });
    return;
  }

  res.json({
    success: true,
    data: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      permissions: guild.permissions,
      canManage: true,
      hasBot: isBotInGuild(guild.id),
      inviteUrl: getInviteUrl(guild.id),
    },
  });
});

router.get('/:guildId/stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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

  const [moderationCount, caseCount, warningCount, ticketCount] = await Promise.all([
    prisma.moderationLog.count({ where: { guildId } }).catch(() => 0),
    prisma.case.count({ where: { guildId } }).catch(() => 0),
    prisma.warning.count({ where: { guildId, active: true } }).catch(() => 0),
    prisma.ticket.count({ where: { guildId } }).catch(() => 0),
  ]);

  const premium = await PremiumService.getPremiumSafe(session.userId);

  res.json({
    success: true,
    data: {
      moderationCount,
      caseCount,
      warningCount,
      ticketCount,
      premium,
    },
  });
}));

router.get('/:guildId/activity', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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

  const logs = await AuditService.getRecent(guildId, 10);

  const activity = logs.map((log) => ({
    id: log.id,
    action: log.action,
    moderatorId: log.moderatorId,
    targetId: log.targetId,
    details: log.details,
    createdAt: log.createdAt,
  }));

  res.json({ success: true, data: activity });
}));

router.get('/:guildId/premium', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const guildId = String(req.params.guildId);
  const session = req.session!;

  if (!hasGuildAccess(session, guildId)) {
    res.status(403).json({ success: false, error: { message: 'Erişim yetkiniz yok.' } });
    return;
  }

  const guild = session.guilds.find((g) => g.id === guildId);
  if (!guild || !hasManagePermission(guild.permissions)) {
    res.status(403).json({ success: false, error: { message: 'Yönetim yetkiniz yok.' } });
    return;
  }

  const result = await PremiumService.getPremiumSafe(session.userId);
  res.json({ success: true, data: result });
}));

export default router;
