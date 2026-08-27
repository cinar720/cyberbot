import { Events, Client, ChannelType } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { Logger } from '../utils/logger.js';
import { main } from '../config/main.js';

const log = new Logger('READY');

const VOICE_CHANNEL_ID = '1542277754425188513';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client): Promise<void> {
    try {
      log.info(`${client.user?.tag} olarak giriş yapıldı!`);
      log.info(`${client.guilds.cache.size} sunucuda aktif.`);
      log.info(`${client.users.cache.size} kullanıcıya hizmet veriliyor.`);

      client.user?.setPresence({
        status: 'online',
        activities: [
          {
            name: `/help | ${main.botName}`,
            type: 0,
          },
        ],
      });

      await autoJoinVoice(client);

      log.success(`${main.botName} v${main.botVersion} başarıyla başlatıldı!`);
    } catch (error) {
      log.error('Ready event hatası.', error);
    }
  },
};

async function autoJoinVoice(client: Client): Promise<void> {
  try {
    for (const [, guild] of client.guilds.cache) {
      try {
        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);

        if (!channel) {
          log.warn(`Ses kanalı bulunamadı: ${VOICE_CHANNEL_ID} (${guild.name})`);
          continue;
        }

        if (channel.type !== ChannelType.GuildVoice) {
          log.warn(`Kanal ses kanalı değil: ${channel.name} (${guild.name})`);
          continue;
        }

        const botMember = guild.members.me;
        if (!botMember) continue;

        const permissions = channel.permissionsFor(botMember);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
          log.warn(`Ses kanalı yetkisi yetersiz: ${channel.name} (${guild.name})`);
          continue;
        }

        const existingConnection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: false,
        });

        existingConnection.on(VoiceConnectionStatus.Disconnected, () => {
          log.warn(`Ses bağlantısı koptu: ${guild.name}`);
        });

        existingConnection.on(VoiceConnectionStatus.Destroyed, () => {
          log.warn(`Ses bağlantısı imha edildi: ${guild.name}`);
        });

        log.info(`Ses kanalına bağlandı: #${channel.name} (${guild.name})`);
      } catch (error) {
        log.error(`Ses kanalına bağlanılamadı: ${guild.name}`, error);
      }
    }
  } catch (error) {
    log.error('Otomatik ses katılma hatası.', error);
  }
}
