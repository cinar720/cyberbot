import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'membercount',
    description: 'Sunucu üye sayısını gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Sunucu üye sayısını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    await interaction.deferReply();

    const members = await guild.members.fetch();

    const total = members.size;
    const online = members.filter((m) => m.presence?.status === 'online').size;
    const idle = members.filter((m) => m.presence?.status === 'idle').size;
    const dnd = members.filter((m) => m.presence?.status === 'dnd').size;
    const offline = members.filter((m) => !m.presence || m.presence.status === 'offline').size;
    const bots = members.filter((m) => m.user.bot).size;
    const humans = total - bots;

    const embed = CyberEmbed.info('Üye Sayısı')
      .setDescription(`${guild.name} sunucusunun üye sayısı:`)
      .addFields(
        { name: 'Toplam', value: `${total}`, inline: true },
        { name: 'İnsan', value: `${humans}`, inline: true },
        { name: 'Bot', value: `${bots}`, inline: true },
        { name: 'Çevrimiçi', value: `${online}`, inline: true },
        { name: 'Boşta', value: `${idle}`, inline: true },
        { name: 'Rahatsız Etmeyin', value: `${dnd}`, inline: true },
        { name: 'Çevrimdışı', value: `${offline}`, inline: true },
      )
      .setThumbnail(guild.iconURL({ size: 512 }) || '')
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
