import { Logger } from '../utils/logger.js';

const log = new Logger('CACHE');

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    this.defaultTTL = defaultTTL;

    setInterval(() => this.cleanup(), 60000);
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug(`Cache temizlendi: ${cleaned} entry silindi.`);
    }
  }
}

export const cache = new CacheManager();

export function getGuildCacheKey(guildId: string): string {
  return `guild:${guildId}`;
}

export function getUserCacheKey(userId: string): string {
  return `user:${userId}`;
}

export function getMemberCacheKey(guildId: string, userId: string): string {
  return `member:${guildId}:${userId}`;
}
