import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('DATABASE');

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    throw new Error('Prisma client not initialized. Call connectDatabase() first.');
  }
  return _prisma;
}

export async function connectDatabase(): Promise<PrismaClient> {
  try {
    _prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    await _prisma.$connect();
    log.info('Database connected.');
    return _prisma;
  } catch (error) {
    log.error(
      'Database connection failed: %s',
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
    log.info('Database disconnected.');
  }
}
