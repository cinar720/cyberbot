import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'userinfo',
    description: 'Kullanıcı hakkında bilgi gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Kullanıcı hakkında bilgi gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Bilgisi görüntülenecek kullanıcı').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
      });
      return;
    }

    const roles = targetMember.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString());

    const permissions = targetMember.permissions.toArray();

    const accountAge = Math.floor((Date.now() - targetUser.createdTimestamp) / (1000 * 60 * 60 * 24));
    const memberSince = Math.floor((Date.now() - targetMember.joinedTimestamp!) / (1000 * 60 * 60 * 24));

    const embed = CyberEmbed.info('Kullanıcı Bilgisi')
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Takma Ad', value: targetMember.nickname || 'Yok', inline: true },
        { name: 'Bot', value: targetUser.bot ? 'Evet' : 'Hayır', inline: true },
        { name: 'Hesap Oluşturma', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Sunucuya Katılma', value: `<t:${Math.floor(targetMember.joinedTimestamp! / 1000)}:R>`, inline: true },
        { name: 'Hesap Yaşı', value: `${accountAge} gün`, inline: true },
        { name: 'Üyelik Süresi', value: `${memberSince} gün`, inline: true },
        { name: `Roller (${roles.length})`, value: roles.length > 0 ? roles.join(', ') : 'Rol yok', inline: false },
        { name: 'İzinler', value: permissions.length > 0 ? permissions.join(', ') : 'Yok', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
