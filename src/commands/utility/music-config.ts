import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'muzik-yapilandir',
    description: 'Müzik sistemini yapılandırır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('muzik-yapilandir')
    .setDescription('Müzik sistemini yapılandırır.')
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Müzik ayarlarını yapılandırır.')
        .addRoleOption((opt) =>
          opt
            .setName('dj-rolu')
            .setDescription('DJ rolü')
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('ses')
            .setDescription('Varsayılan ses seviyesi (0-100)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(100),
        )
        .addBooleanOption((opt) =>
          opt
            .setName('otomatik-ayril')
            .setDescription('Müzik bitince otomatik ayrılsın mı?')
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName('şarkı-bildir')
            .setDescription('Şarkı değişince bildirim gönderilsin mi?')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) => sub.setName('durum').setDescription('Mevcut müzik yapılandırmasını gösterir.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as unknown as SlashCommandBuilder,

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'ayarla') {
      await handleAyarla(interaction, guild);
    } else if (sub === 'durum') {
      await handleDurum(interaction, guild);
    }
  },
} satisfies SlashCommand;

async function safeDefer(interaction: import('discord.js').ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.deferred || interaction.replied) return true;
  try {
    await interaction.deferReply();
    return true;
  } catch {
    return false;
  }
}

async function handleAyarla(
  interaction: import('discord.js').ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const db = getPrisma();

  const djRole = interaction.options.getRole('dj-rolu');
  const volume = interaction.options.getInteger('ses');
  const autoLeave = interaction.options.getBoolean('otomatik-ayril');
  const announceSongs = interaction.options.getBoolean('şarkı-bildir');

  const updateData: Record<string, unknown> = {};

  if (djRole) {
    updateData.djRoleId = djRole.id;
  }
  if (volume !== null && volume !== undefined) {
    updateData.volume = volume;
  }
  if (autoLeave !== null && autoLeave !== undefined) {
    updateData.autoLeave = autoLeave;
  }
  if (announceSongs !== null && announceSongs !== undefined) {
    updateData.announceSongs = announceSongs;
  }

  if (Object.keys(updateData).length === 0) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.warning('Uyarı', 'En az bir ayar belirtmelisiniz.')] })
      : interaction.reply({ embeds: [CyberEmbed.warning('Uyarı', 'En az bir ayar belirtmelisiniz.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  await db.musicConfig.upsert({
    where: { guildId: guild.id },
    update: updateData,
    create: {
      guildId: guild.id,
      ...(djRole ? { djRoleId: djRole.id } : {}),
      ...(volume !== null && volume !== undefined ? { volume } : {}),
      ...(autoLeave !== null && autoLeave !== undefined ? { autoLeave } : {}),
      ...(announceSongs !== null && announceSongs !== undefined ? { announceSongs } : {}),
    },
  });

  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (djRole) {
    fields.push({ name: 'DJ Rolü', value: `<@&${djRole.id}>`, inline: true });
  }
  if (volume !== null && volume !== undefined) {
    fields.push({ name: 'Ses Seviyesi', value: `%${volume}`, inline: true });
  }
  if (autoLeave !== null && autoLeave !== undefined) {
    fields.push({ name: 'Otomatik Ayrıl', value: autoLeave ? 'Aktif' : 'Pasif', inline: true });
  }
  if (announceSongs !== null && announceSongs !== undefined) {
    fields.push({ name: 'Şarkı Bildir', value: announceSongs ? 'Aktif' : 'Pasif', inline: true });
  }

  const embed = CyberEmbed.success('Müzik Ayarları Güncellendi')
    .addFields(fields)
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleDurum(
  interaction: import('discord.js').ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const db = getPrisma();

  const config = await db.musicConfig.findUnique({
    where: { guildId: guild.id },
  });

  if (!config) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.info('Müzik Yapılandırması', 'Bu sunucu için henüz yapılandırma yapılmamış.')] })
      : interaction.reply({ embeds: [CyberEmbed.info('Müzik Yapılandırması', 'Bu sunucu için henüz yapılandırma yapılmamış.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.info('Müzik Yapılandırması')
    .addFields(
      { name: 'Durum', value: config.enabled ? 'Aktif' : 'Pasif', inline: true },
      { name: 'DJ Rolü', value: config.djRoleId ? `<@&${config.djRoleId}>` : 'Ayarlanmamış', inline: true },
      { name: 'Ses Seviyesi', value: `%${config.volume}`, inline: true },
      { name: 'Otomatik Ayrıl', value: config.autoLeave ? 'Aktif' : 'Pasif', inline: true },
      { name: 'Şarkı Bildir', value: config.announceSongs ? 'Aktif' : 'Pasif', inline: true },
    )
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}
