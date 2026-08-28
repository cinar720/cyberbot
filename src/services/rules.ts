import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  type Client,
  type TextChannel,
  type Message,
} from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getEnv } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('RULES');

const DATA_DIR = join(process.cwd(), 'data');
const RULES_MESSAGE_FILE = join(DATA_DIR, 'rules-message-id.json');

interface RulesMessageData {
  channelId: string;
  messageId: string;
}

async function loadRulesMessageData(): Promise<RulesMessageData | null> {
  try {
    if (!existsSync(RULES_MESSAGE_FILE)) return null;
    const raw = await readFile(RULES_MESSAGE_FILE, 'utf-8');
    return JSON.parse(raw) as RulesMessageData;
  } catch {
    return null;
  }
}

async function saveRulesMessageData(data: RulesMessageData): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(RULES_MESSAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    log.error(
      'Failed to save rules message data: %s',
      error instanceof Error ? error.message : String(error),
    );
  }
}

function buildRulesContainer(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# CyberBOT Support Kuralları'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          'Bu sunucu, **CyberBOT** resmi destek sunucusudur.',
          'Sunucuya katılan her kişi aşağıdaki kurallara uymakla yükümlüdür.',
          '',
          '## 1. Genel Kurallar',
          '• Saygılı ve medeni davranın; hakaret, küfür, tehdit ve taciz kesinlikle yasaktır.',
          '• Kişisel bilgi paylaşımı (doxxing) yapmayın; başkalarının gizliliğini ihlal etmeyin.',
          '• Cinsel içerikli paylaşımlar ve 18 yaş altı içerik paylaşımı yasaktır.',
          '',
          '## 2. Spam ve Flood',
          '• Aynı mesajı tekrar tekrar göndermeyin.',
          '• Çoklu hesapla sunucu kurallarını aşmaya çalışmayın.',
          '• Otomatik mesaj gönderen araçlar kullanmayın.',
          '',
          '## 3. Reklam ve Tanıtım',
          '• Başka botların davet bağlantılarını paylaşmak yasaktır.',
          '• Başka Discord sunucularının reklamını yapmayın.',
          '• İzinsiz web sitesi, uygulama veya ürün tanıtımı yapmayın.',
          '• Kendi sunucunuzu tanıtmak için yöneticilerden izin alın.',
          '',
          '## 4. Zararlı İçerik',
          '• Phishing, malware veya zararlı bağlantı paylaşmayın.',
          '• Discord hesap çalma, token toplama gibi aktivitelere katılmayın.',
          '• Raid veya sunucu saldırı girişimlerinde bulunmayın.',
          '',
          '## 5. Yetkili Taklidi',
          '• Yetkili gibi davranmayın veya taklit etmeyin.',
          '• Yetkili rollerini sahte olarak oluşturmayın veya kullanmayın.',
          '',
          '## 6. Ticket ve Premium Sistemleri',
          '• Ticket sistemini gereksiz yere meşgul etmeyin.',
          '• Premium veya oylama sistemlerini manipüle etmeyin.',
          '',
          '## 7. Uyum',
          '• Discord Hizmet Şartları ve Topluluk Kuralları bu sunucuda da geçerlidir.',
          '• Kurallara uymayan üyeler uyarı, susturma veya yasaklama ile karşılaşabilir.',
          '• Kurallar güncellenebilir; güncellemeleri takip etmek üyelerin sorumluluğundadır.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Son güncelleme: <t:${Math.floor(Date.now() / 1000)}:F>`),
    );
}

export async function setupRules(client: Client): Promise<void> {
  const env = getEnv();

  if (!env.SUPPORT_GUILD_ID || !env.RULES_CHANNEL_ID) {
    log.warn('SUPPORT_GUILD_ID or RULES_CHANNEL_ID not set. Rules setup skipped.');
    return;
  }

  let guild;
  try {
    guild = await client.guilds.fetch(env.SUPPORT_GUILD_ID);
  } catch {
    log.warn('Support guild not found.');
    return;
  }

  let channel: TextChannel;
  try {
    const fetched = await guild.channels.fetch(env.RULES_CHANNEL_ID);
    if (!fetched || !fetched.isTextBased()) {
      log.warn('Rules channel not found or not text-based.');
      return;
    }
    channel = fetched as TextChannel;
  } catch {
    log.warn('Failed to fetch rules channel.');
    return;
  }

  const botMember = await guild.members.fetch(client.user!.id).catch(() => null);
  if (!botMember) {
    log.warn('Bot member not found in support guild.');
    return;
  }

  const permissions = channel.permissionsFor(botMember);
  if (!permissions?.has('SendMessages') || !permissions.has('ViewChannel')) {
    log.warn('Bot lacks permissions in rules channel.');
    return;
  }

  const existingData = await loadRulesMessageData();

  if (existingData && existingData.channelId === env.RULES_CHANNEL_ID) {
    try {
      const existingMessage = await channel.messages.fetch(existingData.messageId);
      if (existingMessage && existingMessage.author.id === client.user!.id) {
        await existingMessage.edit({
          components: [buildRulesContainer()],
          flags: 32768,
        });
        log.info('Rules message updated.');
        return;
      }
    } catch {
      log.info('Existing rules message not found. Creating new one.');
    }
  }

  try {
    const message: Message = await channel.send({
      components: [buildRulesContainer()],
      flags: 32768,
    });

    await saveRulesMessageData({
      channelId: env.RULES_CHANNEL_ID,
      messageId: message.id,
    });

    log.info('Rules message created.');
  } catch (error) {
    log.error(
      'Failed to send rules message: %s',
      error instanceof Error ? error.message : String(error),
    );
  }
}
