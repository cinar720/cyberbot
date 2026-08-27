import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} from 'discord.js';
import { colors } from '../../config/colors.js';
import { emojis } from '../../config/emojis.js';
import { LevelService } from '../../services/level/LevelService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

async function safeDefer(interaction: import('discord.js').ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.deferred || interaction.replied) return true;
  try {
    await interaction.deferReply();
    return true;
  } catch {
    return false;
  }
}

export default {
  metadata: {
    name: 'seviye-yapilandir',
    description: 'Seviye sistemini yapılandırır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('seviye-yapilandir')
    .setDescription('Seviye sistemini yapılandırır.')
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Seviye ayarlarını yapılandırır.')
        .addIntegerOption((opt) =>
          opt
            .setName('xp-miktari')
            .setDescription('Mesaj başına verilecek maksimum XP (1-100)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('cooldown')
            .setDescription('Aynı kullanıcıya XP verme süresi (saniye)')
            .setRequired(false)
            .setMinValue(10)
            .setMaxValue(300),
        )
        .addChannelOption((opt) =>
          opt
            .setName('level-kanali')
            .setDescription('Seviye atlama mesajı gönderilecek kanal')
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName('mesaj')
            .setDescription('Seviye atlama mesajı ({user}, {level} değişkenleri)')
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName('durum')
            .setDescription('Seviye sistemini aktif/pasif yap')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('durum').setDescription('Mevcut seviye yapılandırmasını gösterir.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('rol-odulu')
        .setDescription('Seviye ödüllü rol ekler veya kaldırır.')
        .addIntegerOption((opt) =>
          opt
            .setName('seviye')
            .setDescription('Rol ödülünün verileceği seviye')
            .setRequired(true)
            .setMinValue(1),
        )
        .addRoleOption((opt) =>
          opt
            .setName('rol')
            .setDescription('Ödül rolü (boş bırakırsanız kaldırılır)')
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as unknown as SlashCommandBuilder,

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'ayarla') {
      await handleAyarla(interaction, guild);
    } else if (sub === 'durum') {
      await handleDurum(interaction, guild);
    } else if (sub === 'rol-odulu') {
      await handleRolOdulu(interaction, guild);
    }
  },
} satisfies SlashCommand;

async function handleAyarla(
  interaction: import('discord.js').ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);

  const xpAmount = interaction.options.getInteger('xp-miktari');
  const cooldown = interaction.options.getInteger('cooldown');
  const levelChannel = interaction.options.getChannel('level-kanali');
  const message = interaction.options.getString('mesaj');
  const enabled = interaction.options.getBoolean('durum');

  const updateData: {
    xpPerMessage?: number;
    xpCooldown?: number;
    levelUpChannelId?: string;
    levelUpMessage?: string;
    enabled?: boolean;
  } = {};

  if (xpAmount !== null && xpAmount !== undefined) {
    updateData.xpPerMessage = xpAmount;
  }
  if (cooldown !== null && cooldown !== undefined) {
    updateData.xpCooldown = cooldown;
  }
  if (levelChannel) {
    updateData.levelUpChannelId = levelChannel.id;
  }
  if (message !== null && message !== undefined) {
    updateData.levelUpMessage = message;
  }
  if (enabled !== null && enabled !== undefined) {
    updateData.enabled = enabled;
  }

  if (Object.keys(updateData).length === 0) {
    const container = new ContainerBuilder().setAccentColor(colors.warning);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojis.warning} Uyarı\n\nEn az bir ayar belirtmelisiniz.`),
    );
    if (deferred) {
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] }).catch(() => null);
    }
    return;
  }

  await LevelService.updateConfig(guild.id, updateData);

  const fields: string[] = [];
  if (xpAmount !== null && xpAmount !== undefined) {
    fields.push(`**XP Miktarı:** ${xpAmount}`);
  }
  if (cooldown !== null && cooldown !== undefined) {
    fields.push(`**Cooldown:** ${cooldown} saniye`);
  }
  if (levelChannel) {
    fields.push(`**Level Kanalı:** <#${levelChannel.id}>`);
  }
  if (message !== null && message !== undefined) {
    fields.push(`**Mesaj:** ${message}`);
  }
  if (enabled !== null && enabled !== undefined) {
    fields.push(`**Durum:** ${enabled ? 'Aktif' : 'Pasif'}`);
  }

  const container = new ContainerBuilder().setAccentColor(colors.success);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${emojis.success} Seviye Ayarları Güncellendi`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(fields.join('\n')),
  );

  if (deferred) {
    await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  } else {
    await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
  }
}

async function handleDurum(
  interaction: import('discord.js').ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);

  const config = await LevelService.getConfig(guild.id);

  if (!config) {
    const container = new ContainerBuilder().setAccentColor(colors.info);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojis.info} Seviye Yapılandırması\n\nBu sunucu için henüz yapılandırma yapılmamış.`),
    );
    if (deferred) {
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] }).catch(() => null);
    }
    return;
  }

  const roleRewards = Array.isArray(config.roleRewards) ? config.roleRewards : [];
  const roleLines = roleRewards.length > 0
    ? roleRewards
        .filter((r): r is { level: number; roleId: string } =>
          r !== null && typeof r === 'object' && 'level' in r && 'roleId' in r,
        )
        .map((r) => `Level ${r.level} → <@&${r.roleId}>`)
        .join('\n')
    : 'Ayarlanmamış';

  const container = new ContainerBuilder().setAccentColor(colors.info);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${emojis.settings} Seviye Yapılandırması`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Durum:** ${config.enabled ? 'Aktif' : 'Pasif'}\n` +
      `**XP Miktarı:** ${config.xpPerMessage}\n` +
      `**Cooldown:** ${config.xpCooldown} saniye\n` +
      `**Level Kanalı:** ${config.levelUpChannelId ? `<#${config.levelUpChannelId}>` : 'Mevcut kanal'}\n` +
      `**Mesaj:** ${config.levelUpMessage}`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Rol Ödülleri:**\n${roleLines}`),
  );

  if (deferred) {
    await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  } else {
    await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
  }
}

async function handleRolOdulu(
  interaction: import('discord.js').ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);

  const level = interaction.options.getInteger('seviye', true);
  const role = interaction.options.getRole('rol');

  const config = await LevelService.getConfig(guild.id);
  const currentRewards: { level: number; roleId: string }[] =
    config && Array.isArray(config.roleRewards)
      ? (config.roleRewards as { level: number; roleId: string }[])
      : [];

  if (!role) {
    const filtered = currentRewards.filter((r) => r.level !== level);

    if (filtered.length === currentRewards.length) {
      const container = new ContainerBuilder().setAccentColor(colors.warning);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.warning} Bulunamadı\n\nLevel ${level} için ayarlanmış bir rol ödülü bulunamadı.`),
      );
      if (deferred) {
        await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
      } else {
        await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
      }
      return;
    }

    await LevelService.updateConfig(guild.id, { roleRewards: filtered });

    const container = new ContainerBuilder().setAccentColor(colors.success);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojis.success} Rol Ödülü Kaldırıldı\n\nLevel ${level} için rol ödülü kaldırıldı.`),
    );
    if (deferred) {
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
    }
    return;
  }

  const existing = currentRewards.findIndex((r) => r.level === level);
  if (existing >= 0 && currentRewards[existing]) {
    currentRewards[existing].roleId = role.id;
  } else {
    currentRewards.push({ level, roleId: role.id });
  }

  await LevelService.updateConfig(guild.id, { roleRewards: currentRewards });

  const container = new ContainerBuilder().setAccentColor(colors.success);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${emojis.success} Rol Ödülü Eklendi\n\nLevel ${level} → <@&${role.id}> olarak ayarlandı.`),
  );
  if (deferred) {
    await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  } else {
    await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
  }
}
