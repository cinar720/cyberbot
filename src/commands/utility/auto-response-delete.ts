import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'auto-response-delete',
    description: 'Bir otomatik yanıtı siler.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('auto-response-delete')
    .setDescription('Bir otomatik yanıtı siler.')
    .addStringOption((option) =>
      option.setName('trigger').setDescription('Silinecek tetikleme metni').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const trigger = interaction.options.getString('trigger', true).toLowerCase();

    const db = getPrisma();

    const existing = await db.autoResponse.findFirst({
      where: { guildId: guild.id, trigger },
    });

    if (!existing) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `"${trigger}" tetiklemeli otomatik yanıt bulunamadı.`)],
      });
      return;
    }

    await db.autoResponse.delete({
      where: { id: existing.id },
    });

    const matchTypeMap: Record<string, string> = {
      EXACT: 'Tam Eşleşme',
      CONTAINS: 'İçerir',
      STARTS_WITH: 'İle Başlar',
    };

    const embed = CyberEmbed.success('Otomatik Yanıt Silindi')
      .addFields(
        { name: 'Tetikleme', value: `\`${trigger}\``, inline: true },
        { name: 'Eşleşme', value: matchTypeMap[existing.matchType] || '', inline: true },
        { name: 'Yanıt', value: existing.response.length > 1024 ? existing.response.slice(0, 1021) + '...' : existing.response, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
