import { Guild, GuildMember, Client, ChatInputCommandInteraction } from 'discord.js';
import { CaseService } from './CaseService.js';
import { EvidenceService, EvidenceData } from './EvidenceService.js';
import { PermissionService } from './PermissionService.js';
import { DurationService } from './DurationService.js';
import { ReasonService } from './ReasonService.js';
import { PunishmentService } from './PunishmentService.js';
import { AuditService } from './AuditService.js';
import { NotificationService } from './NotificationService.js';
import { getPrisma } from '../database/index.js';
import { CyberEmbed } from '../../utils/embed.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('MODERATION');

export interface ModerationContext {
  guild: Guild;
  member: GuildMember;
  target: GuildMember;
  client: Client;
  interaction: ChatInputCommandInteraction;
}

export interface ModerationResult {
  success: boolean;
  caseNumber?: number;
  error?: string;
}

export class ModerationService {
  // ==========================================
  // BAN
  // ==========================================
  static async ban(
    ctx: ModerationContext,
    reason: string,
    options?: {
      duration?: string;
      evidence?: EvidenceData[];
      reasonCode?: string;
      deleteDays?: number;
    }
  ): Promise<ModerationResult> {
    // Permission check
    const permCheck = PermissionService.checkBanPermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    // Duration
    const duration = options?.duration ? DurationService.parse(options.duration) : null;

    // Create case
    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'BAN',
      reason,
      reasonCode: options?.reasonCode,
      duration: duration?.milliseconds,
      durationText: duration?.text,
      expiresAt: duration?.expiresAt,
    });

    // Add evidence
    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    // Execute punishment
    const success = await PunishmentService.ban(
      ctx.guild,
      ctx.target.id,
      `Case #${CaseService.formatCaseNumber(caseData.caseNumber)}: ${reason}`,
      options?.deleteDays
    );

    if (!success) {
      return { success: false, error: 'Ban işlemi başarısız oldu.' };
    }

    // Notification
    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'BAN',
      caseNumber: caseData.caseNumber,
      reason,
      duration: duration?.text,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    // Audit log
    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'BAN',
      caseNumber: caseData.caseNumber,
      details: { reason, duration: duration?.text },
    });

    // Increment reason usage
    if (options?.reasonCode) {
      await ReasonService.incrementUsage(ctx.guild.id, options.reasonCode);
    }

    log.info(`Ban uygulandı: ${ctx.target.user.tag} by ${ctx.member.user.tag}`);
    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // UNBAN
  // ==========================================
  static async unban(
    ctx: ModerationContext,
    userId: string,
    reason: string,
    options?: { evidence?: EvidenceData[] }
  ): Promise<ModerationResult> {
    // Permission check
    if (!ctx.member.permissions.has('BanMembers')) {
      return { success: false, error: 'Ban yetkiniz yok.' };
    }

    // Create case
    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: userId,
      moderatorId: ctx.member.id,
      type: 'UNBAN',
      reason,
    });

    // Add evidence
    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    // Execute
    const success = await PunishmentService.unban(ctx.guild, userId, reason);
    if (!success) {
      return { success: false, error: 'Unban işlemi başarısız oldu.' };
    }

    // Audit
    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: userId,
      action: 'UNBAN',
      caseNumber: caseData.caseNumber,
      details: { reason },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // KICK
  // ==========================================
  static async kick(
    ctx: ModerationContext,
    reason: string,
    options?: { evidence?: EvidenceData[]; reasonCode?: string }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkKickPermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'KICK',
      reason,
      reasonCode: options?.reasonCode,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.kick(
      ctx.target,
      `Case #${CaseService.formatCaseNumber(caseData.caseNumber)}: ${reason}`
    );

    if (!success) {
      return { success: false, error: 'Kick işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'KICK',
      caseNumber: caseData.caseNumber,
      reason,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'KICK',
      caseNumber: caseData.caseNumber,
      details: { reason },
    });

    if (options?.reasonCode) {
      await ReasonService.incrementUsage(ctx.guild.id, options.reasonCode);
    }

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // MUTE (Timeout)
  // ==========================================
  static async mute(
    ctx: ModerationContext,
    duration: string,
    reason: string,
    options?: { evidence?: EvidenceData[]; reasonCode?: string }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkMutePermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const durationResult = DurationService.parse(duration);
    if (!durationResult) {
      return { success: false, error: 'Geçersiz süre formatı.' };
    }

    const validation = DurationService.validateDuration(duration);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'MUTE',
      reason,
      reasonCode: options?.reasonCode,
      duration: durationResult.milliseconds,
      durationText: durationResult.text,
      expiresAt: durationResult.expiresAt,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.applyTimeout(
      ctx.target,
      durationResult.milliseconds,
      `Case #${CaseService.formatCaseNumber(caseData.caseNumber)}: ${reason}`
    );

    if (!success) {
      return { success: false, error: 'Mute işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'MUTE',
      caseNumber: caseData.caseNumber,
      reason,
      duration: durationResult.text,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'MUTE',
      caseNumber: caseData.caseNumber,
      details: { reason, duration: durationResult.text },
    });

    if (options?.reasonCode) {
      await ReasonService.incrementUsage(ctx.guild.id, options.reasonCode);
    }

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // TIMEOUT (Bağımsız Discord timeout)
  // ==========================================
  static async timeout(
    ctx: ModerationContext,
    duration: string,
    reason: string,
    options?: { evidence?: EvidenceData[]; reasonCode?: string }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkMutePermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const durationResult = DurationService.parse(duration);
    if (!durationResult) {
      return { success: false, error: 'Geçersiz süre formatı.' };
    }

    const validation = DurationService.validateDuration(duration);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'TIMEOUT',
      reason,
      reasonCode: options?.reasonCode,
      duration: durationResult.milliseconds,
      durationText: durationResult.text,
      expiresAt: durationResult.expiresAt,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.applyTimeout(
      ctx.target,
      durationResult.milliseconds,
      `Case #${CaseService.formatCaseNumber(caseData.caseNumber)}: ${reason}`
    );

    if (!success) {
      return { success: false, error: 'Timeout işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'TIMEOUT',
      caseNumber: caseData.caseNumber,
      reason,
      duration: durationResult.text,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'TIMEOUT',
      caseNumber: caseData.caseNumber,
      details: { reason, duration: durationResult.text },
    });

    if (options?.reasonCode) {
      await ReasonService.incrementUsage(ctx.guild.id, options.reasonCode);
    }

    log.info(`Timeout uygulandı: ${ctx.target.user.tag} by ${ctx.member.user.tag}`);
    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // UNTIMEOUT
  // ==========================================
  static async untimeout(
    ctx: ModerationContext,
    reason: string,
    options?: { evidence?: EvidenceData[] }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkMutePermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    if (!ctx.target.isCommunicationDisabled()) {
      return { success: false, error: 'Bu kullanıcının timeout\'u bulunmuyor.' };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'UNTIMEOUT',
      reason,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.removeTimeout(ctx.target, reason);
    if (!success) {
      return { success: false, error: 'Timeout kaldırma işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'UNTIMEOUT',
      caseNumber: caseData.caseNumber,
      reason,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'UNTIMEOUT',
      caseNumber: caseData.caseNumber,
      details: { reason },
    });

    log.info(`Timeout kaldırıldı: ${ctx.target.user.tag} by ${ctx.member.user.tag}`);
    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // UNMUTE
  // ==========================================
  static async unmute(
    ctx: ModerationContext,
    reason: string,
    options?: { evidence?: EvidenceData[] }
  ): Promise<ModerationResult> {
    if (!ctx.member.permissions.has('ModerateMembers')) {
      return { success: false, error: 'Mute yetkiniz yok.' };
    }

    if (!ctx.target.isCommunicationDisabled()) {
      return { success: false, error: 'Bu kullanıcı zaten susturulmamış.' };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'UNMUTE',
      reason,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.removeTimeout(ctx.target, reason);
    if (!success) {
      return { success: false, error: 'Unmute işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'UNMUTE',
      caseNumber: caseData.caseNumber,
      reason,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'UNMUTE',
      caseNumber: caseData.caseNumber,
      details: { reason },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // WARN
  // ==========================================
  static async warn(
    ctx: ModerationContext,
    reason: string,
    options?: { evidence?: EvidenceData[]; reasonCode?: string }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkWarnPermission(ctx.member);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'WARN',
      reason,
      reasonCode: options?.reasonCode,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'WARN',
      caseNumber: caseData.caseNumber,
      reason,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'WARN',
      caseNumber: caseData.caseNumber,
      details: { reason },
    });

    if (options?.reasonCode) {
      await ReasonService.incrementUsage(ctx.guild.id, options.reasonCode);
    }

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // JAIL
  // ==========================================
  static async jail(
    ctx: ModerationContext,
    reason: string,
    options?: { duration?: string; evidence?: EvidenceData[]; reasonCode?: string }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkBanPermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const guildData = await getPrisma().guild.findUnique({ where: { guildId: ctx.guild.id } });
    const jailRoleId = guildData?.jailRoleId;
    if (!jailRoleId) {
      return { success: false, error: 'Jail rolü ayarlanmamış.' };
    }

    // Kullanıcının mevcut rollerini kaydet (@everyone ve jail rolü hariç)
    const savedRoleIds = ctx.target.roles.cache
      .filter(r => r.id !== ctx.guild.id && r.id !== jailRoleId)
      .map(r => r.id);

    const duration = options?.duration ? DurationService.parse(options.duration) : null;

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'JAIL',
      reason,
      reasonCode: options?.reasonCode,
      duration: duration?.milliseconds,
      durationText: duration?.text,
      expiresAt: duration?.expiresAt,
      metadata: { savedRoleIds },
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.setJailRole(ctx.target, jailRoleId);
    if (!success) {
      return { success: false, error: 'Jail işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'JAIL',
      caseNumber: caseData.caseNumber,
      reason,
      duration: duration?.text,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'JAIL',
      caseNumber: caseData.caseNumber,
      details: { reason, duration: duration?.text },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // UNJAIL
  // ==========================================
  static async unjail(
    ctx: ModerationContext,
    reason: string,
    options?: { evidence?: EvidenceData[] }
  ): Promise<ModerationResult> {
    const permCheck = PermissionService.checkBanPermission(ctx.member, ctx.target);
    if (!permCheck.allowed) {
      return { success: false, error: permCheck.reason };
    }

    const guildData = await getPrisma().guild.findUnique({ where: { guildId: ctx.guild.id } });
    const jailRoleId = guildData?.jailRoleId;
    if (!jailRoleId) {
      return { success: false, error: 'Jail rolü ayarlanmamış.' };
    }

    const hasJailRole = ctx.target.roles.cache.has(jailRoleId);
    if (!hasJailRole) {
      return { success: false, error: 'Bu kullanıcı jail\'de değil.' };
    }

    // En son JAIL case'ini bul ve kaydedilmiş rolleri al
    const activeJailCases = await getPrisma().case.findMany({
      where: {
        guildId: ctx.guild.id,
        targetId: ctx.target.id,
        type: 'JAIL',
        active: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    let savedRoleIds: string[] = [];
    if (activeJailCases.length > 0 && activeJailCases[0]) {
      const latestJailCase = activeJailCases[0];
      const metadata = latestJailCase.metadata as Record<string, unknown> | null;
      if (metadata && Array.isArray(metadata.savedRoleIds)) {
        savedRoleIds = metadata.savedRoleIds as string[];
      }
    }

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: 'UNJAIL',
      reason,
    });

    if (options?.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    const success = await PunishmentService.removeJailRole(ctx.target, jailRoleId, savedRoleIds);
    if (!success) {
      return { success: false, error: 'Unjail işlemi başarısız oldu.' };
    }

    await NotificationService.sendDM({
      user: ctx.target.user,
      client: ctx.client,
      type: 'UNJAIL',
      caseNumber: caseData.caseNumber,
      reason,
      guildName: ctx.guild.name,
      moderatorTag: ctx.member.user.tag,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: ctx.target.id,
      action: 'UNJAIL',
      caseNumber: caseData.caseNumber,
      details: { reason, restoredRoles: savedRoleIds.length },
    });

    log.info(`Unjail uygulandı: ${ctx.target.user.tag} by ${ctx.member.user.tag}`);
    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // PURGE
  // ==========================================
  static async purge(
    ctx: ModerationContext,
    reason: string,
    options?: { amount?: number; channelId?: string }
  ): Promise<ModerationResult> {
    if (!ctx.member.permissions.has('ManageMessages')) {
      return { success: false, error: 'Mesaj silme yetkiniz yok.' };
    }

    const channel = ctx.interaction.channel;
    if (!channel || !('bulkDelete' in channel)) {
      return { success: false, error: 'Bu kanalda mesaj silinemez.' };
    }

    const amount = options?.amount || 1;
    const deleted = await (channel as { bulkDelete(amount: number, filterOld: boolean): Promise<unknown> })
      .bulkDelete(amount, true)
      .catch(() => null);

    const deletedCount = deleted && typeof deleted === 'object' && 'size' in deleted
      ? (deleted as { size: number }).size
      : 0;

    const targetChannelId = options?.channelId || channel.id;
    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetChannelId,
      moderatorId: ctx.member.id,
      type: 'PURGE',
      reason: `${reason} (${deletedCount} mesaj silindi)`,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: targetChannelId,
      action: 'PURGE',
      caseNumber: caseData.caseNumber,
      details: { reason, amount: deletedCount, channelId: channel.id },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // LOCK
  // ==========================================
  static async lock(
    ctx: ModerationContext,
    reason: string,
    options?: { channelId?: string }
  ): Promise<ModerationResult> {
    if (!ctx.member.permissions.has('ManageChannels')) {
      return { success: false, error: 'Kanal yönetme yetkiniz yok.' };
    }

    const channelId = options?.channelId || ctx.interaction.channel?.id;
    if (!channelId) {
      return { success: false, error: 'Kanal bulunamadı.' };
    }

    const channel = ctx.guild.channels.cache.get(channelId);
    if (!channel || !('permissionOverwrites' in channel)) {
      return { success: false, error: 'Geçersiz kanal.' };
    }

    await (channel as { permissionOverwrites: { edit(target: unknown, perms: unknown, opts: unknown): Promise<unknown> } })
      .permissionOverwrites.edit(
        ctx.guild.roles.everyone,
        { SendMessages: false },
        { reason: `${ctx.member.user.tag}: ${reason}` }
      );

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetChannelId: channelId,
      moderatorId: ctx.member.id,
      type: 'LOCK',
      reason,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: channelId,
      action: 'LOCK',
      caseNumber: caseData.caseNumber,
      details: { reason, channelId },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // UNLOCK
  // ==========================================
  static async unlock(
    ctx: ModerationContext,
    reason: string,
    options?: { channelId?: string }
  ): Promise<ModerationResult> {
    if (!ctx.member.permissions.has('ManageChannels')) {
      return { success: false, error: 'Kanal yönetme yetkiniz yok.' };
    }

    const channelId = options?.channelId || ctx.interaction.channel?.id;
    if (!channelId) {
      return { success: false, error: 'Kanal bulunamadı.' };
    }

    const channel = ctx.guild.channels.cache.get(channelId);
    if (!channel || !('permissionOverwrites' in channel)) {
      return { success: false, error: 'Geçersiz kanal.' };
    }

    await (channel as { permissionOverwrites: { edit(target: unknown, perms: unknown, opts: unknown): Promise<unknown> } })
      .permissionOverwrites.edit(
        ctx.guild.roles.everyone,
        { SendMessages: null },
        { reason: `${ctx.member.user.tag}: ${reason}` }
      );

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetChannelId: channelId,
      moderatorId: ctx.member.id,
      type: 'UNLOCK',
      reason,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: channelId,
      action: 'UNLOCK',
      caseNumber: caseData.caseNumber,
      details: { reason, channelId },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // SLOWMODE
  // ==========================================
  static async slowmode(
    ctx: ModerationContext,
    reason: string,
    options?: { duration?: string; channelId?: string }
  ): Promise<ModerationResult> {
    if (!ctx.member.permissions.has('ManageChannels')) {
      return { success: false, error: 'Kanal yönetme yetkiniz yok.' };
    }

    const channelId = options?.channelId || ctx.interaction.channel?.id;
    if (!channelId) {
      return { success: false, error: 'Kanal bulunamadı.' };
    }

    const channel = ctx.guild.channels.cache.get(channelId);
    if (!channel || !('rateLimitPerUser' in channel)) {
      return { success: false, error: 'Geçersiz kanal.' };
    }

    const durationMs = options?.duration
      ? DurationService.parse(options.duration)?.milliseconds
      : undefined;
    const durationSec = durationMs ? Math.floor(durationMs / 1000) : 0;

    await (channel as { setRateLimitPerUser(limit: number, reason: string): Promise<unknown> })
      .setRateLimitPerUser(durationSec, `Slowmode by ${ctx.member.user.tag}: ${reason}`);

    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetChannelId: channelId,
      moderatorId: ctx.member.id,
      type: 'SLOWMODE',
      reason: `${reason} (${durationSec}s)`,
    });

    await AuditService.log({
      guildId: ctx.guild.id,
      moderatorId: ctx.member.id,
      targetId: channelId,
      action: 'SLOWMODE',
      caseNumber: caseData.caseNumber,
      details: { reason, duration: durationSec, channelId },
    });

    return { success: true, caseNumber: caseData.caseNumber };
  }

  // ==========================================
  // HELPER: Format result
  // ==========================================
  static formatResult(result: ModerationResult): CyberEmbed {
    if (result.success) {
      return CyberEmbed.success(
        'İşlem Başarılı',
        `Case #${CaseService.formatCaseNumber(result.caseNumber!)} oluşturuldu.`
      );
    }
    return CyberEmbed.error('İşlem Başarısız', result.error);
  }
}
