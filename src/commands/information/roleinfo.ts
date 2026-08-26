import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'roleinfo',
    description: 'Rol hakkında bilgi gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Rol hakkında bilgi gösterir.')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Bilgi gösterilecek rol').setRequired(true),
    ),

  async execute({ interaction }) {
    const roleData = interaction.options.getRole('role', true);
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }
    const role = guild.roles.cache.get(roleData.id);
    if (!role) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Rol bulunamadı.')], flags: [MessageFlags.Ephemeral] });
      return;
    }
    const memberCount = role.members.size;

    const embed = CyberEmbed.info(`Rol Bilgisi: ${role.name}`)
      .addFields(
        { name: 'İsim', value: `\`${role.name}\``, inline: true },
        { name: 'Renk', value: `\`${role.hexColor}\``, inline: true },
        { name: 'Üye Sayısı', value: `\`${memberCount}\``, inline: true },
        { name: 'Pozisyon', value: `\`${role.position}\``, inline: true },
        { name: 'Oluşturulma', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'İzinler', value: role.permissions.toArray().map((p) => `\`${p}\``).join(', ') || 'Yok', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
