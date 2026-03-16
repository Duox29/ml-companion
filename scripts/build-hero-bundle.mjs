import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HEROES_DIR = path.resolve('data/mlbb-refined/heroes');
const OUTPUT_DIR = path.resolve('src/data/wiki');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'heroes.bundle.json');

function toSlug(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeHero(raw, filename) {
  const fileSlug = filename
    .replace(/^\d+-/, '')
    .replace(/\.json$/i, '')
    .toLowerCase();

  return {
    ...raw,
    id: String(raw.id),
    slug: fileSlug || toSlug(raw.name),
  };
}

function buildVersion(files) {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const content = fs.readFileSync(path.join(HEROES_DIR, file), 'utf8');
    hash.update(file);
    hash.update(content);
  }
  return `heroes-${hash.digest('hex').slice(0, 12)}`;
}

function run() {
  const files = fs
    .readdirSync(HEROES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const heroes = files.map((file) => {
    const fullPath = path.join(HEROES_DIR, file);
    const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return normalizeHero(raw, file);
  });

  const payload = {
    version: buildVersion(files),
    generatedAt: new Date().toISOString(),
    total: heroes.length,
    heroes,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload));

  console.log(`[heroes-bundle] Built ${heroes.length} heroes -> ${OUTPUT_FILE}`);
  console.log(`[heroes-bundle] Version: ${payload.version}`);
}

run();
