import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type VoiceChannel,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'kendi-seslini-yonet',
    description: 'Gecici ses kanali yonetim komutlari.',
    category: 'utility',
    cooldown: 3,
    permissions: [],
    botPermissions: ['ManageChannels', 'MoveMembers'],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('kendi-seslini-yonet')
    .setDescription('Gecici ses kanali yonetim komutlari.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('ayarla')
        .setDescription('Tetikleme kanalini ve kategoriyi yapilandirir.')
        .addChannelOption((opt) =>
          opt
            .setName('tetikleme-kanali')
            .setDescription('Tetiklenecek ses kanali')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName('kategori')
            .setDescription('Gecici kanallarin olusturulacagi kategori')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('prefiks')
            .setDescription('Kanal adi oneki (varsayilan: ODA)')
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('maks-kullanici')
            .setDescription('Maksimum kullanici sayisi (varsayilan: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(99),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('isim')
        .setDescription('Gecici kanalinizin adini degistirir.')
        .addStringOption((opt) =>
          opt
            .setName('isim')
            .setDescription('Yeni kanal adi')
            .setRequired(true)
            .setMaxLength(100),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('limit')
        .setDescription('Kanalinizin kullanici limitini ayarlar.')
        .addIntegerOption((opt) =>
          opt
            .setName('sayi')
            .setDescription('Kullanici limiti (0 = limitsiz)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('kilit').setDescription('Kanalinizi kilitler (kimse katilamaz).'),
    )
    .addSubcommand((sub) =>
      sub.setName('kilidi-ac').setDescription('Kanalinizin kilidini acar.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('sahip')
        .setDescription('Kanal sahipligin baska bir kullanicoya devreder.')
        .addUserOption((opt) =>
          opt
            .setName('kullanici')
            .setDescription('Sahipligi devredilecek kullanici')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('sil').setDescription('Gecici kanalinizi siler.'),
    ) as unknown as SlashCommandBuilder,

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const sub = interaction.options.getSubcommand();
    const db = getPrisma();

    if (sub === 'ayarla') {
      await handleAyarla(interaction, guild, db);
    } else if (sub === 'isim') {
      await handleIsim(interaction, guild, member, db);
    } else if (sub === 'limit') {
      await handleLimit(interaction, guild, member, db);
    } else if (sub === 'kilit') {
      await handleKilit(interaction, guild, member, db);
    } else if (sub === 'kilidi-ac') {
      await handleKilidiAc(interaction, guild, member, db);
    } else if (sub === 'sahip') {
      await handleSahip(interaction, guild, member, db);
    } else if (sub === 'sil') {
      await handleSil(interaction, guild, member, db);
    }
  },
} satisfies SlashCommand;

async function safeDefer(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.deferred || interaction.replied) return true;
  try {
    await interaction.deferReply();
    return true;
  } catch {
    return false;
  }
}

async function replyEmbed(
  interaction: ChatInputCommandInteraction,
  embed: CyberEmbed,
  deferred: boolean,
  ephemeral = false,
): Promise<void> {
  if (deferred) {
    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  } else {
    await interaction.reply({ embeds: [embed], flags: ephemeral ? [MessageFlags.Ephemeral] : [] }).catch(() => null);
  }
}

async function handleAyarla(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);

  const triggerChannel = interaction.options.getChannel('tetikleme-kanali', true);
  const category = interaction.options.getChannel('kategori', true);
  const prefix = interaction.options.getString('prefiks') || 'ODA';
  const maxUsers = interaction.options.getInteger('maks-kullanici') || 10;

  await db.voiceChannelConfig.upsert({
    where: { guildId: guild.id },
    update: {
      triggerChannelId: triggerChannel.id,
      categoryChannelId: category.id,
      channelPrefix: prefix,
      maxUsers,
    },
    create: {
      guildId: guild.id,
      triggerChannelId: triggerChannel.id,
      categoryChannelId: category.id,
      channelPrefix: prefix,
      maxUsers,
    },
  });

  const embed = CyberEmbed.success('Ses Kanali Yapilandirmasi Kaydedildi')
    .addFields(
      { name: 'Tetikleme Kanali', value: `<#${triggerChannel.id}>`, inline: true },
      { name: 'Kategori', value: `<#${category.id}>`, inline: true },
      { name: 'Onek', value: prefix, inline: true },
      { name: 'Maks Kullanici', value: String(maxUsers), inline: true },
    )
    .setDefaultFooter()
    .setTimestampNow();

  await replyEmbed(interaction, embed, deferred);
}

async function findTempChannel(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
  deferred: boolean,
) {
  const tempChannel = await db.tempVoiceChannel.findFirst({
    where: {
      guildId: guild.id,
      ownerId: member.id,
    },
  });

  if (!tempChannel) {
    if (deferred) {
      await interaction
        .editReply({
          embeds: [CyberEmbed.error('Hata', 'Sizin icin olusturulmus gecici bir kanal bulunamadi.')],
        })
        .catch(() => null);
    } else {
      await interaction
        .reply({
          embeds: [CyberEmbed.error('Hata', 'Sizin icin olusturulmus gecici bir kanal bulunamadi.')],
          flags: [MessageFlags.Ephemeral],
        })
        .catch(() => null);
    }
    return null;
  }

  const discordChannel = await guild.channels.fetch(tempChannel.channelId).catch(() => null);
  if (!discordChannel) {
    await db.tempVoiceChannel.delete({ where: { channelId: tempChannel.channelId } }).catch(() => null);
    if (deferred) {
      await interaction
        .editReply({
          embeds: [CyberEmbed.error('Hata', "Kanal Discord'da bulunamadi.")],
        })
        .catch(() => null);
    } else {
      await interaction
        .reply({
          embeds: [CyberEmbed.error('Hata', "Kanal Discord'da bulunamadi.")],
          flags: [MessageFlags.Ephemeral],
        })
        .catch(() => null);
    }
    return null;
  }

  return { dbRecord: tempChannel, discordChannel };
}

async function handleIsim(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  const newName = interaction.options.getString('isim', true);
  const voiceCh = data.discordChannel as VoiceChannel;
  await voiceCh.setName(newName);
  await db.tempVoiceChannel.update({
    where: { channelId: data.dbRecord.channelId },
    data: { channelName: newName },
  });

  const embed = CyberEmbed.success('Kanal Adi Degistirildi', `Yeni ad: **${newName}**`)
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}

async function handleLimit(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  const limit = interaction.options.getInteger('sayi', true);
  const voiceCh = data.discordChannel as VoiceChannel;
  await voiceCh.setUserLimit(limit === 0 ? 0 : limit);

  const embed = CyberEmbed.success(
    'Kullanici Limiti Guncellendi',
    limit === 0 ? 'Limit kaldirildi (limitsiz).' : `Yeni limit: **${limit}**`,
  )
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}

async function handleKilit(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  const voiceCh = data.discordChannel as VoiceChannel;
  await voiceCh.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });

  const embed = CyberEmbed.success('Kanal Kilitlendi', 'Artik kimse kanaliniza katilamaz.')
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}

async function handleKilidiAc(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  const voiceCh = data.discordChannel as VoiceChannel;
  await voiceCh.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });

  const embed = CyberEmbed.success('Kanal Kilidi Aciildi', 'Artik herkes kanaliniza katilabilir.')
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}

