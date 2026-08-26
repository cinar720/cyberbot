import { SlashCommandBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'inviteinfo',
    description: 'Davet bağlantısı hakkında bilgi gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('inviteinfo')
    .setDescription('Davet bağlantısı hakkında bilgi gösterir.')
    .addStringOption((option) =>
      option.setName('code').setDescription('Davet kodu veya URL').setRequired(true),
    ),

  async execute({ interaction, client }) {
    const input = interaction.options.getString('code', true);
    const code = input.replace('https://discord.gg/', '').replace('http://discord.gg/', '').replace('https://discord.com/invite/', '').replace('http://discord.com/invite/', '');

    await interaction.deferReply();

    let invite;
    try {
      invite = await client.fetchInvite(code);
    } catch {
      await interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Davet bulunamadı. Lütfen geçerli bir davet kodu girin.')] });
      return;
    }

    const embed = CyberEmbed.info(`${invite.code} Davet Bilgisi`)
      .addFields(
        { name: 'Genel', value: [
          `Kod: \`${invite.code}\``,
          `URL: ${invite.url}`,
          `Kullanım: \`${invite.uses ?? 0}\``,
          `Bitiş: ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Yok'}`,
        ].join('\n'), inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (invite.guild) {
      const guildInfo = [
        `Ad: \`${invite.guild.name}\``,
        `ID: \`${invite.guild.id}\``,
      ];

      if ('memberCount' in invite.guild) {
        guildInfo.push(`Üye: \`${invite.guild.memberCount}\``);
      }

      embed.addFields({ name: 'Sunucu', value: guildInfo.join('\n'), inline: true });

      if (invite.guild.iconURL()) {
        embed.setThumbnail(invite.guild.iconURL({ size: 512 }) || '');
      }
    }

    if (invite.channel) {
      embed.addFields(
        { name: 'Kanal', value: [
          `Ad: \`${invite.channel.name}\``,
          `ID: \`${invite.channel.id}\``,
          `Tür: \`${invite.channel.type}\``,
        ].join('\n'), inline: true },
      );
    }

    if (invite.inviter) {
      embed.addFields(
        { name: 'Davet Eden', value: [
          `Kullanıcı: \`${invite.inviter.tag}\``,
          `ID: \`${invite.inviter.id}\``,
        ].join('\n'), inline: true },
      );
    }

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
