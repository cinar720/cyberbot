import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CommandHandler } from '../../structures/CommandHandler.js';
import { CommandRegistry } from '../../structures/CommandRegistry.js';
import { main } from '../../config/main.js';
import type { SlashCommand } from '../../types/command.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('DEV');

export default {
  metadata: {
    name: 'reload',
    description: 'Komutları yeniden yükler ve kaydeder.',
    category: 'developer',
    cooldown: 10,
    developerOnly: true,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Komutları yeniden yükler ve kaydeder.'),

  async execute({ interaction, client }) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
      const registry = new CommandRegistry(main.token, main.clientId);
      const commandHandler = new CommandHandler(registry);

      client.slashCommands.clear();
      await commandHandler.loadCommands(client);
      await commandHandler.registerCommands(client);

      const embed = CyberEmbed.success('Komutlar Yeniden Yüklendi')
        .setDescription(`${client.slashCommands.size} komut başarıyla yeniden yüklendi ve kaydedildi.`)
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
      log.info('Komutlar yeniden yüklendi.');
    } catch (error) {
      log.error('Yeniden yükleme hatası:', error);
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Yeniden yükleme başarısız: ${error}`)],
      });
    }
  },
} satisfies SlashCommand;
