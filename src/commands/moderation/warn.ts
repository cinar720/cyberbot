import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  GuildMember,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlagsBitField,
  type MessageFlagsResolvable,
} from 'discord.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';
import { createModerationCase } from '../../services/moderation.js';
import { sendModLog, LogColors } from '../../services/logger/discord.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('WARN');

const REASON_MAX_LENGTH = 512;
const DEFAULT_REASON = 'Uyarı sebebi belirtilmedi';
const CV2_FLAGS: MessageFlagsResolvable = MessageFlagsBitField.Flags.IsComponentsV2;

function truncateReason(reason: string, maxLength: number): string {
  if (reason.length <= maxLength) return reason;
  return reason.slice(0, maxLength - 3) + '...';
}

function isGuildOwner(member: GuildMember): boolean {
  return member.guild.ownerId === member.id;
}

function buildSuccessContainer(
  target: GuildMember,
  moderator: GuildMember,
  reason: string,
  caseNumber: number,
): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.WARNING)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Uyarı Başarılı'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Kullanıcı:** ${target.user.tag} (${target.id})`,
          `**Uyarı Sebebi:** ${reason}`,
          `**Yetkili:** ${moderator.user.tag} (${moderator.id})`,
          `**Durum:** #${caseNumber}`,
        ].join('\n'),
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`),
    );
}

function buildErrorContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.ERROR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

function buildLogContainer(
  target: GuildMember,
  moderator: GuildMember,
  reason: string,
  caseNumber: number,
): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.WARNING)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Uyarı İşlemi'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**İşlem:** Uyarı`,
          `**Kullanıcı:** ${target.user.tag} (${target.id})`,
          `**Yetkili:** ${moderator.user.tag} (${moderator.id})`,
          `**Sebep:** ${reason}`,
          `**Durum:** #${caseNumber}`,
          `**Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        ].join('\n'),
      ),
    );
}

const command: SlashCommand = {
  metadata: {
    name: 'warn',
    description: 'Bir kullanıcıyı uyarı.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
    enabled: true,
  },

  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Bir kullanıcıyı uyarı.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('kullanıcı').setDescription('Uyarılacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Uyarı sebebi')
        .setMaxLength(REASON_MAX_LENGTH)
        .setRequired(false),
    ),

  async execute(ctx: CommandContext): Promise<void> {
    await ctx.interaction.deferReply({ ephemeral: true });

    const { interaction, guild, member } = ctx;

    if (!guild || !member) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (!isGuildOwner(member) && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply({
        components: [
          buildErrorContainer(
            'Yetersiz Yetki',
            'Bu komutu kullanmak için **Üyeleri Yönet** yetkisine sahip olmalısınız.',
          ),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    const targetUser = interaction.options.getUser('kullanıcı');
    if (!targetUser) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Kullanıcı bulunamadı.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    const rawReason = interaction.options.getString('sebep');
    const reason = rawReason ? truncateReason(rawReason, REASON_MAX_LENGTH) : DEFAULT_REASON;

    let targetMember: GuildMember;
    try {
      targetMember = await guild.members.fetch(targetUser.id);
    } catch {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Kullanıcı sunucuda bulunamadı.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (targetUser.id === member.id) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Kendinizi uyaramazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (targetUser.id === ctx.client.user?.id) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Botu uyaramazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (isGuildOwner(targetMember)) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Sunucu sahibini uyaramazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    const botMember = await guild.members.fetch(ctx.client.user!.id);
    if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
      await interaction.editReply({
        components: [
          buildErrorContainer(
            'Rol Hiyerarşisi',
            'Botun yetkisi bu kullanıcıyı uyarmak için yeterli değil. Rol hiyerarşisini kontrol edin.',
          ),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (
      !isGuildOwner(member) &&
      member.roles.highest.position <= targetMember.roles.highest.position
    ) {
      await interaction.editReply({
        components: [
          buildErrorContainer(
            'Rol Hiyerarşisi',
            'Sizin rolünüz bu kullanıcıyı uyarmak için yeterli değil. Rol hiyerarşisini kontrol edin.',
          ),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    const caseResult = await createModerationCase(
      guild.id,
      'warn',
      member.id,
      targetUser.id,
      reason,
    );

    if (!caseResult.success) {
      await interaction.editReply({
        components: [
          buildErrorContainer('Başarısız', caseResult.error ?? 'Uyarı kaydı oluşturulamadı.'),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    const caseNumber = caseResult.caseNumber ?? 0;

    await interaction.editReply({
      components: [buildSuccessContainer(targetMember, member, reason, caseNumber)],
      flags: CV2_FLAGS,
    });

    const logContainer = buildLogContainer(targetMember, member, reason, caseNumber);
    await sendModLog(undefined, [logContainer]).catch(() => null);

    log.info(
      'User %s warned in guild %s by %s (case #%d)',
      targetUser.id,
      guild.id,
      member.id,
      caseNumber,
    );
  },
};

export default command;
