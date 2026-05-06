import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const builtHtml = join(dist, 'app.html');
const pagesHtml = join(root, 'index.html');
const distAssets = join(dist, 'assets');
const pagesAssets = join(root, 'assets');

if (!existsSync(builtHtml)) {
  throw new Error('Expected dist/app.html to exist after vite build.');
}

copyFileSync(builtHtml, pagesHtml);

if (existsSync(pagesAssets)) {
  rmSync(pagesAssets, { recursive: true, force: true });
}

mkdirSync(pagesAssets, { recursive: true });
cpSync(distAssets, pagesAssets, { recursive: true });

console.log('Synced GitHub Pages static files to index.html and assets/.');
