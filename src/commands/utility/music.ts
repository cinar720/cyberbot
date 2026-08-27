import {
  SlashCommandBuilder,
  MessageFlags,
  type VoiceBasedChannel,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { MusicService } from '../../services/music/MusicService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'muzik',
    description: 'Müzik çalma komutları.',
    category: 'utility',
    cooldown: 3,
    permissions: [],
    botPermissions: ['Connect', 'Speak'],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('muzik')
    .setDescription('Müzik çalma komutları.')
    .addSubcommand((sub) =>
      sub
        .setName('çal')
        .setDescription('Bir şarkı çalar.')
        .addStringOption((opt) =>
          opt.setName('sorgu').setDescription('Şarkı adı veya URL').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('durdur').setDescription('Müzik çalmayı durdurur.'))
    .addSubcommand((sub) => sub.setName('geç').setDescription('Mevcut şarkıyı atlar.'))
    .addSubcommand((sub) => sub.setName('duraklat').setDescription('Müziği duraklatır.'))
    .addSubcommand((sub) => sub.setName('devam').setDescription('Duraklatılmış müziği devam ettirir.'))
    .addSubcommand((sub) => sub.setName('kuyruk').setDescription('Mevcut kuyruğu gösterir.'))
    .addSubcommand((sub) => sub.setName('şu-an-çalan').setDescription('Şu an çalan şarkıyı gösterir.'))
    .addSubcommand((sub) =>
      sub
        .setName('ses')
        .setDescription('Ses seviyesini ayarlar.')
        .addIntegerOption((opt) =>
          opt
            .setName('seviye')
            .setDescription('Ses seviyesi (0-100)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100),
        ),
    )
    .addSubcommand((sub) => sub.setName('karıştır').setDescription('Kuyruğu karıştırır.'))
    .addSubcommand((sub) =>
      sub
        .setName('kaldır')
        .setDescription('Kuyruktan şarkı kaldırır.')
        .addIntegerOption((opt) =>
          opt
            .setName('sıra')
            .setDescription('Kaldırılacak sıradaki numara')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) => sub.setName('temizle').setDescription('Kuyruğu temizler.')) as unknown as SlashCommandBuilder,

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'çal') {
      await handlePlay(interaction, guild, member);
    } else if (sub === 'durdur') {
      await handleStop(interaction, guild);
    } else if (sub === 'geç') {
      await handleSkip(interaction, guild);
    } else if (sub === 'duraklat') {
      await handlePause(interaction, guild);
    } else if (sub === 'devam') {
      await handleResume(interaction, guild);
    } else if (sub === 'kuyruk') {
      await handleQueue(interaction, guild);
    } else if (sub === 'şu-an-çalan') {
      await handleNowPlaying(interaction, guild);
    } else if (sub === 'ses') {
      await handleVolume(interaction, guild);
    } else if (sub === 'karıştır') {
      await handleShuffle(interaction, guild);
    } else if (sub === 'kaldır') {
      await handleRemove(interaction, guild);
    } else if (sub === 'temizle') {
      await handleClear(interaction, guild);
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

function getVoiceChannel(
  member: NonNullable<CommandContext['member']>,
): VoiceBasedChannel | null {
  if (!member.voice.channel) return null;
  return member.voice.channel as VoiceBasedChannel;
}

async function handlePlay(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
  member: NonNullable<CommandContext['member']>,
) {
  const voiceChannel = getVoiceChannel(member);
  if (!voiceChannel) {
    await interaction.reply({
      embeds: [CyberEmbed.error('Hata', 'Bir ses kanalında olmalısınız.')],
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const deferred = await safeDefer(interaction);
  const query = interaction.options.getString('sorgu', true);
  const musicService = MusicService.getInstance();

  try {
    const { track } = await musicService.play(guild, voiceChannel, query, member);

    const embed = CyberEmbed.success('Şarkı Eklendi')
      .addFields(
        { name: 'Şarkı', value: track.title, inline: true },
        { name: 'Süre', value: track.duration, inline: true },
        { name: 'İsteyen', value: `<@${member.id}>`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred
      ? interaction.editReply({ embeds: [embed] })
      : interaction.followUp({ embeds: [embed] }).catch(() => null));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', errorMessage)] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', errorMessage)], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  }
}

async function handleStop(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  musicService.stop(guild);

  const embed = CyberEmbed.success('Müzik Durduruldu', 'Müzik çalma durduruldu ve kuyruk temizlendi.')
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleSkip(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const skipped = musicService.skip(guild);

  if (!skipped) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Atlanacak şarkı bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Atlanacak şarkı bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Şarkı Atlandı', `**${skipped.title}** atlandı.`)
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handlePause(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const paused = musicService.pause(guild);

  if (!paused) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Duraklatılacak müzik bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Duraklatılacak müzik bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Müzik Duraklatıldı', 'Müzik başarıyla duraklatıldı.')
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleResume(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const resumed = musicService.resume(guild);

  if (!resumed) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Devam ettirilecek müzik bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Devam ettirilecek müzik bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Müzik Devam Ediyor', 'Müzik başarıyla devam ettirildi.')
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleQueue(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const queue = musicService.getQueue(guild);

  if (!queue || queue.tracks.size === 0) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.info('Kuyruk', 'Kuyrukta şarkı bulunmuyor.')] })
      : interaction.reply({ embeds: [CyberEmbed.info('Kuyruk', 'Kuyrukta şarkı bulunmuyor.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const tracks = queue.tracks.map(
    (track, index) => `${index + 1}. **${track.title}** — ${track.duration}`,
  );

  const embed = CyberEmbed.info('Müzik Kuyruğu')
    .setDescription(tracks.join('\n'))
    .addFields(
      { name: 'Toplam Şarkı', value: String(queue.tracks.size), inline: true },
    )
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleNowPlaying(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const track = musicService.nowPlaying(guild);

  if (!track) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.info('Şu An Çalan', 'Şu an çalan şarkı bulunmuyor.')] })
      : interaction.reply({ embeds: [CyberEmbed.info('Şu An Çalan', 'Şu an çalan şarkı bulunmuyor.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.info('Şu An Çalan')
    .addFields(
      { name: 'Şarkı', value: track.title, inline: true },
      { name: 'Süre', value: track.duration, inline: true },
      { name: 'İsteyen', value: track.requestedBy ? `<@${track.requestedBy.id}>` : 'Bilinmiyor', inline: true },
    )
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleVolume(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const level = interaction.options.getInteger('seviye', true);
  const musicService = MusicService.getInstance();
  const success = musicService.volume(guild, level);

  if (!success) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Ses seviyesi ayarlanacak müzik bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Ses seviyesi ayarlanacak müzik bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Ses Seviyesi Ayarlandı', `Ses seviyesi **%${level}** olarak ayarlandı.`)
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleShuffle(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  const success = musicService.shuffle(guild);

  if (!success) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Karıştırılacak kuyruk bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Karıştırılacak kuyruk bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Kuyruk Karıştırıldı', 'Kuyruk başarıyla karıştırıldı.')
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const index = interaction.options.getInteger('sıra', true) - 1;
  const musicService = MusicService.getInstance();
  const removed = musicService.remove(guild, index);

  if (!removed) {
    await (deferred
      ? interaction.editReply({ embeds: [CyberEmbed.error('Hata', 'Belirtilen sırada şarkı bulunamadı.')] })
      : interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Belirtilen sırada şarkı bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
    return;
  }

  const embed = CyberEmbed.success('Şarkı Kaldırıldı', `**${removed.title}** kuyruktan kaldırıldı.`)
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}

async function handleClear(
  interaction: ChatInputCommandInteraction,
  guild: NonNullable<CommandContext['guild']>,
) {
  const deferred = await safeDefer(interaction);
  const musicService = MusicService.getInstance();
  musicService.clear(guild);

  const embed = CyberEmbed.success('Kuyruk Temizlendi', 'Kuyruk başarıyla temizlendi.')
    .setDefaultFooter()
    .setTimestampNow();

  await (deferred
    ? interaction.editReply({ embeds: [embed] })
    : interaction.followUp({ embeds: [embed] }).catch(() => null));
}
