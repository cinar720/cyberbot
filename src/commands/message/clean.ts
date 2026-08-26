import { SlashCommandBuilder, PermissionFlagsBits, type Message, type TextChannel } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'clean',
    description: 'Belirtilen kullanıcının mesajlarını temizler.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('Belirtilen kullanıcının mesajlarını temizler.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Silinecek mesaj sayısı (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Silinecek kullanıcı (boşsa tüm mesajlar)').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply();

    try {
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !('messages' in channel)) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        });
        return;
      }

      const textChannel = channel as TextChannel;
      let deletedCount = 0;
      let remaining = amount;

      while (remaining > 0) {
        const fetchAmount = Math.min(remaining, 100);
        const messages = await textChannel.messages.fetch({ limit: fetchAmount });
        if (messages.size === 0) break;

        let filteredMessages: Message[];
        if (targetUser) {
          filteredMessages = Array.from(messages.values()).filter((msg) => msg.author.id === targetUser.id);
        } else {
          filteredMessages = Array.from(messages.values());
        }

        if (filteredMessages.length === 0) break;

        const bulkDelete = await textChannel.bulkDelete(filteredMessages, true);
        deletedCount += bulkDelete.size;
        remaining -= bulkDelete.size;
      }

      const embed = CyberEmbed.success(`${emojis.trash} Mesajlar Temizlendi`)
        .addFields(
          { name: 'Silinen Mesaj', value: `${deletedCount}`, inline: true },
          { name: 'Kanal', value: `${channel}`, inline: true },
        );

      if (targetUser) {
        embed.addFields({ name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true });
      }

      embed.setDefaultFooter().setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesajlar silinirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;
