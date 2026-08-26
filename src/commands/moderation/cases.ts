import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
} from 'discord.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { colors } from '../../config/colors.js';
import type { SlashCommand, CommandContext, CyberBotClient } from '../../types/command.js';

const prefix = 'cyberbot:cases';

const casesCache = new Map<string, { cases: Awaited<ReturnType<typeof CaseService.getAllByUser>>; userId: string; targetTag: string; targetAvatar: string }>();

function buildCasesContainer(
  data: { cases: Awaited<ReturnType<typeof CaseService.getAllByUser>>; targetTag: string; targetAvatar: string },
  page: number,
  totalPages: number,
  ownerId: string,
): ContainerBuilder {
  const itemsPerPage = 5;
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const pageCases = data.cases.slice(start, end);

  const container = new ContainerBuilder().setAccentColor(colors.info);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${data.targetTag} - Case Kayıtları`),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const description = pageCases.map((c) => {
    const status = c.revoked ? '~~[İptal]~~' : c.active ? '[Aktif]' : '[Kapalı]';
    return [
      `${status} **${CaseService.formatCaseNumber(c.caseNumber)}** - ${c.type}`,
      `> Kullanıcı: <@${c.targetId}> | Moderatör: <@${c.moderatorId}>`,
      `> Sebep: ${c.reason.length > 80 ? c.reason.substring(0, 80) + '...' : c.reason}`,
      `> Tarih: <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>`,
    ].join('\n');
  }).join('\n\n');

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Sayfa ${page + 1}/${totalPages}** | Toplam: ${data.cases.length} case`),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}:page:${page - 1}:${ownerId}`)
        .setLabel('Önceki')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${prefix}:page:${page + 1}:${ownerId}`)
        .setLabel('Sonraki')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1),
    ),
  );

  return container;
}

export default {
  metadata: {
    name: 'cases',
    description: 'Kullanıcının tüm case kayıtlarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('Kullanıcının tüm case kayıtlarını gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user', true);

    await interaction.deferReply();

    const cases = await CaseService.getAllByUser(guild.id, targetUser.id);

    if (cases.length === 0) {
      const container = new ContainerBuilder().setAccentColor(colors.warning);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Bulunamadı\n\n${targetUser.tag} kullanıcısına ait case bulunamadı.`),
      );
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
      return;
    }

    const totalPages = Math.ceil(cases.length / 5);
    const cacheKey = `${guild.id}:${targetUser.id}`;

    casesCache.set(cacheKey, {
      cases,
      userId: interaction.user.id,
      targetTag: targetUser.tag,
      targetAvatar: targetUser.displayAvatarURL(),
    });

    const container = buildCasesContainer(
      { cases, targetTag: targetUser.tag, targetAvatar: targetUser.displayAvatarURL() },
      0,
      totalPages,
      interaction.user.id,
    );

    await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  },
} satisfies SlashCommand;

export async function handleCasesComponent(
  interaction: ButtonInteraction,
  _client: CyberBotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const pageStr = parts[3];
  const page = pageStr ? parseInt(pageStr, 10) : 0;
  const ownerId = parts[4];

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

  const targetUserId = interaction.message.interaction?.user?.id ?? ownerId;
  const cacheKey = `${interaction.guildId}:${targetUserId}`;
  const data = casesCache.get(cacheKey);

  if (!data) {
    await interaction.reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.error)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Hata\n\nOturum bulunamadı. Lütfen komutu tekrar çalıştırın.'),
          ),
      ],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const totalPages = Math.ceil(data.cases.length / 5);

  if (page < 0 || page >= totalPages) {
    await interaction.deferUpdate();
    return;
  }

  const container = buildCasesContainer(data, page, totalPages, ownerId);
  await interaction.update({ components: [container] });
}
