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

const log = createChildLogger('BAN');

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
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Yasaklama Başarılı'))
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
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Yasaklama İşlemi'))
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
    name: 'ban',
    description: 'Bir kullanıcıyı sunucudan yasaklar.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
    enabled: true,
  },

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir kullanıcıyı sunucudan yasaklar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('kullanıcı').setDescription('Yasaklanacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Yasaklama sebebi')
        .setMaxLength(REASON_MAX_LENGTH)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName('mesaj-sil')
        .setDescription('Son X günlük mesajları sil (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
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

    if (!isGuildOwner(member) && !member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply({
        components: [
          buildErrorContainer(
            'Yetersiz Yetki',
            'Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısınız.',
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
    const deleteMessageDays = interaction.options.getInteger('mesaj-sil') ?? 0;

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
        components: [buildErrorContainer('Hata', 'Kendinizi yasaklayamazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (targetUser.id === ctx.client.user?.id) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Botu kendinize yasaklayamazsınız.')],
        flags: CV2_FLAGS,
      });
      return;
    }

    if (isGuildOwner(targetMember)) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Sunucu sahibini yasaklayamazsınız.')],
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
            'Botun yetkisi bu kullanıcıyı yasaklamak için yeterli değil. Rol hiyerarşisini kontrol edin.',
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
            'Sizin rolünüz bu kullanıcıyı yasaklamak için yeterli değil. Rol hiyerarşisini kontrol edin.',
          ),
        ],
        flags: CV2_FLAGS,
      });
      return;
    }

    const auditReason = truncateReason(`[${member.user.tag}] ${reason}`, AUDIT_LOG_MAX_LENGTH);

    try {
      await targetMember.ban({
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
        reason: auditReason,
      });
    } catch (error) {
      log.error(
        'Failed to ban %s in guild %s: %s',
        targetUser.id,
        guild.id,
        error instanceof Error ? error.message : String(error),
      );

      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      let userMessage = 'Yasaklama işlemi başarısız oldu.';

      if (errorMessage.includes('Missing Permissions')) {
        userMessage = 'Yasaklama işlemi başarısız oldu. Discord API yetki hatası.';
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
      'ban',
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
      'User %s banned in guild %s by %s (case #%d)',
      targetUser.id,
      guild.id,
      member.id,
      caseNumber,
    );
  },
};

export default command;
