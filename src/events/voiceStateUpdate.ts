import { Events, ChannelType, type VoiceState } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { getPrisma } from '../services/database/index.js';

const log = new Logger('VOICE');

export default {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      const guild = newState.guild;
      if (!guild) return;

      const db = getPrisma();

      const joinedChannel = newState.channel;
      const leftChannel = oldState.channel;
      const member = newState.member;
      if (!member) return;

      if (joinedChannel && !leftChannel) {
        await handleJoin(joinedChannel, guild, member, db);
      } else if (!joinedChannel && leftChannel) {
        await handleLeave(leftChannel, guild, db);
      } else if (joinedChannel && leftChannel && joinedChannel.id !== leftChannel.id) {
        await handleLeave(leftChannel, guild, db);
      }
    } catch (error) {
      log.error('voiceStateUpdate hatası.', error);
    }
  },
};

async function handleJoin(
  channel: VoiceState['channel'],
  guild: VoiceState['guild'],
  member: NonNullable<VoiceState['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  const config = await db.voiceChannelConfig.findUnique({
    where: { guildId: guild.id },
  });

  if (!config) return;
  if (config.triggerChannelId !== channel.id) return;

  const prefix = config.channelPrefix || 'ODA';
  const channelName = `${prefix} ${member.displayName}`;

  const newChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: config.categoryChannelId || null,
    userLimit: config.maxUsers || 0,
    reason: `Geçici kanal oluşturuldu: ${member.user.tag}`,
  });

  await member.voice.setChannel(newChannel.id).catch((err) => {
    log.error(`Kullanıcı taşınırken hata: ${member.user.tag}`, err);
  });

  await db.tempVoiceChannel.create({
    data: {
      guildId: guild.id,
      channelId: newChannel.id,
      ownerId: member.id,
      channelName,
    },
  });

  log.info(`Geçici kanal oluşturuldu: ${channelName} (${guild.name})`);
}

async function handleLeave(
  channel: VoiceState['channel'],
  guild: VoiceState['guild'],
  db: ReturnType<typeof getPrisma>,
) {
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  const tempChannel = await db.tempVoiceChannel.findUnique({
    where: { channelId: channel.id },
  });

  if (!tempChannel) return;

  const config = await db.voiceChannelConfig.findUnique({
    where: { guildId: guild.id },
  });

  if (channel.members.size === 0) {
    if (config?.autoDelete !== false) {
      await channel.delete('Geçici kanal boş, otomatik silindi.').catch((err) => {
        log.error(`Kanal silinirken hata: ${channel.name}`, err);
      });

      await db.tempVoiceChannel.delete({ where: { channelId: channel.id } }).catch(() => null);

      log.info(`Geçici kanal silindi: ${channel.name} (${guild.name})`);
    }
  } else if (tempChannel.ownerId === channel.members.first()?.id) {
    const newOwner = channel.members.first();
    if (newOwner) {
      await db.tempVoiceChannel.update({
        where: { channelId: channel.id },
        data: { ownerId: newOwner.id },
      });
      log.info(`Kanal sahipliği devredildi: ${newOwner.user.tag} -> ${channel.name}`);
    }
  }
}
