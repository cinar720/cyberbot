import { cpSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'src', 'web', 'public');
const dest = join(__dirname, '..', 'dist', 'web', 'public');

if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log('Static assets copied:', dest);
}
