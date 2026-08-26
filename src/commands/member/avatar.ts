import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'avatar',
    description: 'Kullanıcının avatarını gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Kullanıcının avatarını gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Avatarı görüntülenecek kullanıcı').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    const embed = CyberEmbed.info('Kullanıcı Avatarı')
      .setDescription(`${targetUser.tag} kullanıcısının avatarı:`)
      .setImage(targetUser.displayAvatarURL({ size: 1024 }))
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .setDefaultFooter()
      .setTimestampNow();

    if (targetMember) {
      embed.addFields({
        name: 'Sunucu Avatarı',
        value: targetMember.displayAvatarURL({ size: 1024 })
          ? `[Tıkla](${targetMember.displayAvatarURL({ size: 1024 })})`
          : 'Yok',
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
