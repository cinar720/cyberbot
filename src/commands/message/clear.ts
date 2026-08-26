import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'clear',
    description: 'Belirtilen sayıda mesajı siler.',
    category: 'message',
    cooldown: 5,
    enabled: false,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Belirtilen sayıda mesajı siler.')
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Silinecek mesaj sayısı').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const amount = interaction.options.getInteger('amount', true);

    await interaction.deferReply();

    const channel = interaction.channel;
    if (!channel || !('messages' in channel)) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
      });
      return;
    }

    try {
      const deleted = await (channel as { bulkDelete(amount: number, filterOld: boolean): Promise<unknown> })
        .bulkDelete(amount, true)
        .catch(() => null);

      const deletedCount = deleted && typeof deleted === 'object' && 'size' in deleted
        ? (deleted as { size: number }).size
        : 0;

      const embed = CyberEmbed.success('Mesajlar Silindi')
        .addFields(
          { name: 'Miktar', value: `${deletedCount}`, inline: true },
          { name: 'Kanal', value: `${channel}`, inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesajlar silinirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;