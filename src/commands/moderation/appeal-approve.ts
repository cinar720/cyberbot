import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
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

    await interaction.deferReply();

    const appeal = await AppealService.getById(appealId);
    if (!appeal) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'İtiraz bulunamadı.')],
      });
      return;
    }

    if (appeal.status !== 'PENDING') {
      await interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', 'Bu itiraz zaten işlenmiş.')],
      });
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

    await interaction.editReply({ embeds: [embed] });

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
