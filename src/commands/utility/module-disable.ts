import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { ModuleService } from '../../services/setup/ModuleService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'module-disable',
    description: 'Bir modülü devre dışı bırakır.',
    category: 'utility',
    cooldown: 5,
    enabled: false,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('module-disable')
    .setDescription('Bir modülü devre dışı bırakır.')
    .addStringOption((option) =>
      option.setName('name').setDescription('Devre dışı bırakılacak modül adı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const name = interaction.options.getString('name', true);

    await interaction.deferReply();

    await ModuleService.disable(guild.id, name);

    const embed = CyberEmbed.success('Modül Devre Dışı Bırakıldı')
      .setDescription(`**${name}** modülü başarıyla devre dışı bırakıldı.`)
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