async function handleSahip(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  const targetUser = interaction.options.getUser('kullanici', true);
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await replyEmbed(interaction, CyberEmbed.error('Hata', 'Kullanici sunucuda bulunamadi.'), deferred);
    return;
  }

  if (!targetMember.voice.channelId || targetMember.voice.channelId !== data.dbRecord.channelId) {
    await replyEmbed(interaction, CyberEmbed.error('Hata', 'Kullanici su anda sizin kanalinizda degil.'), deferred);
    return;
  }

  await db.tempVoiceChannel.update({
    where: { channelId: data.dbRecord.channelId },
    data: { ownerId: targetUser.id },
  });

  const embed = CyberEmbed.success(
    'Sahiplik Devredildi',
    `Kanal sahipligi ${targetUser.tag} kullanicisina devredildi.`,
  )
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}

async function handleSil(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
  db: ReturnType<typeof getPrisma>,
) {
  const deferred = await safeDefer(interaction);
  const data = await findTempChannel(interaction, guild, member, db, deferred);
  if (!data) return;

  await data.discordChannel.delete().catch(() => null);
  await db.tempVoiceChannel.delete({ where: { channelId: data.dbRecord.channelId } }).catch(() => null);

  const embed = CyberEmbed.success('Kanal Silindi', 'Gecici ses kanaliniz silindi.')
    .setDefaultFooter()
    .setTimestampNow();
  await replyEmbed(interaction, embed, deferred);
}
