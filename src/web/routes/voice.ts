import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { hasGuildAccess } from '../auth/session.js';
import { getPrisma } from '../../services/database/index.js';
import { asyncHandler } from '../controllers/errorHandler.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('VOICE');
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

router.get('/:guildId/voice/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const config = await prisma.voiceChannelConfig.findUnique({ where: { guildId } });

  res.json({ success: true, data: config || null });
}));

router.put('/:guildId/voice/config', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const { triggerChannelId, categoryChannelId, channelPrefix, maxUsers, autoDelete } = req.body;

  const config = await prisma.voiceChannelConfig.upsert({
    where: { guildId },
    update: {
      ...(triggerChannelId !== undefined && { triggerChannelId }),
      ...(categoryChannelId !== undefined && { categoryChannelId }),
      ...(channelPrefix !== undefined && { channelPrefix }),
      ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
      ...(autoDelete !== undefined && { autoDelete: Boolean(autoDelete) }),
    },
    create: {
      guildId,
      triggerChannelId: triggerChannelId || null,
      categoryChannelId: categoryChannelId || null,
      channelPrefix: channelPrefix || 'ODA',
      maxUsers: maxUsers ? Number(maxUsers) : 10,
      autoDelete: autoDelete !== undefined ? Boolean(autoDelete) : true,
    },
  });

  log.info(`Voice config updated for guild ${guildId}`);
  res.json({ success: true, data: config });
}));

router.get('/:guildId/voice/channels', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
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
  const channels = await prisma.tempVoiceChannel.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: channels });
}));

export default router;
