import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../src/commands/', import.meta.url));
const failures = [];
const commands = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(filePath);
    else if (entry.name.endsWith('.ts')) commands.push(filePath);
  }
}

await collectFiles(root);
const names = new Map();
const activeByCategory = new Map();

for (const filePath of commands.sort()) {
  const label = relative(process.cwd(), filePath);
  try {
    const module = await import(pathToFileURL(filePath).href);
    const command = module.default ?? module;
    const name = command?.metadata?.name;

    if (!name || !command.data || typeof command.execute !== 'function') {
      throw new Error('metadata.name, data veya execute eksik');
    }

    if (names.has(name)) {
      throw new Error(`duplicate command name: ${name} (${names.get(name)})`);
    }

    const json = command.data.toJSON();
    if (json.name !== name) {
      throw new Error(`metadata/data name mismatch: ${name} != ${json.name}`);
    }

    names.set(name, label);
    if (command.metadata.enabled !== false) {
      const category = command.metadata.category || 'unknown';
      activeByCategory.set(category, (activeByCategory.get(category) || 0) + 1);
    }
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`Validated command modules: ${commands.length}`);
console.log(`Unique slash commands: ${names.size}`);
console.log(`Active slash commands: ${[...activeByCategory.values()].reduce((sum, count) => sum + count, 0)}`);
console.log(`Active by category: ${JSON.stringify(Object.fromEntries(activeByCategory))}`);
if (failures.length) {
  console.error(`Failures: ${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('All command modules loaded and schemas validated.');
}
