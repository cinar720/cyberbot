import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  type ButtonInteraction,
} from 'discord.js';
import { SetupService } from '../../services/setup/SetupService.js';
import { ConfigProfileService } from '../../services/setup/ConfigProfileService.js';
import { colors } from '../../config/colors.js';
import type { SlashCommand, CommandContext, CyberBotClient } from '../../types/command.js';

const prefix = 'cyberbot:setup';

export default {
  metadata: {
    name: 'setup',
    description: 'Sunucu kurulum sihirbazını başlatır.',
    category: 'utility',
    cooldown: 30,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sunucu kurulum sihirbazını başlatır.')
    .addStringOption((option) =>
      option
        .setName('profile')
        .setDescription('Kurulum profili')
        .setRequired(true)
        .addChoices(
          { name: 'Temel - Basit sunucu yapısı', value: 'basic' },
          { name: 'Topluluk - Topluluk odaklı', value: 'community' },
          { name: 'Oyun - Oyun odaklı', value: 'gaming' },
          { name: 'RolePlay - RP odaklı', value: 'roleplay' },
          { name: 'Büyük Topluluk - Profesyonel', value: 'large' },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const profile = interaction.options.getString('profile', true);
    const profileData = ConfigProfileService.get(profile);

    if (!profileData) {
      const errContainer = new ContainerBuilder().setAccentColor(colors.error);
      errContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Hata\n\nGeçersiz kurulum profili.'),
      );
      await interaction.editReply({ components: [errContainer], flags: [MessageFlags.IsComponentsV2] });
      return;
    }

    const preview = await SetupService.preview(guild, profile);

    const channelList = preview.channels.map((c) => `**${c.name}** (${c.type})`).join('\n') || 'Yok';
    const roleList = preview.roles.map((r) => `**${r.name}**`).join('\n') || 'Yok';
    const moduleList = profileData.modules.map((m) => `**${m}**`).join('\n') || 'Yok';
    const warningList = preview.warnings.length > 0
      ? preview.warnings.map((w) => w).join('\n')
      : 'Uyarı yok';

    const container = new ContainerBuilder().setAccentColor(colors.success);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Kurulum Sihirbazı\n\n**${profileData.displayName}** profili ile sunucunuz yapılandırılacak.`),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Oluşturulacak Kanallar** (${preview.channels.length})\n${channelList}\n\n` +
        `**Oluşturulacak Roller** (${preview.roles.length})\n${roleList}\n\n` +
        `**Aktif Sistemler** (${profileData.modules.length})\n${moduleList}\n\n` +
        `**Uyarılar**\n${warningList}`,
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${prefix}:confirm:${profile}:${guild.id}:${member.id}`)
          .setLabel('Kurulumu Başlat')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`${prefix}:cancel:${guild.id}:${member.id}`)
          .setLabel('İptal')
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  },
} satisfies SlashCommand;

export async function handleSetupComponent(
  interaction: ButtonInteraction,
  _client: CyberBotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[2];
  const ownerId = parts[parts.length - 1];

  if (ownerId !== interaction.user.id) {
    await interaction.reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.error)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Hata\n\nBu menüyü sadece komutu kullanan kişi kullanabilir.'),
          ),
      ],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  if (action === 'cancel') {
    await interaction.update({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.warning)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# İptal Edildi\n\nKurulum iptal edildi.'),
          ),
      ],
    });
    return;
  }

  if (action === 'confirm') {
    const profile = parts[3];
    const profileData = profile ? ConfigProfileService.get(profile) : undefined;
    const guild = interaction.guild;

    if (!guild || !profileData) {
      await interaction.update({
        components: [
          new ContainerBuilder()
            .setAccentColor(colors.error)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('# Hata\n\nGeçersiz kurulum profili.'),
            ),
        ],
      });
      return;
    }

    await interaction.update({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.info)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Kurulum Başlatılıyor\n\n**${profileData.displayName}** profili uygulanıyor...`),
          ),
      ],
    });

    const member = guild.members.cache.get(ownerId);
    if (!member || !profile) return;

    const result = await SetupService.execute(guild, member, profile);

    if (result.success) {
      const container = new ContainerBuilder().setAccentColor(colors.success);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Kurulum Tamamlandı\n\n**${profileData.displayName}** profili başarıyla uygulandı.`),
      );

      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Oluşturulan:** ${result.itemsCreated.length} öğe\n` +
          `**Atlanan:** ${result.itemsSkipped.length} öğe`,
        ),
      );

      if (result.errors.length > 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Hatalar**\n${result.errors.join('\n')}`),
        );
      }

      await interaction.editReply({ components: [container] }).catch(() => null);
    } else {
      const container = new ContainerBuilder().setAccentColor(colors.error);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Kurulum Başarısız\n\n${result.errors.join('\n') || 'Bilinmeyen bir hata oluştu.'}`),
      );
      await interaction.editReply({ components: [container] }).catch(() => null);
    }
  }
}
