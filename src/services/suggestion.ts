import { getPrisma } from './database/index.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('SUGGESTION');

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface SuggestionResult {
  success: boolean;
  suggestionNumber?: number;
  error?: string;
}

export interface SuggestionReviewResult {
  success: boolean;
  error?: string;
  status?: SuggestionStatus;
}

export interface SuggestionRecord {
  id: string;
  guildId: string;
  suggestionNumber: number;
  userId: string;
  title: string;
  content: string;
  status: string;
  messageId: string | null;
  channelId: string | null;
  approvalMessageId: string | null;
  approvalChannelId: string | null;
  publicationMessageId: string | null;
  publicationChannelId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getNextSuggestionNumber(guildId: string): Promise<number> {
  const prisma = getPrisma();
  const last = await prisma.suggestion.findFirst({
    where: { guildId },
    orderBy: { suggestionNumber: 'desc' },
    select: { suggestionNumber: true },
  });
  return (last?.suggestionNumber ?? 0) + 1;
}

export async function createSuggestion(
  guildId: string,
  userId: string,
  title: string,
  content: string,
): Promise<SuggestionResult> {
  const prisma = getPrisma();
  try {
    const suggestionNumber = await getNextSuggestionNumber(guildId);
    await prisma.suggestion.create({
      data: {
        guildId,
        suggestionNumber,
        userId,
        title,
        content,
        status: 'pending',
      },
    });
    log.info('Suggestion #%d created in guild %s by %s', suggestionNumber, guildId, userId);
    return { success: true, suggestionNumber };
  } catch (error) {
    log.error(
      'Failed to create suggestion in guild %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Öneri kaydedilemedi.' };
  }
}

export async function updateSuggestionApprovalMessage(
  guildId: string,
  suggestionNumber: number,
  messageId: string,
  channelId: string,
): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.suggestion.update({
      where: { guildId_suggestionNumber: { guildId, suggestionNumber } },
      data: { approvalMessageId: messageId, approvalChannelId: channelId },
    });
  } catch (error) {
    log.error(
      'Failed to update suggestion approval message for #%d: %s',
      suggestionNumber,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function updateSuggestionPublicationMessage(
  guildId: string,
  suggestionNumber: number,
  messageId: string,
  channelId: string,
): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.suggestion.update({
      where: { guildId_suggestionNumber: { guildId, suggestionNumber } },
      data: {
        publicationMessageId: messageId,
        publicationChannelId: channelId,
        messageId: messageId,
        channelId: channelId,
      },
    });
  } catch (error) {
    log.error(
      'Failed to update suggestion publication message for #%d: %s',
      suggestionNumber,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function findSuggestionByMessage(messageId: string): Promise<SuggestionRecord | null> {
  const prisma = getPrisma();
  return prisma.suggestion.findFirst({ where: { approvalMessageId: messageId } }).catch(() => null);
}

export async function findSuggestionByNumber(
  guildId: string,
  suggestionNumber: number,
): Promise<SuggestionRecord | null> {
  const prisma = getPrisma();
  try {
    return await prisma.suggestion.findUnique({
      where: { guildId_suggestionNumber: { guildId, suggestionNumber } },
    });
  } catch {
    return null;
  }
}

export async function hasOpenSuggestion(guildId: string, userId: string): Promise<boolean> {
  const prisma = getPrisma();
  try {
    const count = await prisma.suggestion.count({
      where: { guildId, userId, status: 'pending' },
    });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Reviews a suggestion with duplicate protection.
 * Returns success:false with an error if the suggestion is no longer pending.
 */
export async function reviewSuggestion(
  guildId: string,
  suggestionNumber: number,
  status: Extract<SuggestionStatus, 'approved' | 'rejected'>,
  reviewedBy: string,
  rejectionReason?: string,
): Promise<SuggestionReviewResult> {
  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.suggestion.findUnique({
        where: { guildId_suggestionNumber: { guildId, suggestionNumber } },
        select: { status: true },
      });

      if (!current) {
        return { success: false, error: 'Öneri bulunamadı.' } as const;
      }

      if (current.status !== 'pending') {
        return { success: false, status: current.status as SuggestionStatus } as const;
      }

      const data: {
        status: string;
        reviewedBy: string;
        reviewedAt: Date;
        rejectionReason?: string;
      } = {
        status,
        reviewedBy,
        reviewedAt: new Date(),
      };

      if (status === 'rejected') {
        data.rejectionReason = rejectionReason ?? 'Sebep belirtilmedi';
      }

      await tx.suggestion.update({
        where: { guildId_suggestionNumber: { guildId, suggestionNumber } },
        data,
      });

      return {
        success: true,
        status: status as SuggestionStatus,
      } as const;
    });

    if (result.success) {
      log.info('Suggestion #%d in guild %s reviewed as %s', suggestionNumber, guildId, status);
    }
    return result as SuggestionReviewResult;
  } catch (error) {
    log.error(
      'Failed to review suggestion #%d in guild %s: %s',
      suggestionNumber,
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Öneri sonuçlandırılamadı.' };
  }
}
