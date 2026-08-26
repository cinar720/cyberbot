import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { ModuleService } from '../../services/setup/ModuleService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'module',
    description: 'Tüm modülleri ve durumlarını gösterir.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('module')
    .setDescription('Tüm modülleri ve durumlarını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    await interaction.deferReply();

    const modules = await ModuleService.getAll(guild.id);

    if (modules.length === 0) {
      await interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', 'Bu sunucuda henüz modül bulunmuyor.')],
      });
      return;
    }

    const lines = modules.map((m: { enabled: boolean; name: string }) => {
      const icon = m.enabled ? '[+]' : '[-]';
      const status = m.enabled ? 'Etkin' : 'Devre Dışı';
      return `${icon} **${m.name}** — ${status}`;
    });

    const embed = CyberEmbed.success('Modül Durumları')
      .setDescription(lines.join('\n'))
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
