import { GuildMember } from 'discord.js';
import { GuildPolicyService } from './GuildPolicyService.js';
import { EscalationService, EscalationStep } from './EscalationService.js';
import { RuleEngine, ViolationRule } from './RuleEngine.js';
import { PermissionProfileService, PermissionProfile } from './PermissionProfileService.js';
import { DryRunService, DryRunResult } from './DryRunService.js';
import { TimelineService } from './TimelineService.js';
import { PolicyCooldownService } from './CooldownService.js';
import { ModerationService, ModerationContext, ModerationResult } from '../moderation/ModerationService.js';
import { CaseService } from '../moderation/CaseService.js';
import { EvidenceService, EvidenceData } from '../moderation/EvidenceService.js';
import { getPrisma } from '../database/index.js';
import { main } from '../../config/main.js';
import { CyberEmbed } from '../../utils/embed.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('POLICY');

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  profile?: PermissionProfile;
  rule?: ViolationRule;
  cooldownActive?: boolean;
  escalation?: EscalationStep;
  dryRun?: boolean;
}

export interface PolicyActionResult {
  success: boolean;
  caseNumber?: number;
  dryRun?: DryRunResult;
  error?: string;
  escalation?: EscalationStep;
}

export class PolicyService {
  // ==========================================
  // ANA KONTROL
  // ==========================================
  static async check(
    guildId: string,
    member: GuildMember,
    target: GuildMember,
    action: string,
    ruleCode?: string
  ): Promise<PolicyCheckResult> {
    // 1. Guild Policy kontrolü
    const policy = await GuildPolicyService.get(guildId);

    // 2. Owner koruması
    if (this.isProtected(target)) {
      return { allowed: false, reason: 'Bu kullanıcı korumalıdır.' };
    }

    // 3. Whitelist kontrolü
    if (await this.isWhitelisted(guildId, target.id)) {
      return { allowed: false, reason: 'Bu kullanıcı whitelist\'tedir.' };
    }

    // 4. Kara liste kontrolü
    if (await this.isBlacklisted(guildId, target.id)) {
      return { allowed: true, reason: 'Bu kullanıcı kara listede.' };
    }

    // 5. Permission Profile kontrolü
    const profile = await this.getStaffProfile(guildId, member);
    if (!profile) {
      return { allowed: false, reason: 'Yetkiniz yok.' };
    }

    // 6. Profile yetki kontrolü
    if (!PermissionProfileService.canPerformAction(profile, action)) {
      return { allowed: false, reason: `${profile.name} profili bu işlemi yapamaz.` };
    }

    // 7. Cooldown kontrolü
    const cooldown = await PolicyCooldownService.check(guildId, member.id, action);
    if (cooldown.onCooldown) {
      return {
        allowed: false,
        reason: `Cooldown aktif. Kalan süre: ${this.formatRemainingTime(cooldown.expiresAt!)}`,
        cooldownActive: true,
      };
    }

    // 8. Aynı hedef cooldown kontrolü
    const targetCooldown = await PolicyCooldownService.check(guildId, target.id, `TARGET_${action}`);
    if (targetCooldown.onCooldown) {
      return {
        allowed: false,
        reason: `Bu hedefe kısa sürede tekrar işlem yapılamaz.`,
        cooldownActive: true,
      };
    }

    // 9. Kural kontrolü
    let rule: ViolationRule | undefined;
    if (ruleCode) {
      const ruleCheck = await RuleEngine.checkRule(guildId, target.id, ruleCode);
      if (!ruleCheck.allowed && ruleCheck.rule) {
        return { allowed: false, reason: ruleCheck.reason, rule: ruleCheck.rule };
      }
      rule = ruleCheck.rule;
    }

    // 10. Escalation kontrolü
    let escalation: EscalationStep | undefined;
    if (policy.escalationEnabled && ruleCode) {
      const violationCount = await RuleEngine.getViolationCount(guildId, target.id, ruleCode);
      escalation = await EscalationService.getNextAction(guildId, violationCount + 1) || undefined;
    }

    // 11. Dry run kontrolü
    const dryRun = policy.dryRunMode;

    return {
      allowed: true,
      profile,
      rule,
      escalation,
      dryRun,
    };
  }

