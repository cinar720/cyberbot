import { Events, Message, TextChannel, PermissionFlagsBits } from 'discord.js';
import { LevelService } from '../services/level/LevelService.js';
import { CyberEmbed } from '../utils/embed.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('LEVEL');
const cooldowns = new Map<string, number>();

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    const config = await LevelService.getConfig(guildId);
    if (!config || !config.enabled) return;

    const now = Date.now();
    const cooldownKey = `${guildId}:${userId}`;
    const lastXpTime = cooldowns.get(cooldownKey);
    if (lastXpTime && now - lastXpTime < config.xpCooldown * 1000) return;

    cooldowns.set(cooldownKey, now);

    const xpAmount = Math.floor(Math.random() * config.xpPerMessage) + 1;
    const result = await LevelService.addXp(guildId, userId, xpAmount);

    if (!result.leveled) return;

    log.info(`${message.author.tag} seviye atladı: Level ${result.newLevel} [${message.guild.name}]`);

    let channel: TextChannel | null = null;

    if (config.levelUpChannelId) {
      const ch = message.guild.channels.cache.get(config.levelUpChannelId);
      if (ch && ch.isTextBased()) {
        channel = ch as TextChannel;
      }
    }

    if (!channel) {
      if (message.channel.isTextBased()) {
        channel = message.channel as TextChannel;
      }
    }

    if (!channel) return;

    const levelUpMessage = config.levelUpMessage
      .replace('{user}', `<@${userId}>`)
      .replace('{level}', String(result.newLevel));

    const embed = CyberEmbed.success('Seviye Atlandı!')
      .setDescription(levelUpMessage)
      .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
      .setDefaultFooter()
      .setTimestampNow();

    try {
      if (message.guild.members.me && channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      log.error(`Seviye atlama mesajı gönderilemedi: ${guildId}`, error);
    }

    const roleRewards = config.roleRewards;
    if (Array.isArray(roleRewards)) {
      for (const reward of roleRewards) {
        if (
          reward &&
          typeof reward === 'object' &&
          'level' in reward &&
          'roleId' in reward &&
          Number((reward as { level: unknown }).level) === result.newLevel
        ) {
          try {
            const member = await message.guild.members.fetch(userId);
            const roleId = String((reward as { roleId: unknown }).roleId);
            if (!member.roles.cache.has(roleId)) {
              await member.roles.add(roleId);
              log.info(`Rol ödülü verildi: ${userId} -> ${roleId} (Level ${result.newLevel})`);
            }
          } catch (error) {
            log.error(`Rol ödül hatası: ${userId}`, error);
          }
        }
      }
    }
  },
};
