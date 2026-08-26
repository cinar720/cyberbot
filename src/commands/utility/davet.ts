import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';
import { colors } from '../../config/colors.js';
import { getInviteUrl } from '../../web/auth/oauth2.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'davet',
    description: 'CyberBOT\'u başka bir sunucuya eklemek için davet bağlantısı oluşturur.',
    category: 'utility',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('davet')
    .setDescription('CyberBOT\'u başka bir sunucuya eklemek için davet bağlantısı oluşturur.'),

  async execute({ interaction }) {
    const inviteUrl = getInviteUrl();

    const container = new ContainerBuilder().setAccentColor(colors.info);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# CyberBOT\'u sunucuna ekle'),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'CyberBOT\'u başka bir sunucuya eklemek için aşağıdaki düğmeyi kullanabilirsin.\n\n' +
        'Gerekli izinleri sunucu sahibi veya yetkili olarak gözden geçirmeyi unutma.',
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('CyberBOT\'u sunucuya ekle')
          .setStyle(ButtonStyle.Link)
          .setURL(inviteUrl),
      ),
    );

    await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  },
} satisfies SlashCommand;
