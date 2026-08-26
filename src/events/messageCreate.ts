import { Events, Message, Collection } from 'discord.js';
import type { CyberClient } from '../types/index.js';
import { PermissionManager } from '../utils/permissions.js';
import { CyberEmbed, sendError } from '../utils/embed.js';
import { Logger } from '../utils/logger.js';
import { main } from '../config/main.js';

const log = new Logger('EVENT');

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const client = message.client as unknown as CyberClient;
    const prefix = main.prefix;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.commands.get(commandName);
    if (!command) return;

    const cooldowns = client.cooldowns;
    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name)!;
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const embed = CyberEmbed.warning(
          `Lütfen ${timeLeft.toFixed(1)} saniye bekleyin.`,
        );
        await message.reply({ embeds: [embed] }).catch(() => null);
        return;
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    const permissionCheck = PermissionManager.checkCommandPermissions(message, {
      ownerOnly: command.ownerOnly,
      developerOnly: command.developerOnly,
      guildOnly: command.guildOnly,
      permissions: command.permissions,
      botPermissions: command.botPermissions,
    });

    if (!permissionCheck.allowed) {
      let errorMsg: string;
      switch (permissionCheck.reason) {
        case 'ownerOnly':
          errorMsg = 'Bu komut sadece bot sahibi tarafından kullanılabilir.';
          break;
        case 'developerOnly':
          errorMsg = 'Bu komut sadece geliştirici tarafından kullanılabilir.';
          break;
        case 'guildOnly':
          errorMsg = 'Bu komut sadece sunucularda kullanılabilir.';
          break;
        case 'noPermission':
          errorMsg = 'Bu komutu kullanmak için yeterli yetkiniz yok.';
          break;
        case 'botNoPermission':
          errorMsg = 'Bu komutu gerçekleştirmek için gerekli yetkilere sahip değilim.';
          break;
        default:
          errorMsg = 'Bir hata oluştu.';
      }

      await sendError(message, 'Yetki Hatası', errorMsg);
      return;
    }

    try {
      log.info(`${message.author.tag} -> ${prefix}${command.name} [${message.guild.name}]`);
      await command.execute(message, args);
    } catch (error) {
      log.error(`Komut çalıştırma hatası: ${command.name}`, error);
      await sendError(message, 'Hata', 'Komut çalıştırılırken bir hata oluştu.');
    }
  },
};
