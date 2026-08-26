import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'voice',
    description: 'Kullanıcının ses bilgilerini gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Kullanıcının ses bilgilerini gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Bilgisi görülecek kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user', true);

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const voiceState = targetMember.voice;

    if (!voiceState.channel) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı şu an bir ses kanalında değil.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const embed = CyberEmbed.success('Ses Bilgileri')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Kanal', value: `${voiceState.channel.name}`, inline: true },
        { name: 'Sessiz', value: voiceState.mute ? 'Evet' : 'Hayır', inline: true },
        { name: 'Sağırlık', value: voiceState.deaf ? 'Evet' : 'Hayır', inline: true },
        { name: 'Yayın', value: voiceState.streaming ? 'Evet' : 'Hayır', inline: true },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
