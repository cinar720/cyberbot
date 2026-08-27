import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'blacklist-add',
    description: 'Kara listeye kelime ekler.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('blacklist-add')
    .setDescription('Kara listeye kelime ekler.')
    .addStringOption((option) =>
      option.setName('kelime').setDescription('Kara listeye eklenecek kelime').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('eylem')
        .setDescription('Kelime tespit edildiğinde yapılacak eylem')
        .setRequired(true)
        .addChoices(
          { name: 'Sil', value: 'delete' },
          { name: 'Uyar', value: 'warn' },
          { name: 'Sustur', value: 'mute' },
          { name: 'At', value: 'kick' },
          { name: 'Yasakla', value: 'ban' },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const word = interaction.options.getString('kelime', true).toLowerCase();
    const action = interaction.options.getString('eylem', true);

    const db = getPrisma();

    const existing = await db.blacklistedWord.findUnique({
      where: { guildId_word: { guildId: guild.id, word } },
    });

    if (existing) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', `"**${word}**" kelimesi zaten kara listede mevcut.`)],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await db.blacklistedWord.create({
      data: {
        guildId: guild.id,
        word,
        action,
        createdBy: member.id,
      },
    });

    const actionLabels: Record<string, string> = {
      delete: 'Sil',
      warn: 'Uyar',
      mute: 'Sustur',
      kick: 'At',
      ban: 'Yasakla',
    };

    const embed = CyberEmbed.success('Kelime Eklendi')
      .addFields(
        { name: 'Kelime', value: `\`\`\`${word}\`\`\``, inline: true },
        { name: 'Eylem', value: actionLabels[action] || action, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
