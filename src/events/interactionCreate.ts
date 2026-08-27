import { Events, GuildMember, Collection, MessageFlags, type Interaction } from 'discord.js';
import type { CyberBotClient } from '../types/command.js';
import { Logger } from '../utils/logger.js';
import { PermissionManager } from '../utils/permissions.js';
import { CyberEmbed } from '../utils/embed.js';
import { PremiumService } from '../services/premium/PremiumService.js';
import { isPremiumCommand } from '../config/premium.js';
import { handleHelpComponent } from '../commands/utility/help.js';
import { handlePanelComponent, handlePanelButton } from '../commands/utility/panel.js';
import { handleSetupComponent } from '../commands/utility/setup.js';
import { handleSetupApplyComponent } from '../commands/utility/setup-apply.js';
import { handleCasesComponent } from '../commands/moderation/cases.js';
import { reportError } from '../utils/errorReporter.js';

const log = new Logger('EVENT');

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction): Promise<void> {
    const client = interaction.client as unknown as CyberBotClient;

    try {
      if (interaction.isChatInputCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        const member = interaction.member as GuildMember | null;
        const metadata = command.metadata;

        if (metadata.ownerOnly && !PermissionManager.isOwner(interaction.user.id)) {
          await interaction.reply({
            embeds: [CyberEmbed.error('Yetki Hatası', 'Bu komut sadece bot sahibi tarafından kullanılabilir.')],
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        if (metadata.developerOnly && !PermissionManager.isDeveloper(interaction.user.id)) {
          await interaction.reply({
            embeds: [CyberEmbed.error('Yetki Hatası', 'Bu komut sadece geliştirici tarafından kullanılabilir.')],
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        if (metadata.guildOnly && !interaction.guild) {
          await interaction.reply({
            embeds: [CyberEmbed.error('Hata', 'Bu komut sadece sunucularda kullanılabilir.')],
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        if (metadata.permissions && metadata.permissions.length > 0 && member) {
          if (!PermissionManager.hasAllPermissions(member, metadata.permissions)) {
            await interaction.reply({
              embeds: [CyberEmbed.error('Yetki Hatası', 'Bu komutu kullanmak için yeterli yetkiniz yok.')],
              flags: [MessageFlags.Ephemeral],
            });
            return;
          }
        }

        if (metadata.botPermissions && metadata.botPermissions.length > 0 && interaction.guild) {
          const botMember = interaction.guild.members.me;
          if (botMember && !PermissionManager.hasAllPermissions(botMember, metadata.botPermissions)) {
            await interaction.reply({
              embeds: [CyberEmbed.error('Yetki Hatası', 'Bu komutu gerçekleştirmek için gerekli yetkilere sahip değilim.')],
              flags: [MessageFlags.Ephemeral],
            });
            return;
          }
        }

        if (isPremiumCommand(interaction.commandName)) {
          try {
            await interaction.deferReply();
          } catch {
            log.error('Premium komutu deferred edilemedi.');
            return;
          }

          try {
            const hasPremium = await PremiumService.hasPremium(interaction.user.id);
            if (!hasPremium) {
              await interaction.editReply({
                embeds: [CyberEmbed.error('Premium Gerekli', 'Bu komutu kullanmak için **Premium** sahibi olmalısınız.\nPremium hakkında bilgi almak için `/premium` komutunu kullanın.')],
              }).catch(() => null);
              return;
            }
          } catch (error) {
            log.error('Premium kontrolü sırasında beklenmeyen hata.', error);
            await interaction.editReply({
              embeds: [CyberEmbed.error('Hata', 'Premium durumu kontrol edilemiyor. Lütfen daha sonra tekrar deneyin.')],
            }).catch(() => null);
            return;
          }
        }

        const cooldowns = client.cooldowns;
        if (!cooldowns.has(interaction.commandName)) {
          cooldowns.set(interaction.commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(interaction.commandName)!;
        const cooldownAmount = (metadata.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            const cooldownEmbed = CyberEmbed.warning(`Lütfen ${timeLeft.toFixed(1)} saniye bekleyin.`);
            if (interaction.deferred) {
              await interaction.editReply({ embeds: [cooldownEmbed] }).catch(() => null);
            } else {
              await interaction.reply({ embeds: [cooldownEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }
            return;
          }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
          log.info(`/${interaction.commandName} | Kullanıcı: ${interaction.user.tag} | Sunucu: ${interaction.guild?.name || 'DM'}`);
          if (interaction.replied || interaction.deferred) {
            log.warn(`/${interaction.commandName} interaction zaten onaylanmış, atlanıyor.`);
            return;
          }
          await command.execute({
            interaction,
            member,
            guild: interaction.guild,
            channel: interaction.channel,
            client,
            user: interaction.user,
          });
        } catch (error) {
          log.error(`Komut hatası: ${interaction.commandName}`, error);
          await reportError(client, `Komut: /${interaction.commandName}`, error, `Kullanıcı: ${interaction.user.id}`);
          const errorEmbed = CyberEmbed.error('Hata', 'Komut çalıştırılırken bir hata oluştu.');
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] }).catch(() => null);
          } else {
            await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          }
        }
      } else if (interaction.isAutocomplete()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
          await command.autocomplete(interaction);
        } catch (error) {
          log.error(`Autocomplete hatası: ${interaction.commandName}`, error);
        }
      } else if (interaction.isButton()) {
        if (interaction.customId.startsWith('cyberbot:help:')) {
          await handleHelpComponent(interaction, client);
          return;
        }

        if (interaction.customId.startsWith('cyberbot:panel:')) {
          await handlePanelButton(interaction, client);
          return;
        }

        if (interaction.customId.startsWith('cyberbot:setup:')) {
          await handleSetupComponent(interaction, client);
          return;
        }

        if (interaction.customId.startsWith('cyberbot:setup-apply:')) {
          await handleSetupApplyComponent(interaction, client);
          return;
        }

        if (interaction.customId.startsWith('cyberbot:cases:')) {
          await handleCasesComponent(interaction, client);
          return;
        }

        const button = client.buttons.get(interaction.customId);
        if (!button) return;

        try {
          await button.execute(interaction);
        } catch (error) {
          log.error(`Buton hatası: ${interaction.customId}`, error);
          await reportError(client, `Buton: ${interaction.customId}`, error, `Kullanıcı: ${interaction.user.id}`);
          const errorEmbed = CyberEmbed.error('Hata', 'Buton işlemi sırasında bir hata oluştu.');
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          } else {
            await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          }
        }
      } else if (interaction.isModalSubmit()) {
        const modal = client.modals.get(interaction.customId);
        if (!modal) return;

        try {
          await modal.execute(interaction);
        } catch (error) {
          log.error(`Modal hatası: ${interaction.customId}`, error);
          await reportError(client, `Modal: ${interaction.customId}`, error, `Kullanıcı: ${interaction.user.id}`);
          const errorEmbed = CyberEmbed.error('Hata', 'Modal işlemi sırasında bir hata oluştu.');
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          } else {
            await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          }
        }
      } else if (interaction.isAnySelectMenu()) {
        if (interaction.customId.startsWith('cyberbot:help:')) {
          if (!interaction.isStringSelectMenu()) return;
          await handleHelpComponent(interaction, client);
          return;
        }

        if (interaction.customId.startsWith('cyberbot:panel:')) {
          if (!interaction.isStringSelectMenu()) return;
          await handlePanelComponent(interaction, client);
          return;
        }

        const selectMenu = client.selectMenus.get(interaction.customId);
        if (!selectMenu) return;

        try {
          await selectMenu.execute(interaction);
        } catch (error) {
          log.error(`Select menu hatası: ${interaction.customId}`, error);
          await reportError(client, `Select menu: ${interaction.customId}`, error, `Kullanıcı: ${interaction.user.id}`);
          const errorEmbed = CyberEmbed.error('Hata', 'Menü işlemi sırasında bir hata oluştu.');
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          } else {
            await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
          }
        }
      }
    } catch (error) {
      log.error('Interaction handling hatası.', error);
      await reportError(client, 'Interaction handler', error, `Kullanıcı: ${interaction.user.id}`);
    }
  },
};
