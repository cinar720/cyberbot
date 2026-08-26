import { Events, GuildMember, EmbedBuilder } from 'discord.js';
import { Logger } from '../utils/logger.js';
import { colors } from '../config/colors.js';
import { emojis } from '../config/emojis.js';
import { getOrCreateGuild, getOrCreateUser } from '../services/database/index.js';
import { main } from '../config/main.js';

const log = new Logger('EVENT');

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember): Promise<void> {
    try {
      await getOrCreateGuild(member.guild);
      await getOrCreateUser(member.user);

      log.info(`${member.user.tag} sunucuya katıldı: ${member.guild.name}`);

      const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
      if (!welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (!channel || !('send' in channel)) return;

      const embed = new EmbedBuilder()
        .setTitle(`${emojis.heart} Hoş Geldin!`)
        .setDescription(
          `**${member.user.tag}** sunucuya katıldı!\nSeninle birlikte **${member.guild.memberCount}** kişi olduk.`,
        )
        .setColor(colors.success)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp()
        .setFooter({ text: main.botName });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      log.error('GuildMemberAdd event hatası.', error);
    }
  },
};
