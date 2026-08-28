import { Client, Guild, GuildMember, VoiceBasedChannel } from 'discord.js';
import { Player, GuildQueue, Track } from 'discord-player';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('MUSIC');

export class MusicService {
  private static instance: MusicService;
  private player: Player;
  private queues: Map<string, GuildQueue> = new Map();

  private constructor(client: Client) {
    this.player = new Player(client as never);
  }

  static getInstance(client?: Client): MusicService {
    if (!MusicService.instance) {
      if (!client) throw new Error('Client ilk kez başlatılırken gereklidir.');
      MusicService.instance = new MusicService(client);
      log.info('MusicService başlatıldı.');
    }
    return MusicService.instance;
  }

  getPlayer(): Player {
    return this.player;
  }

  async play(
    guild: Guild,
    channel: VoiceBasedChannel,
    query: string,
    member: GuildMember,
  ): Promise<{ track: Track; queue: GuildQueue }> {
    const queue = this.player.nodes.create(guild as never, {
      metadata: {
        channel,
        client: guild.client,
        requestedBy: member,
      },
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 30000,
      leaveOnEnd: true,
      leaveOnEndCooldown: 30000,
      volume: 80,
    });

    if (!queue.connection) {
      await queue.connect(channel as never);
    }

    const result = await this.player.search(query, {
      requestedBy: member as never,
    });

    if (result.isEmpty()) {
      throw new Error('Sonuç bulunamadı.');
    }

    queue.addTrack(result.tracks[0] as never);

    if (!queue.isPlaying()) {
      await queue.node.play();
    }

    this.queues.set(guild.id, queue);
    return { track: result.tracks[0] as Track, queue };
  }

  stop(guild: Guild): void {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.node.stop();
      queue.delete();
      this.queues.delete(guild.id);
    }
  }

  skip(guild: Guild): Track | null {
    const queue = this.queues.get(guild.id);
    if (queue) {
      const currentTrack = queue.currentTrack;
      queue.node.skip();
      return currentTrack as Track | null;
    }
    return null;
  }

  pause(guild: Guild): boolean {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.node.pause();
      return true;
    }
    return false;
  }

  resume(guild: Guild): boolean {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.node.resume();
      return true;
    }
    return false;
  }

  getQueue(guild: Guild): GuildQueue | undefined {
    return this.queues.get(guild.id);
  }

  getQueueByGuildId(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  nowPlaying(guild: Guild): Track | null {
    const queue = this.queues.get(guild.id);
    if (queue) {
      return queue.currentTrack as Track | null;
    }
    return null;
  }

  volume(guild: Guild, level: number): boolean {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.node.setVolume(level);
      return true;
    }
    return false;
  }

  shuffle(guild: Guild): boolean {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.tracks.shuffle();
      return true;
    }
    return false;
  }

  remove(guild: Guild, index: number): Track | null {
    const queue = this.queues.get(guild.id);
    if (queue) {
      const track = queue.tracks.at(index);
      if (track) {
        queue.removeTrack(track);
        return track as Track;
      }
    }
    return null;
  }

  clear(guild: Guild): void {
    const queue = this.queues.get(guild.id);
    if (queue) {
      queue.tracks.clear();
    }
  }

  async getQueueFromDb(guildId: string) {
    const db = getPrisma();
    return db.musicQueue.findMany({
      where: { guildId },
      orderBy: { position: 'asc' },
    });
  }

  async saveQueue(guildId: string, tracks: Track[], requestedBy: string) {
    const db = getPrisma();
    await db.musicQueue.deleteMany({ where: { guildId } });
    await db.musicQueue.createMany({
      data: tracks.map((track, index) => ({
        guildId,
        title: track.title,
        url: track.url,
        duration: track.duration,
        requestedBy,
        position: index,
      })),
    });
  }
}
