import { Guild, User } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Logger } from '../../utils/logger.js';

const log = new Logger('DATABASE');

let prisma: PrismaClient;

export async function connectDatabase(): Promise<PrismaClient> {
  try {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    prisma = new PrismaClient({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Prisma'nın kendi stdout error log'unu sustur
    (prisma as unknown as { $on: (event: string, cb: () => void) => void }).$on('error', () => {});

    await prisma.$connect();
    log.success('PostgreSQL veritabanına başarıyla bağlandı.');
    return prisma;
  } catch (error) {
    log.error('Veritabanı bağlantısı başarısız.', error);
    throw error;
  }
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client henüz başlatılmadı.');
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    log.info('Veritabanı bağlantısı kapatıldı.');
  }
}

export async function getOrCreateGuild(guild: Guild) {
  const db = getPrisma();
  try {
    let guildData = await db.guild.findUnique({
      where: { guildId: guild.id },
    });

    if (!guildData) {
      guildData = await db.guild.create({
        data: {
          guildId: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL() || null,
          ownerId: guild.ownerId,
        },
      });
      log.info(`Yeni sunucu eklendi: ${guild.name} (${guild.id})`);
    } else if (guildData.name !== guild.name) {
      guildData = await db.guild.update({
        where: { guildId: guild.id },
        data: { name: guild.name },
      });
    }

    return guildData;
  } catch (error) {
    log.error(`Sunucu hatası: ${guild.id}`, error);
    throw error;
  }
}

export async function getOrCreateUser(user: User) {
  const db = getPrisma();
  try {
    let userData = await db.user.findUnique({
      where: { userId: user.id },
    });

    if (!userData) {
      userData = await db.user.create({
        data: {
          userId: user.id,
          username: user.username,
          discriminator: user.discriminator || null,
          avatarUrl: user.displayAvatarURL() || null,
        },
      });
    } else if (userData.username !== user.username) {
      userData = await db.user.update({
        where: { userId: user.id },
        data: {
          username: user.username,
          avatarUrl: user.displayAvatarURL() || null,
        },
      });
    }

    return userData;
  } catch (error) {
    log.error(`Kullanıcı hatası: ${user.id}`, error);
    throw error;
  }
}

export async function addWarning(guildId: string, userId: string, moderatorId: string, reason: string) {
  const db = getPrisma();
  try {
    const warning = await db.warning.create({
      data: { guildId, userId, moderatorId, reason },
    });
    log.info(`Uyarı eklendi: ${userId} -> ${guildId}`);
    return warning;
  } catch (error) {
    log.error('Uyarı ekleme hatası', error);
    throw error;
  }
}

export async function getActiveWarnings(guildId: string, userId: string) {
  const db = getPrisma();
  try {
    return await db.warning.findMany({
      where: { guildId, userId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    log.error('Uyarı getirme hatası', error);
    throw error;
  }
}
