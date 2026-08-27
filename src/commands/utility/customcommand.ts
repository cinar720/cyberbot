import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'customcommand',
    description: 'Yeni bir özel komut oluşturur.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Yeni bir özel komut oluşturur.')
    .addStringOption((option) =>
      option.setName('name').setDescription('Komut adı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('response').setDescription('Komut yanıtı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const name = interaction.options.getString('name', true).toLowerCase();
    const response = interaction.options.getString('response', true);

    const db = getPrisma();

    const existing = await db.customCommand.findUnique({
      where: { guildId_name: { guildId: guild.id, name } },
    });

    if (existing) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `"${name}" adlı özel komut zaten mevcut.`)],
      }) : interaction.followUp({ embeds: [CyberEmbed.error('Hata', `"${name}" adlı özel komut zaten mevcut.`)], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await db.customCommand.create({
      data: {
        guildId: guild.id,
        name,
        response,
        createdBy: member.id,
      },
    });

    const embed = CyberEmbed.success('Özel Komut Oluşturuldu')
      .addFields(
        { name: 'Komut', value: `\`${name}\``, inline: true },
        { name: 'Yanıt', value: response.length > 1024 ? response.slice(0, 1021) + '...' : response, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
