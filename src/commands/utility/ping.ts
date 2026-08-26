import { SlashCommandBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'ping',
    description: 'Botun gecikme süresini gösterir.',
    category: 'utility',
    cooldown: 5,
    enabled: true,
    developerOnly: false,
    ownerOnly: false,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botun gecikme süresini gösterir.'),

  async execute({ interaction }) {
    const sent = await interaction.reply({
      embeds: [CyberEmbed.info('Pong!', 'Hesaplanıyor...')],
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = CyberEmbed.success('Pong!')
      .addFields(
        {
          name: 'Bot gecikmesi',
          value: `\`${latency}ms\``,
          inline: true,
        },
        {
          name: 'API gecikmesi',
          value: `\`${apiLatency}ms\``,
          inline: true,
        },
        {
          name: 'Durum',
          value: latency < 200 ? 'Mükemmel' : latency < 500 ? 'İyi' : 'Kötü',
          inline: true,
        },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
