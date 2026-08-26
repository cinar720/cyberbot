export interface DurationResult {
  milliseconds: number;
  text: string;
  expiresAt: Date | null;
  isPermanent: boolean;
}

const DURATION_REGEX = /^(\d+)(s|m|h|d|permanent)$/i;

const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export class DurationService {
  static parse(input: string): DurationResult | null {
    const trimmed = input.trim().toLowerCase();

    if (trimmed === 'permanent' || trimmed === 'perm' || trimmed === 'süresiz') {
      return {
        milliseconds: 0,
        text: 'Kalıcı',
        expiresAt: null,
        isPermanent: true,
      };
    }

    const match = trimmed.match(DURATION_REGEX);
    if (!match) return null;

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!.toLowerCase();

    if (unit === 'permanent' || unit === 'perm') {
      return {
        milliseconds: 0,
        text: 'Kalıcı',
        expiresAt: null,
        isPermanent: true,
      };
    }

    const multiplier = MULTIPLIERS[unit];
    if (!multiplier) return null;

    const milliseconds = value * multiplier;
    const expiresAt = new Date(Date.now() + milliseconds);

    return {
      milliseconds,
      text: this.formatDuration(milliseconds),
      expiresAt,
      isPermanent: false,
    };
  }

  static formatDuration(ms: number): string {
    if (ms <= 0) return 'Kalıcı';

    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000) % 24;
    const days = Math.floor(ms / 86400000);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0) parts.push(`${seconds} saniye`);

    return parts.join(', ') || '0 saniye';
  }

  static isValid(input: string): boolean {
    return this.parse(input) !== null;
  }

  static getMaximumDuration(): number {
    return 28 * 24 * 60 * 60 * 1000; // 28 days (Discord limit)
  }

  static validateDuration(input: string): { valid: boolean; error?: string } {
    const result = this.parse(input);
    if (!result) {
      return { valid: false, error: 'Geçersiz süre formatı. Örnekler: `10m`, `1h`, `3d`, `permanent`' };
    }

    if (!result.isPermanent && result.milliseconds > this.getMaximumDuration()) {
      return { valid: false, error: 'Maksimum süre 28 gündür.' };
    }

    return { valid: true };
  }

  static getExamples(): string[] {
    return ['30s', '5m', '10m', '30m', '1h', '12h', '1d', '3d', '7d', '30d', '90d', 'permanent'];
  }
}
