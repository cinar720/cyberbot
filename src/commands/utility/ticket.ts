import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, OverwriteType, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma, getOrCreateGuild, getOrCreateUser } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket',
    description: 'Yeni bir destek talebi oluşturur.',
    category: 'utility',
    cooldown: 10,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Yeni bir destek talebi oluşturur.')
    .addStringOption((option) =>
      option
        .setName('kategori')
        .setDescription('Destek talebi kategorisi')
        .setRequired(false)
        .addChoices(
          { name: 'Genel', value: 'Genel' },
          { name: 'Teknik', value: 'Teknik' },
          { name: 'Faturalama', value: 'Faturalama' },
          { name: 'Öneri', value: 'Öneri' },
          { name: 'Şikayet', value: 'Şikayet' },
        ),
    ),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const category = interaction.options.getString('kategori') || 'Genel';
    const db = getPrisma();

    let deferred = false;


    try { await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); deferred = true; } catch { /* interaction already acknowledged */ }

    const existingTicket = await db.ticket.findFirst({
      where: {
        guildId: guild.id,
        creatorId: member.id,
        status: 'OPEN',
      },
    });

    if (existingTicket) {
      await (deferred ? interaction.editReply({
        embeds: [
          CyberEmbed.warning(
            'Açık Destek Talebiniz Var',
            `Zaten açık bir destek talebiniz bulunuyor: <#${existingTicket.channelId}>`,
          ),
        ],
      }) : interaction.followUp({ ...{
        embeds: [
          CyberEmbed.warning(
            'Açık Destek Talebiniz Var',
            `Zaten açık bir destek talebiniz bulunuyor: <#${existingTicket.channelId}>`,
          ),
        ],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await getOrCreateGuild(guild);
    await getOrCreateUser(member.user);

    const ticketCount = await db.ticket.count({
      where: { guildId: guild.id },
    });

    const channelName = `destek-${String(ticketCount + 1).padStart(4, '0')}`;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `${category} | ${member.user.tag} tarafından oluşturuldu`,
      permissionOverwrites: [
        {
          id: guild.id,
          type: OverwriteType.Role,
          allow: [],
          deny: ['ViewChannel'],
        },
        {
          id: member.id,
          type: OverwriteType.Member,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks'],
          deny: [],
        },
        {
          id: interaction.client.user.id,
          type: OverwriteType.Member,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'],
          deny: [],
        },
      ],
    });

    const ticket = await db.ticket.create({
      data: {
        guildId: guild.id,
        channelId: ticketChannel.id,
        creatorId: member.id,
        category,
        status: 'OPEN',
      },
    });

    const embed = CyberEmbed.success('Destek Talebi Oluşturuldu')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Kategori', value: category, inline: true },
        { name: 'Oluşturan', value: `${member.user.tag}`, inline: true },
      )
      .setDescription(`Destek talebiniz başarıyla oluşturuldu: ${ticketChannel}`)
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));

    const welcomeEmbed = CyberEmbed.info('Destek Talebine Hoş Geldiniz')
      .setDescription(
        `Merhaba ${member}, destek talebinize hoş geldiniz.\n\n` +
          `**Kategori:** ${category}\n\n` +
          `Destek ekibimiz en kısa sürede size yardımcı olacaktır. ` +
          `Bu kanalda sorununuzu detaylı bir şekilde açıklayabilirsiniz.`,
      )
      .setDefaultFooter()
      .setTimestampNow();

    await ticketChannel.send({ embeds: [welcomeEmbed] });
  },
} satisfies SlashCommand;
