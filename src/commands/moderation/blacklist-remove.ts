import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'blacklist-remove',
    description: 'Kara listeden kelime çıkarır.',
    category: 'moderation',
    cooldown: 5,
    enabled: false,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('blacklist-remove')
    .setDescription('Kara listeden kelime çıkarır.')
    .addStringOption((option) =>
      option.setName('kelime').setDescription('Kara listeden çıkarılacak kelime').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const word = interaction.options.getString('kelime', true).toLowerCase();

    const db = getPrisma();

    const existing = await db.blacklistedWord.findUnique({
      where: { guildId_word: { guildId: guild.id, word } },
    });

    if (!existing) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', `"**${word}**" kelimesi kara listede bulunamadı.`)],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await db.blacklistedWord.delete({
      where: { id: existing.id },
    });

    const embed = CyberEmbed.success('Kelime Çıkarıldı')
      .addFields({ name: 'Kelime', value: `\`\`\`${word}\`\`\`` })
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
