import { getPrisma } from './database/index.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('TICKET');

export type TicketCategory = 'general' | 'bug' | 'premium' | 'partnership' | 'advertisement';
export type TicketStatus = 'open' | 'claimed' | 'closed';

export interface TicketResult {
  success: boolean;
  ticketNumber?: number;
  error?: string;
}

export interface TicketRecord {
  id: string;
  guildId: string;
  ticketNumber: number;
  userId: string;
  category: string;
  channelId: string | null;
  messageId: string | null;
  status: string;
  claimedBy: string | null;
  closedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  transcript: string | null;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'Genel Destek',
  bug: 'Hata Bildirimi',
  premium: 'Premium Destek',
  partnership: 'Partnerlik',
  advertisement: 'Reklam Talebi',
};

export async function getNextTicketNumber(guildId: string): Promise<number> {
  const prisma = getPrisma();
  const last = await prisma.ticket.findFirst({
    where: { guildId },
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true },
  });
  return (last?.ticketNumber ?? 0) + 1;
}

/**
 * Checks whether the user already has any open (non-closed) ticket in the guild.
 */
export async function hasOpenTicketAny(
  guildId: string,
  userId: string,
): Promise<{ ticketNumber: number; channelId: string | null } | null> {
  const prisma = getPrisma();
  try {
    return await prisma.ticket.findFirst({
      where: { guildId, userId, status: { not: 'closed' } },
      select: { ticketNumber: true, channelId: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return null;
  }
}

export async function findOpenTicketByUser(
  guildId: string,
  userId: string,
  category: TicketCategory,
): Promise<{ ticketNumber: number; channelId: string | null } | null> {
  const prisma = getPrisma();
  try {
    return await prisma.ticket.findFirst({
      where: { guildId, userId, category, status: { not: 'closed' } },
      select: { ticketNumber: true, channelId: true },
    });
  } catch {
    return null;
  }
}

export async function createTicket(
  guildId: string,
  userId: string,
  category: TicketCategory,
  channelId?: string,
  messageId?: string,
): Promise<TicketResult> {
  const prisma = getPrisma();
  try {
    const ticketNumber = await getNextTicketNumber(guildId);
    await prisma.ticket.create({
      data: {
        guildId,
        ticketNumber,
        userId,
        category,
        channelId,
        messageId,
      },
    });
    log.info('Ticket #%d created in guild %s by %s (%s)', ticketNumber, guildId, userId, category);
    return { success: true, ticketNumber };
  } catch (error) {
    log.error(
      'Failed to create ticket in guild %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Talep oluşturulamadı.' };
  }
}

export async function claimTicket(
  guildId: string,
  ticketNumber: number,
  moderatorId: string,
): Promise<{ success: boolean; error?: string }> {
  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({
        where: { guildId_ticketNumber: { guildId, ticketNumber } },
        select: { claimedBy: true, status: true },
      });

      if (!current) {
        return { success: false, error: 'Ticket bulunamadı.' } as const;
      }
      if (current.status === 'closed') {
        return { success: false, error: 'Ticket kapatılmış.' } as const;
      }
      if (current.claimedBy) {
        return { success: false, error: 'claimed' } as const;
      }

      await tx.ticket.update({
        where: { guildId_ticketNumber: { guildId, ticketNumber } },
        data: { claimedBy: moderatorId, status: 'claimed' },
      });

      return { success: true } as const;
    });

    if (result.success) {
      log.info('Ticket #%d claimed by %s', ticketNumber, moderatorId);
    }
    return result as { success: boolean; error?: string };
  } catch (error) {
    log.error(
      'Failed to claim ticket #%d: %s',
      ticketNumber,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Talep üzerine alınamadı.' };
  }
}

export async function unclaimTicket(guildId: string, ticketNumber: number): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.ticket.update({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
      data: { claimedBy: null, status: 'open' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function closeTicket(
  guildId: string,
  ticketNumber: number,
  closedBy?: string,
  transcript?: string,
): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.ticket.update({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
      data: { status: 'closed', closedAt: new Date(), closedBy, transcript },
    });
    log.info('Ticket #%d closed', ticketNumber);
    return true;
  } catch (error) {
    log.error(
      'Failed to close ticket #%d: %s',
      ticketNumber,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export async function findTicketByChannel(channelId: string): Promise<TicketRecord | null> {
  const prisma = getPrisma();
  try {
    return await prisma.ticket.findFirst({ where: { channelId } });
  } catch {
    return null;
  }
}

export async function findTicketByNumber(
  guildId: string,
  ticketNumber: number,
): Promise<TicketRecord | null> {
  const prisma = getPrisma();
  try {
    return await prisma.ticket.findUnique({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
    });
  } catch {
    return null;
  }
}

export async function updateTicketChannel(
  guildId: string,
  ticketNumber: number,
  channelId: string,
): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.ticket.update({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
      data: { channelId },
    });
  } catch (error) {
    log.error(
      'Failed to update ticket channel: %s',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function updateTicketMessage(
  guildId: string,
  ticketNumber: number,
  messageId: string,
): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.ticket.update({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
      data: { messageId },
    });
  } catch (error) {
    log.error(
      'Failed to update ticket message: %s',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function saveTranscript(
  guildId: string,
  ticketNumber: number,
  transcript: string,
): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.ticket.update({
      where: { guildId_ticketNumber: { guildId, ticketNumber } },
      data: { transcript },
    });
  } catch (error) {
    log.error(
      'Failed to save transcript for ticket #%d: %s',
      ticketNumber,
      error instanceof Error ? error.message : String(error),
    );
  }
}
