import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('EVIDENCE');

export type EvidenceType = 'MESSAGE_URL' | 'IMAGE' | 'VIDEO' | 'GIF' | 'FILE' | 'TEXT' | 'EXTERNAL_URL';

export interface EvidenceData {
  type: EvidenceType;
  url?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export class EvidenceService {
  static async add(caseId: string, data: EvidenceData) {
    const db = getPrisma();
    try {
      const evidence = await db.evidence.create({
        data: {
          caseId,
          type: data.type,
          url: data.url,
          content: data.content,
          metadata: data.metadata as unknown as Prisma.InputJsonValue,
        },
      });
      log.info(`Kanıt eklendi: ${evidence.id} (Case: ${caseId})`);
      return evidence;
    } catch (error) {
      log.error('Kanıt ekleme hatası', error);
      throw error;
    }
  }

  static async getByCase(caseId: string) {
    const db = getPrisma();
    return db.evidence.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async delete(evidenceId: string) {
    const db = getPrisma();
    try {
      await db.evidence.delete({ where: { id: evidenceId } });
      log.info(`Kanıt silindi: ${evidenceId}`);
      return true;
    } catch (error) {
      log.error('Kanıt silme hatası', error);
      return false;
    }
  }

  static async deleteByCase(caseId: string) {
    const db = getPrisma();
    try {
      await db.evidence.deleteMany({ where: { caseId } });
      log.info(`Case kanıtları silindi: ${caseId}`);
      return true;
    } catch (error) {
      log.error('Case kanıtları silme hatası', error);
      return false;
    }
  }

  static detectType(content: string): EvidenceType {
    if (/^https?:\/\//.test(content)) {
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(content)) return 'IMAGE';
      if (/\.(mp4|webm|mov)$/i.test(content)) return 'VIDEO';
      if (/cdn\.discordapp\.com\/attachments/.test(content)) return 'MESSAGE_URL';
      return 'EXTERNAL_URL';
    }
    return 'TEXT';
  }

  static async addFromMessage(caseId: string, messageId: string, channelId: string, guildId: string) {
    const url = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
    return this.add(caseId, { type: 'MESSAGE_URL', url });
  }

  static async addFromUrl(caseId: string, url: string) {
    const type = this.detectType(url);
    return this.add(caseId, { type, url });
  }

  static async addText(caseId: string, content: string) {
    return this.add(caseId, { type: 'TEXT', content });
  }

  static formatEvidence(evidence: Array<{ type: string; url?: string | null; content?: string | null }>): string {
    if (evidence.length === 0) return 'Kanıt yok';

    return evidence.map((e, i) => {
      const num = i + 1;
      switch (e.type) {
        case 'MESSAGE_URL':
          return `${num}. [Mesaj Linki](${e.url})`;
        case 'IMAGE':
          return `${num}. [Görsel](${e.url})`;
        case 'VIDEO':
          return `${num}. [Video](${e.url})`;
        case 'GIF':
          return `${num}. [GIF](${e.url})`;
        case 'FILE':
          return `${num}. [Dosya](${e.url})`;
        case 'EXTERNAL_URL':
          return `${num}. [Dış Bağlantı](${e.url})`;
        case 'TEXT':
          return `${num}. ${e.content}`;
        default:
          return `${num}. Bilinmeyen kanıt`;
      }
    }).join('\n');
  }
}
