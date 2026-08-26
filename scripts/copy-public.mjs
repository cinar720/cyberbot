import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const src = join(__dirname, '..', 'src', 'web', 'public');
const dest = join(__dirname, '..', 'dist', 'web', 'public');

if (!existsSync(src)) {
  console.error('Kaynak dizin bulunamadı:', src);
  process.exit(1);
}

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
}

cpSync(src, dest, { recursive: true });
console.log('Static assets kopyalandı:', dest);
