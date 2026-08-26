import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'nickname',
    description: 'Kullanıcının takma adını değiştirir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageNicknames],
    botPermissions: [PermissionFlagsBits.ManageNicknames],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Kullanıcının takma adını değiştirir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Takma adı değiştirilecek kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('nickname').setDescription('Yeni takma adı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user', true);
    const nickname = interaction.options.getString('nickname', true);

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
      });
      return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position && guild.ownerId !== member.id) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Bu kullanıcının takma adını değiştirme yetkiniz yok. Hedef kullanıcı sizinle aynı veya daha yüksek bir role sahip.')],
      });
      return;
    }

    await targetMember.setNickname(nickname);

    const embed = CyberEmbed.success('Takma Ad Değiştirildi')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Yeni Takma Ad', value: nickname, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
