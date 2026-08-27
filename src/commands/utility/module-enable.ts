import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { ModuleService } from '../../services/setup/ModuleService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'module-enable',
    description: 'Bir modülü etkinleştirir.',
    category: 'utility',
    cooldown: 5,
    enabled: false,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('module-enable')
    .setDescription('Bir modülü etkinleştirir.')
    .addStringOption((option) =>
      option.setName('name').setDescription('Etkinleştirilecek modül adı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const name = interaction.options.getString('name', true);

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    await ModuleService.enable(guild.id, name);

    const embed = CyberEmbed.success('Modül Etkinleştirildi')
      .setDescription(`**${name}** modülü başarıyla etkinleştirildi.`)
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
