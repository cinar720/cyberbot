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

const log = createChildLogger('KICK');

const REASON_MAX_LENGTH = 512;
const DEFAULT_REASON = 'Belirtilmedi';
const AUDIT_LOG_MAX_LENGTH = 512;
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
    .setAccentColor(LogColors.SUCCESS)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Atma İşlemi Başarılı'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Kullanıcı:** ${target.user.tag} (${target.id})`,
          `**Sebep:** ${reason}`,
          `**İşlemi Yapan:** ${moderator.user.tag} (${moderator.id})`,
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
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Atma İşlemi'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Kullanıcı:** ${target.user.tag} (${target.id})`,
          `**Sebep:** ${reason}`,
          `**İşlemi Yapan:** ${moderator.user.tag} (${moderator.id})`,
          `**Durum:** #${caseNumber}`,
          `**Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        ].join('\n'),
      ),
    );
}

const command: SlashCommand = {
  metadata: {
    name: 'kick',
    description: 'Bir kullanıcıyı sunucudan atar.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.KickMembers],
    botPermissions: [PermissionFlagsBits.KickMembers],
    guildOnly: true,
    enabled: true,
  },

  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir kullanıcıyı sunucudan atar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('kullanıcı').setDescription('Atılacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Atma sebebi')
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

    if (!isGuildOwner(member) && !member.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.editReply({
        components: [
          buildErrorContainer(
            'Yetersiz Yetki',
            'Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısınız.',
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

    const reason = interaction.options.getString('sebep') ?? DEFAULT_REASON;

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
        components: [buildErrorContainer('Hata', 'Kendinizi atamazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (targetUser.id === ctx.client.user?.id) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Botu kendinize atamazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (isGuildOwner(targetMember)) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Sunucu sahibini atamazsınız.')],
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
            'Botun yetkisi bu kullanıcıyı atmak için yeterli değil. Rol hiyerarşisini kontrol edin.',
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
            'Sizin rolünüz bu kullanıcıyı atmak için yeterli değil. Rol hiyerarşisini kontrol edin.',
          ),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    const auditReason = truncateReason(`[${member.user.tag}] ${reason}`, AUDIT_LOG_MAX_LENGTH);

    try {
      await targetMember.kick(auditReason);
    } catch (error) {
      log.error(
        'Failed to kick %s in guild %s: %s',
        targetUser.id,
        guild.id,
        error instanceof Error ? error.message : String(error),
      );

      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      let userMessage = 'Atma işlemi başarısız oldu.';

      if (errorMessage.includes('Missing Permissions')) {
        userMessage = 'Atma işlemi başarısız oldu. Discord API yetki hatası.';
      } else if (errorMessage.includes('Unknown Member')) {
        userMessage = 'Kullanıcı artık sunucuda değil.';
      }

      await interaction.editReply({
        components: [buildErrorContainer('Başarısız', userMessage)],
        flags: CV2_FLAGS,
      });
      return;
    }

    const caseResult = await createModerationCase(
      guild.id,
      'kick',
      member.id,
      targetUser.id,
      reason,
    );

    const caseNumber = caseResult.caseNumber ?? 0;

    await interaction.editReply({
      components: [buildSuccessContainer(targetMember, member, reason, caseNumber)],
      flags: CV2_FLAGS,
    });

    const logContainer = buildLogContainer(targetMember, member, reason, caseNumber);
    await sendModLog(undefined, [logContainer]).catch(() => null);

    log.info(
      'User %s kicked in guild %s by %s (case #%d)',
      targetUser.id,
      guild.id,
      member.id,
      caseNumber,
    );
  },
};

export default command;
