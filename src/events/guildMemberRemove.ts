import { Events, GuildMember, EmbedBuilder } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { colors } from '../config/colors.js';
import { emojis } from '../config/emojis.js';
import { main } from '../config/main.js';

const log = new Logger('EVENT');

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember): Promise<void> {
    try {
      log.info(`${member.user.tag} sunucudan ayrıldı: ${member.guild.name}`);

      const leaveChannelId = process.env.LEAVE_CHANNEL_ID;
      if (!leaveChannelId) return;

      const channel = member.guild.channels.cache.get(leaveChannelId);
      if (!channel || !('send' in channel)) return;

      const embed = new EmbedBuilder()
        .setTitle(`${emojis.heart} Hoşça Kal!`)
        .setDescription(
          `**${member.user.tag}** sunucudan ayrıldı.\nArtık **${member.guild.memberCount}** kişiyiz.`,
        )
        .setColor(colors.error)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp()
        .setFooter({ text: main.botName });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      log.error('GuildMemberRemove event hatası.', error);
    }
  },
};
