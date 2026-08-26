import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { main } from '../../config/main.js';
import { colors } from '../../config/colors.js';
import { isPremiumCommand } from '../../config/premium.js';
import type { SlashCommand, CyberBotClient } from '../../types/command.js';

const helpPrefix = 'cyberbot:help';
const categoryInfo: Record<string, { name: string; description: string }> = {
  moderation: { name: 'Moderasyon', description: 'Sunucu moderasyonu için komutlar.' },
  utility: { name: 'Yardımcı', description: 'Yardımcı araçlar ve kurulum.' },
  information: { name: 'Bilgi', description: 'Bilgi komutları.' },
  message: { name: 'Mesaj', description: 'Mesaj yönetimi için komutlar.' },
  member: { name: 'Üye', description: 'Üye yönetimi için komutlar.' },
  developer: { name: 'Geliştirici', description: 'Geliştirici komutları.' },
  premium: { name: 'Premium', description: 'Premium özellikler.' },
};

function isDeveloper(userId: string): boolean {
  return userId === main.ownerId || main.developerIds.includes(userId);
}

function isActiveCommand(cmd: SlashCommand): boolean {
  return cmd.metadata.enabled !== false;
}

function isPremiumCmd(cmd: SlashCommand): boolean {
  return isPremiumCommand(cmd.metadata.name);
}

function getActiveCommands(client: CyberBotClient): SlashCommand[] {
  return Array.from(client.slashCommands.values()).filter(isActiveCommand);
}

function getCommandsByCategory(client: CyberBotClient, category: string): SlashCommand[] {
  return getActiveCommands(client).filter((cmd) => {
    if (category === 'premium') return isPremiumCmd(cmd);
    if (category === 'developer') return cmd.metadata.category === 'developer';
    return cmd.metadata.category === category && !isPremiumCmd(cmd);
  });
}

function buildCategoryOptions(client: CyberBotClient, userIsDeveloper: boolean) {
  return Object.entries(categoryInfo)
    .filter(([key]) => {
      if (key === 'developer') return userIsDeveloper;
      return getCommandsByCategory(client, key).length > 0;
    })
    .map(([key, info]) => ({
      label: info.name,
      description: info.description,
      value: key,
    }));
}

