import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REST, Routes } from 'discord.js';

const root = fileURLToPath(new URL('../dist/commands/', import.meta.url));
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) await collect(filePath);
    else if (entry.name.endsWith('.js')) files.push(filePath);
  }
}

await collect(root);
const commands = [];
const names = new Set();
for (const filePath of files.sort()) {
  const command = (await import(pathToFileURL(filePath).href)).default;
  if (command?.metadata?.enabled === false) continue;
  if (!command?.data || typeof command.execute !== 'function') continue;
  const name = command.metadata?.name || command.data.name;
  if (names.has(name)) throw new Error(`Duplicate command: ${name}`);
  names.add(name);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const result = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
console.log(`Registered ${result.length} global commands.`);
console.log(`Invite command present: ${commands.some((command) => command.name === 'davet')}`);
