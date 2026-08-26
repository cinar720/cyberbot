import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { SetupService } from '../../services/setup/SetupService.js';
import { ConfigProfileService } from '../../services/setup/ConfigProfileService.js';
import { emojis } from '../../config/emojis.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'setup-preview',
    description: 'Kurulum önizlemesini gösterir.',
    category: 'utility',
    cooldown: 10,
    enabled: false,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('setup-preview')
    .setDescription('Kurulum önizlemesini gösterir.')
    .addStringOption((option) =>
      option
        .setName('profile')
        .setDescription('Kurulum profili')
        .setRequired(true)
        .addChoices(
          { name: 'Temel - Basit sunucu yapısı', value: 'basic' },
          { name: 'Topluluk - Topluluk odaklı', value: 'community' },
          { name: 'Oyun - Oyun odaklı', value: 'gaming' },
          { name: 'RolePlay - RP odaklı', value: 'roleplay' },
          { name: 'Büyük Topluluk - Profesyonel', value: 'large' },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const profile = interaction.options.getString('profile', true);
    const profileData = ConfigProfileService.get(profile);

    await interaction.deferReply();

    const preview = await SetupService.preview(guild, profile);

    const channelList = preview.channels.map((c) => `${emojis.channel} **${c.name}** (${c.type})`).join('\n') || 'Yok';
    const roleList = preview.roles.map((r) => `${emojis.user} **${r.name}**`).join('\n') || 'Yok';
    const warningList = preview.warnings.length > 0
      ? preview.warnings.map((w) => `${emojis.warning} ${w}`).join('\n')
      : `${emojis.check} Uyarı yok`;

    const displayName = profileData?.displayName ?? profile;

    const embed = CyberEmbed.success(`${displayName} Kurulum Önizlemesi`)
      .setDescription('Bu profille oluşturulacak yapılar aşağıdadır.')
      .addFields(
        { name: `${emojis.channel} Kanallar`, value: channelList, inline: true },
        { name: `${emojis.user} Roller`, value: roleList, inline: true },
        { name: `${emojis.warning} Uyarılar`, value: warningList, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
