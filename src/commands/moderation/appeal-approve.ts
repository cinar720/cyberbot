import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { AppealService } from '../../services/moderation/AppealService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'appeal-approve',
    description: 'Bir itirazı onaylar.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('appeal-approve')
    .setDescription('Bir itirazı onaylar.')
    .addStringOption((option) =>
      option.setName('appealid').setDescription('İtiraz ID').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('response').setDescription('Onaylama yanıtı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const appealId = interaction.options.getString('appealid', true);
    const response = interaction.options.getString('response', true);

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const appeal = await AppealService.getById(appealId);
    if (!appeal) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'İtiraz bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'İtiraz bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    if (appeal.status !== 'PENDING') {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', 'Bu itiraz zaten işlenmiş.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Uyarı', 'Bu itiraz zaten işlenmiş.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await AppealService.approve(appealId, member.id, response);

    const embed = CyberEmbed.success('İtiraz Onaylandı', `İtiraz başarıyla onaylandı.`)
      .addFields(
        { name: 'İtiraz ID', value: appealId, inline: true },
        { name: 'Case', value: `#${appeal.case.caseNumber}`, inline: true },
        { name: 'Kullanıcı', value: `<@${appeal.userId}>`, inline: true },
        { name: 'Yanıt', value: response, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));

    const user = await guild.members.fetch(appeal.userId).catch(() => null);
    if (user) {
      const dmEmbed = CyberEmbed.success(
        'İtirazınız Onaylandı',
        `Case #${appeal.case.caseNumber} için itirazınız onaylanmıştır.`,
      )
        .addFields(
          { name: 'Yanıt', value: response, inline: false },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await user.send({ embeds: [dmEmbed] }).catch(() => null);
    }
  },
} satisfies SlashCommand;
