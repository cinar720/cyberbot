import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { AppealService } from '../../services/moderation/AppealService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { channels } from '../../config/channels.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'appeal',
    description: 'Bir karar için itiraz oluşturur.',
    category: 'moderation',
    cooldown: 30,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Bir karar için itiraz oluşturur.')
    .addIntegerOption((option) =>
      option.setName('caseid').setDescription('İtiraz edilecek karar numarası').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('İtiraz sebebi').setRequired(true),
    ),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const caseNumber = interaction.options.getInteger('caseid', true);
    const reason = interaction.options.getString('reason', true);

    let deferred = false;


    try { await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); deferred = true; } catch { /* interaction already acknowledged */ }

    const caseData = await CaseService.getByNumber(guild.id, caseNumber);
    if (!caseData) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const existingAppeal = await AppealService.hasPendingAppeal(caseData.id);
    if (existingAppeal) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', `Case #${caseNumber} için zaten bekleyen bir itiraz mevcut.`)],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Uyarı', `Case #${caseNumber} için zaten bekleyen bir itiraz mevcut.`)],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const appeal = await AppealService.create({
      caseId: caseData.id,
      userId: interaction.user.id,
      reason,
    });

    const embed = CyberEmbed.success('İtiraz Oluşturuldu', 'İtirazınız moderatörler tarafından incelenecektir.')
      .addFields(
        { name: 'Case', value: `#${caseNumber}`, inline: true },
        { name: 'İtiraz ID', value: appeal.id, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));

    const modLogId = channels.logs.moderation;
    if (!modLogId) return;

    const modLogChannel = await guild.channels.fetch(modLogId).catch(() => null);
    if (!modLogChannel || !('send' in modLogChannel)) return;

    const logEmbed = CyberEmbed.info('Yeni İtiraz', `${interaction.user} tarafından Case #${caseNumber} için itiraz oluşturuldu.`)
      .addFields(
        { name: 'Kullanıcı', value: `${interaction.user.tag}`, inline: true },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
        { name: 'İtiraz ID', value: appeal.id, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await modLogChannel.send({ embeds: [logEmbed] }).catch(() => null);
  },
} satisfies SlashCommand;
