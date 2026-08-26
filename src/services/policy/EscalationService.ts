import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('ESCALATION');

export interface EscalationStep {
  step: number;
  action: string;
  duration: string | null;
  reason: string;
}

export interface EscalationChain {
  id: string;
  guildId: string;
  name: string;
  enabled: boolean;
  steps: EscalationStep[];
  resetAfterDays: number;
  createdBy: string;
}

const DEFAULT_CHAIN: EscalationStep[] = [
  { step: 1, action: 'WARN', duration: null, reason: 'İlk uyarı' },
  { step: 2, action: 'WARN', duration: null, reason: 'İkinci uyarı' },
  { step: 3, action: 'TIMEOUT', duration: '1h', reason: 'Üçüncü uyarı - zaman aşımı' },
  { step: 4, action: 'MUTE', duration: '1d', reason: 'Dördüncü ihlal - susturma' },
  { step: 5, action: 'KICK', duration: null, reason: 'Beşinci ihlal - atılma' },
  { step: 6, action: 'BAN', duration: null, reason: 'Altıncı ihlal - yasaklama' },
];

export class EscalationService {
  static async getChain(guildId: string, name: string = 'DEFAULT'): Promise<EscalationChain | null> {
    const db = getPrisma();
    const chain = await db.escalationChain.findUnique({
      where: { guildId_name: { guildId, name } },
    });
    return chain as unknown as EscalationChain | null;
  }

  static async getOrCreateChain(guildId: string, createdBy: string, name: string = 'DEFAULT'): Promise<EscalationChain> {
    const existing = await this.getChain(guildId, name);
    if (existing) return existing;

    return this.createChain(guildId, createdBy, name, DEFAULT_CHAIN);
  }

  static async createChain(
    guildId: string,
    createdBy: string,
    name: string,
    steps: EscalationStep[],
    resetAfterDays: number = 30
  ): Promise<EscalationChain> {
    const db = getPrisma();
    try {
      const chain = await db.escalationChain.create({
        data: {
          guildId,
          name,
          steps: steps as unknown as Prisma.InputJsonValue,
          resetAfterDays,
          createdBy,
        },
      });
      log.info(`Escalation chain oluşturuldu: ${name} (${guildId})`);
      return chain as unknown as EscalationChain;
    } catch (error) {
      log.error('Escalation chain oluşturma hatası', error);
      throw error;
    }
  }

  static async updateChain(
    guildId: string,
    name: string,
    data: { steps?: EscalationStep[]; enabled?: boolean; resetAfterDays?: number }
  ): Promise<EscalationChain> {
    const db = getPrisma();
    try {
      const chain = await db.escalationChain.update({
        where: { guildId_name: { guildId, name } },
        data: {
          ...data,
          steps: data.steps as unknown as Prisma.InputJsonValue | undefined,
          updatedAt: new Date(),
        },
      });
      log.info(`Escalation chain güncellendi: ${name}`);
      return chain as unknown as EscalationChain;
    } catch (error) {
      log.error('Escalation chain güncelleme hatası', error);
      throw error;
    }
  }

  static async getNextAction(
    guildId: string,
    currentViolationCount: number,
    chainName: string = 'DEFAULT'
  ): Promise<EscalationStep | null> {
    const chain = await this.getChain(guildId, chainName);
    if (!chain || !chain.enabled) return null;

    const stepIndex = Math.min(currentViolationCount, chain.steps.length - 1);
    return chain.steps[stepIndex] ?? null;
  }

  static async getAllChains(guildId: string): Promise<EscalationChain[]> {
    const db = getPrisma();
    const chains = await db.escalationChain.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
    });
    return chains as unknown as EscalationChain[];
  }

  static async deleteChain(guildId: string, name: string): Promise<boolean> {
    if (name === 'DEFAULT') return false; // Default chain cannot be deleted

    const db = getPrisma();
    try {
      await db.escalationChain.delete({
        where: { guildId_name: { guildId, name } },
      });
      log.info(`Escalation chain silindi: ${name}`);
      return true;
    } catch (error) {
      log.error('Escalation chain silme hatası', error);
      return false;
    }
  }

  static formatChain(chain: EscalationChain): string {
    const lines: string[] = [
      `**${chain.name}** ${chain.enabled ? '' : ''}`,
      `**Sıfırlama:** ${chain.resetAfterDays} gün`,
      '',
      '**Adımlar:**',
    ];

    for (const step of chain.steps) {
      const duration = step.duration ? ` (${step.duration})` : '';
      lines.push(`${step.step}. \`${step.action}\`${duration} - ${step.reason}`);
    }

    return lines.join('\n');
  }

  static getDefaultChain(): EscalationStep[] {
    return [...DEFAULT_CHAIN];
  }
}
