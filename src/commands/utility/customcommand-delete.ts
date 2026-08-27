import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'customcommand-delete',
    description: 'Özel bir komutu siler.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('customcommand-delete')
    .setDescription('Özel bir komutu siler.')
    .addStringOption((option) =>
      option.setName('name').setDescription('Silinecek komut adı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const name = interaction.options.getString('name', true).toLowerCase();

    const db = getPrisma();

    const existing = await db.customCommand.findUnique({
      where: { guildId_name: { guildId: guild.id, name } },
    });

    if (!existing) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `"${name}" adlı özel komut bulunamadı.`)],
      }) : interaction.followUp({ embeds: [CyberEmbed.error('Hata', `"${name}" adlı özel komut bulunamadı.`)], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await db.customCommand.delete({
      where: { id: existing.id },
    });

    const embed = CyberEmbed.success('Özel Komut Silindi')
      .addFields(
        { name: 'Komut', value: `\`${name}\``, inline: true },
        { name: 'Yanıt', value: existing.response.length > 1024 ? existing.response.slice(0, 1021) + '...' : existing.response, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
