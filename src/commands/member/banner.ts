import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'banner',
    description: 'Kullanıcının banner\'ını gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Kullanıcının banner\'ını gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Bannerı görüntülenecek kullanıcı').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true }).catch(() => null);

    if (!fetchedUser) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı bilgileri alınamadı.')],
      });
      return;
    }

    const bannerURL = fetchedUser.bannerURL({ size: 1024 });

    if (!bannerURL) {
      await interaction.reply({
        embeds: [CyberEmbed.warning('Banner Bulunamadı', `${fetchedUser.tag} kullanıcısının bir bannerı yok.`)],
      });
      return;
    }

    const embed = CyberEmbed.info('Kullanıcı Bannerı')
      .setDescription(`${fetchedUser.tag} kullanıcısının bannerı:`)
      .setImage(bannerURL)
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