function buildHomeContainer(client: CyberBotClient, userIsDeveloper: boolean, userId: string): ContainerBuilder {
  const activeCommands = getActiveCommands(client);
  const totalActive = activeCommands.length;

  const container = new ContainerBuilder().setAccentColor(colors.info);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${main.botName}`),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Toplam **${totalActive}** aktif komut bulunmaktadır.\n` +
        `Aşağıdaki menüden bir kategori seçerek komutları görüntüleyebilirsiniz.\n\n` +
        `Detaylı bilgi için: \`/help komut:<komut-adı>\``,
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const categoryEntries = Object.entries(categoryInfo).filter(([key]) => {
    if (key === 'developer') return userIsDeveloper;
    return getCommandsByCategory(client, key).length > 0;
  });

  const categorySummaries = categoryEntries
    .map(([key, info]) => {
      const count = getCommandsByCategory(client, key).length;
      return `**${info.name}** - ${count} komut`;
    })
    .join('\n');

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(categorySummaries));

  const options = buildCategoryOptions(client, userIsDeveloper);

  if (options.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${helpPrefix}:category:${userId}`)
          .setPlaceholder('Bir kategori seçin...')
          .addOptions(options),
      ),
    );
  }

  return container;
}

function buildCategoryContainer(
  client: CyberBotClient,
  category: string,
  userIsDeveloper: boolean,
  userId: string,
): ContainerBuilder {
  const info = categoryInfo[category]!;
  const commands = getCommandsByCategory(client, category);

  const container = new ContainerBuilder().setAccentColor(colors.info);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${info.name}`),
  );

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info.description));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  if (commands.length > 0) {
    const commandList = commands
      .map((cmd) => {
        const premiumLabel = isPremiumCmd(cmd) ? ' [Premium]' : '';
        return `\`/${cmd.metadata.name}\` - ${cmd.metadata.description}${premiumLabel}`;
      })
      .join('\n');

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(commandList));
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Bu kategoride henüz komut yok.'),
    );
  }

  if (category === 'premium') {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Premium bilgisi**\nPremium komutlarını kullanmak için üyelik gereklidir.\nDurumunuzu kontrol etmek için: \`/premium\``,
      ),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**${commands.length}** komut`),
  );

  const options = buildCategoryOptions(client, userIsDeveloper);

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${helpPrefix}:category:${userId}`)
        .setPlaceholder('Bir kategori seçin...')
        .addOptions(options),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${helpPrefix}:home:${userId}`)
        .setLabel('Ana menü')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

function buildCommandDetailContainer(
  client: CyberBotClient,
  commandName: string,
  userIsDeveloper: boolean,
  userId: string,
): { container: ContainerBuilder; error?: string } {
  const cmd = client.slashCommands.get(commandName);

  if (!cmd) {
    return { container: new ContainerBuilder(), error: `"${commandName}" adlı komut bulunamadı.` };
  }

  if (!isActiveCommand(cmd)) {
    return { container: new ContainerBuilder(), error: 'Bu komut şu anda devre dışıdır.' };
  }

  if (cmd.metadata.category === 'developer' && !userIsDeveloper) {
    return { container: new ContainerBuilder(), error: 'Bu komutu görmeye yetkiniz yok.' };
  }

  const info = categoryInfo[cmd.metadata.category] ?? categoryInfo.utility!;
  const premium = isPremiumCmd(cmd);

  const container = new ContainerBuilder().setAccentColor(colors.info);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# /${cmd.metadata.name}`),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(cmd.metadata.description),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const fields: string[] = [];
  fields.push(`**Kategori:** ${info.name}`);
  fields.push(`**Sunucu gereksinimi:** ${cmd.metadata.guildOnly ? 'Evet' : 'Hayır'}`);

  if (premium) {
    fields.push('**Premium:** Bu komut premium üyelik gerektirir.');
  }

  if (cmd.metadata.permissions && cmd.metadata.permissions.length > 0) {
    fields.push(`**Gereken izinler:** ${cmd.metadata.permissions.map(String).join(', ') || 'Yok'}`);
  }

  if (cmd.metadata.botPermissions && cmd.metadata.botPermissions.length > 0) {
    fields.push(`**Bot izinleri:** ${cmd.metadata.botPermissions.map(String).join(', ') || 'Yok'}`);
  }

  if (cmd.metadata.cooldown) {
    fields.push(`**Bekleme süresi:** ${cmd.metadata.cooldown} saniye`);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fields.join('\n')));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const options = buildCategoryOptions(client, userIsDeveloper);

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${helpPrefix}:category:${userId}`)
        .setPlaceholder('Bir kategori seçin...')
        .addOptions(options),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${helpPrefix}:back:${userId}:${cmd.metadata.category}`)
        .setLabel('Geri')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${helpPrefix}:home:${userId}`)
        .setLabel('Ana menü')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { container };
}

export default {
  metadata: {
    name: 'help',
    description: 'Tüm komutları veya belirli bir komutu gösterir.',
    category: 'utility',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tüm komutları veya belirli bir komutu gösterir.')
    .addStringOption((option) =>
      option
        .setName('kategori')
        .setDescription('Görüntülenecek kategori')
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('komut')
        .setDescription('Bilgi gösterilecek komut adı')
        .setRequired(false),
    ),

  async execute({ interaction, client }) {
    const cyberClient = client as unknown as CyberBotClient;
    const selectedCategory = interaction.options.getString('kategori');
    const selectedCommand = interaction.options.getString('komut');
    const userId = interaction.user.id;
    const userIsDeveloper = isDeveloper(userId);

    if (selectedCommand) {
      const { container, error } = buildCommandDetailContainer(
        cyberClient,
        selectedCommand,
        userIsDeveloper,
        userId,
      );

      if (error) {
        const errContainer = new ContainerBuilder().setAccentColor(colors.error);
        errContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Hata\n\n${error}`),
        );
        await interaction.reply({ components: [errContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        return;
      }

      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
        fetchReply: true,
      });

      return;
    }

    if (
      selectedCategory &&
      categoryInfo[selectedCategory] &&
      (selectedCategory !== 'developer' || userIsDeveloper)
    ) {
      const container = buildCategoryContainer(cyberClient, selectedCategory, userIsDeveloper, userId);
      await interaction.reply({
        components: [container],
        flags: [MessageFlags.IsComponentsV2],
        fetchReply: true,
      });

      return;
    }

    const container = buildHomeContainer(cyberClient, userIsDeveloper, userId);
    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
      fetchReply: true,
    });

  },
} satisfies SlashCommand;

export async function handleHelpComponent(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  client: CyberBotClient,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const ownerId = parts[3];
  if (ownerId !== interaction.user.id) {
    await interaction.reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.error)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Hata\n\nBu menüyü sadece komutu kullanan kişi kullanabilir.'),
          ),
      ],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const userIsDeveloper = isDeveloper(interaction.user.id);
  if (interaction.isStringSelectMenu()) {
    const category = interaction.values[0];
    if (!category || !categoryInfo[category]) {
      await interaction.reply({
        components: [
          new ContainerBuilder()
            .setAccentColor(colors.error)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('# Hata\n\nGeçersiz kategori seçildi.'),
            ),
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }
    await interaction.update({
      components: [buildCategoryContainer(client, category, userIsDeveloper, ownerId)],
    });
    return;
  }

  const target = parts[2];
  const container = target === 'back' && parts[4] && categoryInfo[parts[4]]
    ? buildCategoryContainer(client, parts[4], userIsDeveloper, ownerId)
    : buildHomeContainer(client, userIsDeveloper, ownerId);
  await interaction.update({ components: [container] });
}
