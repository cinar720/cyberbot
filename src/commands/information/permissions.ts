import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'permissions',
    description: 'Kullanıcının sunucu izinlerini gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Kullanıcının sunucu izinlerini gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('İzinleri gösterilecek kullanıcı (varsayılan: siz)'),
    ),

  async execute({ interaction, guild }) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Kullanıcı bulunamadı.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const permissionFlags = Object.values(PermissionFlagsBits);

    const allPermissions = permissionFlags.map((p) => ({
      name: p.toString(),
      has: member.permissions.has(p),
    }));

    const granted = allPermissions.filter((p) => p.has).map((p) => `\`${p.name}\``);
    const denied = allPermissions.filter((p) => !p.has).map((p) => `\`${p.name}\``);

    const embed = CyberEmbed.info(`${targetUser.tag} İzinleri`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: `Verilen İzinler (${granted.length})`, value: granted.length > 0 ? granted.join(', ') : 'Yok', inline: false },
        { name: `Reddedilen İzinler (${denied.length})`, value: denied.length > 0 ? denied.join(', ') : 'Yok', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
