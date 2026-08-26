import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'auto-response',
    description: 'Yeni bir otomatik yanıt oluşturur.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('auto-response')
    .setDescription('Yeni bir otomatik yanıt oluşturur.')
    .addStringOption((option) =>
      option.setName('trigger').setDescription('Tetikleme metni').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('response').setDescription('Otomatik yanıt').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('matchtype')
        .setDescription('Eşleşme türü')
        .setRequired(false)
        .addChoices(
          { name: 'Tam Eşleşme', value: 'EXACT' },
          { name: 'İçerir', value: 'CONTAINS' },
          { name: 'İle Başlar', value: 'STARTS_WITH' },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const trigger = interaction.options.getString('trigger', true).toLowerCase();
    const response = interaction.options.getString('response', true);
    const matchType = (interaction.options.getString('matchtype') || 'CONTAINS') as 'EXACT' | 'CONTAINS' | 'STARTS_WITH';

    const db = getPrisma();

    const matchTypeMap: Record<string, string> = {
      EXACT: 'Tam Eşleşme',
      CONTAINS: 'İçerir',
      STARTS_WITH: 'İle Başlar',
    };

    const existing = await db.autoResponse.findFirst({
      where: { guildId: guild.id, trigger },
    });

    if (existing) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `"${trigger}" tetiklemeli otomatik yanıt zaten mevcut.`)],
      });
      return;
    }

    await db.autoResponse.create({
      data: {
        guildId: guild.id,
        trigger,
        response,
        matchType: matchType as never,
        createdBy: member.id,
      },
    });

    const embed = CyberEmbed.success('Otomatik Yanıt Oluşturuldu')
      .addFields(
        { name: 'Tetikleme', value: `\`${trigger}\``, inline: true },
        { name: 'Eşleşme', value: matchTypeMap[matchType] || '', inline: true },
        { name: 'Yanıt', value: response.length > 1024 ? response.slice(0, 1021) + '...' : response, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
