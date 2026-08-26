export interface ConfigProfile {
  name: string;
  displayName: string;
  description: string;
  emoji: string;
  policy: Record<string, unknown>;
  channels: Array<{ name: string; type: string; category?: string }>;
  roles: Array<{ name: string; color?: string; permissions: string[] }>;
  modules: string[];
  tags: string[];
}

export const CONFIG_PROFILES: ConfigProfile[] = [
  {
    name: 'basic',
    displayName: 'Temel',
    description: 'Basit sunucu yapısı. Küçük topluluklar için ideal.',
    emoji: '',
    policy: {
      maxWarnings: 3,
      banPolicy: 'STRIKE_3',
      appealEnabled: true,
      evidenceRequired: false,
      dmEnabled: true,
      dryRunMode: false,
      escalationEnabled: true,
      cooldownMinutes: 5,
    },
    channels: [
      { name: 'genel', type: 'text' },
      { name: 'sohbet', type: 'text' },
      { name: 'kurallar', type: 'text' },
      { name: 'duyurular', type: 'text' },
    ],
    roles: [
      { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
      { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
    ],
    modules: ['moderation', 'welcome'],
    tags: ['basit', 'küçük', 'yeni'],
  },
  {
    name: 'community',
    displayName: 'Topluluk',
    description: 'Topluluk odaklı sunucu. Orta boy sunucular için.',
    emoji: '',
    policy: {
      maxWarnings: 5,
      banPolicy: 'STRIKE_5',
      appealEnabled: true,
      evidenceRequired: false,
      dmEnabled: true,
      dryRunMode: false,
      escalationEnabled: true,
      cooldownMinutes: 3,
    },
    channels: [
      { name: 'genel', type: 'text', category: 'Genel' },
      { name: 'sohbet', type: 'text', category: 'Genel' },
      { name: 'medya', type: 'text', category: 'Genel' },
      { name: 'kurallar', type: 'text', category: 'Bilgi' },
      { name: 'duyurular', type: 'text', category: 'Bilgi' },
      { name: 'sıkça-sorulan', type: 'text', category: 'Bilgi' },
      { name: 'destek', type: 'text', category: 'Destek' },
    ],
    roles: [
      { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
      { name: 'Yönetici', color: '#ff4400', permissions: ['BanMembers', 'ManageMessages'] },
      { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
      { name: 'VIP', color: '#ffd700', permissions: [] },
    ],
    modules: ['moderation', 'welcome', 'logs', 'automod'],
    tags: ['topluluk', 'orta', 'aktif'],
  },
  {
    name: 'gaming',
    displayName: 'Oyun',
    description: 'Oyun odaklı sunucu. Oyun toplulukları için.',
    emoji: '',
    policy: {
      maxWarnings: 3,
      banPolicy: 'STRIKE_3',
      appealEnabled: true,
      evidenceRequired: true,
      dmEnabled: true,
      dryRunMode: false,
      escalationEnabled: true,
      cooldownMinutes: 5,
      gamePunishmentsEnabled: true,
    },
    channels: [
      { name: 'genel', type: 'text', category: 'Genel' },
      { name: 'oyun-tartışma', type: 'text', category: 'Oyun' },
      { name: 'lfg', type: 'text', category: 'Oyun' },
      { name: 'skor-tablosu', type: 'text', category: 'Oyun' },
      { name: 'clips', type: 'text', category: 'Medya' },
      { name: 'screenshots', type: 'text', category: 'Medya' },
    ],
    roles: [
      { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
      { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
      { name: 'Oyuncu', color: '#00ff00', permissions: [] },
      { name: 'VIP', color: '#ffd700', permissions: [] },
    ],
    modules: ['moderation', 'welcome', 'logs', 'automod', 'rp'],
    tags: ['oyun', 'gaming', 'topluluk'],
  },
  {
    name: 'roleplay',
    displayName: 'RolePlay',
    description: 'RP odaklı sunucu. RolePlay toplulukları için.',
    emoji: '',
    policy: {
      maxWarnings: 5,
      banPolicy: 'STRIKE_5',
      appealEnabled: true,
      evidenceRequired: true,
      dmEnabled: true,
      dryRunMode: false,
      escalationEnabled: true,
      cooldownMinutes: 10,
      gamePunishmentsEnabled: true,
    },
    channels: [
      { name: 'genel', type: 'text', category: 'Genel' },
      { name: 'rp-sohbet', type: 'text', category: 'RP' },
      { name: 'rp-karakterler', type: 'text', category: 'RP' },
      { name: 'rp-olaylar', type: 'text', category: 'RP' },
      { name: 'rp-kurallar', type: 'text', category: 'RP' },
      { name: 'destek', type: 'text', category: 'Destek' },
    ],
    roles: [
      { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
      { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
      { name: 'RP Lideri', color: '#9900ff', permissions: [] },
      { name: 'RP Üye', color: '#0099ff', permissions: [] },
    ],
    modules: ['moderation', 'welcome', 'logs', 'automod', 'rp'],
    tags: ['roleplay', 'rp', 'topluluk'],
  },
  {
    name: 'large',
    displayName: 'Büyük Topluluk',
    description: 'Profesyonel büyük sunucu. 1000+ üye için.',
    emoji: '',
    policy: {
      maxWarnings: 3,
      banPolicy: 'STRIKE_3',
      appealEnabled: true,
      evidenceRequired: true,
      dmEnabled: true,
      dryRunMode: false,
      escalationEnabled: true,
      cooldownMinutes: 2,
    },
    channels: [
      { name: 'genel', type: 'text', category: 'Genel' },
      { name: 'duyurular', type: 'text', category: 'Bilgi' },
      { name: 'kurallar', type: 'text', category: 'Bilgi' },
      { name: 'destek', type: 'text', category: 'Destek' },
      { name: 'ticket-oluştur', type: 'text', category: 'Ticket' },
      { name: 'log-moderasyon', type: 'text', category: 'Loglar' },
      { name: 'log-mesaj', type: 'text', category: 'Loglar' },
      { name: 'log-ses', type: 'text', category: 'Loglar' },
    ],
    roles: [
      { name: 'Trial Moderator', color: '#ffaa00', permissions: ['ModerateMembers'] },
      { name: 'Moderator', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
      { name: 'Senior Moderator', color: '#ff4400', permissions: ['BanMembers', 'ModerateMembers'] },
      { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
      { name: 'Management', color: '#9900ff', permissions: ['Administrator'] },
    ],
    modules: ['moderation', 'welcome', 'logs', 'automod', 'ticket', 'guard'],
    tags: ['büyük', 'profesyonel', 'büyük-topluluk'],
  },
];

export class ConfigProfileService {
  static getAll(): ConfigProfile[] {
    return CONFIG_PROFILES;
  }

  static get(name: string): ConfigProfile | null {
    return CONFIG_PROFILES.find((p) => p.name === name) || null;
  }

  static getByTag(tag: string): ConfigProfile[] {
    return CONFIG_PROFILES.filter((p) => p.tags.includes(tag));
  }

  static search(query: string): ConfigProfile[] {
    const lower = query.toLowerCase();
    return CONFIG_PROFILES.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.displayName.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.includes(lower))
    );
  }

  static formatProfile(profile: ConfigProfile): string {
    const lines: string[] = [
      `${profile.emoji} **${profile.displayName}**`,
      `**Açıklama:** ${profile.description}`,
      '',
      '**Kanallar:**',
      ...profile.channels.map((c) => `  - ${c.name} (${c.type})`),
      '',
      '**Roller:**',
      ...profile.roles.map((r) => `  - ${r.name}`),
      '',
      '**Modüller:**',
      ...profile.modules.map((m) => `  - ${m}`),
      '',
      '**Etiketler:**',
      profile.tags.join(', '),
    ];

    return lines.join('\n');
  }

  static formatProfileList(profiles: ConfigProfile[]): string {
    const lines: string[] = ['**Mevcut Profiller:**', ''];

    for (const profile of profiles) {
      lines.push(`${profile.emoji} **${profile.displayName}** - ${profile.description}`);
    }

    return lines.join('\n');
  }
}
