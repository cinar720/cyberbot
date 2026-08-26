import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'resetnickname',
    description: 'Kullanıcının takma adını sıfırlar.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageNicknames],
    botPermissions: [PermissionFlagsBits.ManageNicknames],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('resetnickname')
    .setDescription('Kullanıcının takma adını sıfırlar.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Takma adı sıfırlanacak kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user', true);

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
      });
      return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position && guild.ownerId !== member.id) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Bu kullanıcının takma adını sıfırlama yetkiniz yok. Hedef kullanıcı sizinle aynı veya daha yüksek bir role sahip.')],
      });
      return;
    }

    await targetMember.setNickname(null);

    const embed = CyberEmbed.success('Takma Ad Sıfırlandı')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