  // ==========================================
  // İŞLEM
  // ==========================================
  static async execute(
    ctx: ModerationContext,
    action: string,
    options: {
      reason: string;
      duration?: string;
      evidence?: EvidenceData[];
      ruleCode?: string;
      targetUserId?: string;
      channelId?: string;
      amount?: number;
    }
  ): Promise<PolicyActionResult> {
    // Policy kontrolü
    const check = await this.check(
      ctx.guild.id,
      ctx.member,
      ctx.target!,
      action,
      options.ruleCode
    );

    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    // Dry run kontrolü
    if (check.dryRun) {
      return this.executeDryRun(ctx, action, options);
    }

    // Escalation varsa uygula
    const actionToExecute = check.escalation?.action || action;
    const duration = check.escalation?.duration || options.duration;
    const reason = check.escalation?.reason || options.reason;

    // ModerationService'i çağır
    let result: ModerationResult;

    switch (actionToExecute) {
      case 'BAN':
        result = await ModerationService.ban(ctx, reason, {
          duration,
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'UNBAN':
        result = await ModerationService.unban(ctx, options.targetUserId || ctx.target?.id || '', reason, {
          evidence: options.evidence,
        });
        break;
      case 'KICK':
        result = await ModerationService.kick(ctx, reason, {
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'MUTE':
        result = await ModerationService.mute(ctx, duration || '1h', reason, {
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'UNMUTE':
        result = await ModerationService.unmute(ctx, reason, {
          evidence: options.evidence,
        });
        break;
      case 'WARN':
        result = await ModerationService.warn(ctx, reason, {
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'TIMEOUT':
        result = await ModerationService.timeout(ctx, duration || '1h', reason, {
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'UNTIMEOUT':
        result = await ModerationService.untimeout(ctx, reason, {
          evidence: options.evidence,
        });
        break;
      case 'JAIL':
        result = await ModerationService.jail(ctx, reason, {
          duration,
          evidence: options.evidence,
          reasonCode: options.ruleCode,
        });
        break;
      case 'UNJAIL':
        result = await ModerationService.unjail(ctx, reason, {
          evidence: options.evidence,
        });
        break;
      case 'PURGE':
        result = await ModerationService.purge(ctx, reason, {
          amount: options.amount,
          channelId: options.channelId,
        });
        break;
      case 'LOCK':
        result = await ModerationService.lock(ctx, reason, {
          channelId: options.channelId,
        });
        break;
      case 'UNLOCK':
        result = await ModerationService.unlock(ctx, reason, {
          channelId: options.channelId,
        });
        break;
      case 'SLOWMODE':
        result = await ModerationService.slowmode(ctx, reason, {
          duration,
          channelId: options.channelId,
        });
        break;
      default:
        return { success: false, error: `Desteklenmeyen işlem: ${action}` };
    }

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // İhlal sayacını artır
    if (options.ruleCode) {
      await RuleEngine.incrementViolationCount(ctx.guild.id, ctx.target.id, options.ruleCode);
    }

    // Cooldown ayarla
    const policy = await GuildPolicyService.get(ctx.guild.id);
    await PolicyCooldownService.set(ctx.guild.id, ctx.member.id, action, policy.cooldownMinutes);
    await PolicyCooldownService.set(ctx.guild.id, ctx.target.id, `TARGET_${action}`, policy.sameTargetCooldownMinutes);

    // Timeline ekle
    if (result.caseNumber) {
      const caseRecord = await CaseService.getByNumber(ctx.guild.id, result.caseNumber);
      if (caseRecord) {
        await TimelineService.addEntry(caseRecord.id, 'PUNISHMENT_APPLIED', ctx.member.id, {
          reason,
          duration,
          action: actionToExecute,
        });
      }
    }

    // Escalation log
    if (check.escalation) {
      log.info(`Escalation uygulandı: ${ctx.target.user.tag} - ${check.escalation.action}`);
    }

    return {
      success: true,
      caseNumber: result.caseNumber,
      escalation: check.escalation,
    };
  }

  // ==========================================
  // DRY RUN
  // ==========================================
  static async executeDryRun(
    ctx: ModerationContext,
    action: string,
    options: {
      reason: string;
      duration?: string;
      evidence?: EvidenceData[];
      ruleCode?: string;
    }
  ): Promise<PolicyActionResult> {
    // Case oluştur (Discord API çağırmadan)
    const caseData = await CaseService.create({
      guildId: ctx.guild.id,
      targetUserId: ctx.target.id,
      moderatorId: ctx.member.id,
      type: action,
      reason: options.reason,
      reasonCode: options.ruleCode,
    });

    // Kanıt ekle
    if (options.evidence) {
      for (const ev of options.evidence) {
        await EvidenceService.add(caseData.id, ev);
      }
    }

    // Dry run log oluştur
    const dryRunLog = await DryRunService.log({
      guildId: ctx.guild.id,
      userId: ctx.target.id,
      moderatorId: ctx.member.id,
      action,
      reason: options.reason,
      duration: options.duration,
    });

    // Timeline ekle
    await TimelineService.addEntry(caseData.id, 'DRY_RUN', ctx.member.id, {
      reason: options.reason,
      duration: options.duration,
      action,
    });

    return {
      success: true,
      caseNumber: caseData.caseNumber,
      dryRun: {
        dryRunId: dryRunLog.id,
        action,
        userId: ctx.target.id,
        moderatorId: ctx.member.id,
        reason: options.reason,
        duration: options.duration,
        wouldExecute: true,
        caseCreated: true,
        logCreated: true,
      },
    };
  }

  // ==========================================
  // YARDIMCI FONKSİYONLAR
  // ==========================================
  private static isProtected(target: GuildMember): boolean {
    return (
      target.id === main.ownerId ||
      main.developerIds.includes(target.id) ||
      target.guild.ownerId === target.id
    );
  }

  private static async isWhitelisted(guildId: string, userId: string): Promise<boolean> {
    const db = getPrisma();
    const entry = await db.moderationList.findUnique({
      where: { guildId_userId_type: { guildId, userId, type: 'WHITELIST' } },
    });
    return !!entry;
  }

  private static async isBlacklisted(guildId: string, userId: string): Promise<boolean> {
    const db = getPrisma();
    const entry = await db.moderationList.findUnique({
      where: { guildId_userId_type: { guildId, userId, type: 'BLACKLIST' } },
    });
    return !!entry;
  }

  private static async getStaffProfile(guildId: string, member: GuildMember): Promise<PermissionProfile | null> {
    // Admin ise
    if (member.permissions.has('Administrator')) {
      return PermissionProfileService.getProfileByLevel(guildId, 5);
    }

    // Ban yetkisi varsa
    if (member.permissions.has('BanMembers')) {
      return PermissionProfileService.getProfileByLevel(guildId, 4);
    }

    // Kick yetkisi varsa
    if (member.permissions.has('KickMembers')) {
      return PermissionProfileService.getProfileByLevel(guildId, 3);
    }

    // ModerateMembers yetkisi varsa
    if (member.permissions.has('ModerateMembers')) {
      return PermissionProfileService.getProfileByLevel(guildId, 2);
    }

    // Hiç yetkisi yoksa
    return null;
  }

  private static formatRemainingTime(expiresAt: Date): string {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) return '0 saniye';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) return `${minutes} dakika ${seconds} saniye`;
    return `${seconds} saniye`;
  }

  // ==========================================
  // LİSTE YÖNETİMİ
  // ==========================================
  static async addToWhitelist(guildId: string, userId: string, addedBy: string, reason?: string): Promise<void> {
    const db = getPrisma();
    await db.moderationList.upsert({
      where: { guildId_userId_type: { guildId, userId, type: 'WHITELIST' } },
      update: { reason, addedBy },
      create: { guildId, userId, type: 'WHITELIST', reason, addedBy },
    });
    log.info(`Whitelist'e eklendi: ${userId}`);
  }

  static async removeFromWhitelist(guildId: string, userId: string): Promise<void> {
    const db = getPrisma();
    await db.moderationList.deleteMany({
      where: { guildId, userId, type: 'WHITELIST' },
    });
    log.info(`Whitelist'ten kaldırıldı: ${userId}`);
  }

  static async addToBlacklist(guildId: string, userId: string, addedBy: string, reason?: string): Promise<void> {
    const db = getPrisma();
    await db.moderationList.upsert({
      where: { guildId_userId_type: { guildId, userId, type: 'BLACKLIST' } },
      update: { reason, addedBy },
      create: { guildId, userId, type: 'BLACKLIST', reason, addedBy },
    });
    log.info(`Blacklist'e eklendi: ${userId}`);
  }

  static async removeFromBlacklist(guildId: string, userId: string): Promise<void> {
    const db = getPrisma();
    await db.moderationList.deleteMany({
      where: { guildId, userId, type: 'BLACKLIST' },
    });
    log.info(`Blacklist'ten kaldırıldı: ${userId}`);
  }

  static async getWhitelist(guildId: string): Promise<Array<{ userId: string; reason: string | null; addedBy: string }>> {
    const db = getPrisma();
    return db.moderationList.findMany({
      where: { guildId, type: 'WHITELIST' },
    });
  }

  static async getBlacklist(guildId: string): Promise<Array<{ userId: string; reason: string | null; addedBy: string }>> {
    const db = getPrisma();
    return db.moderationList.findMany({
      where: { guildId, type: 'BLACKLIST' },
    });
  }

  // ==========================================
  // EMBED YARDIMCILARI
  // ==========================================
  static formatPolicyCheck(check: PolicyCheckResult): CyberEmbed {
    if (check.allowed) {
      return CyberEmbed.success('Policy Kontrolü', 'İşlem onaylandı.');
    }
    return CyberEmbed.error('Policy Engellendi', check.reason);
  }

  static formatPolicyResult(result: PolicyActionResult): CyberEmbed {
    if (result.success) {
      const embed = CyberEmbed.success(
        'İşlem Başarılı',
        `Case #${CaseService.formatCaseNumber(result.caseNumber!)} oluşturuldu.`
      );

      if (result.escalation) {
        embed.addFields({
          name: 'Escalation',
          value: `${result.escalation.action} uygulandı: ${result.escalation.reason}`,
        });
      }

      return embed;
    }

    return CyberEmbed.error('İşlem Başarısız', result.error);
  }
}
