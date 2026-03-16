import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HEROES_DIR = path.resolve('data/mlbb-refined/heroes');
const BACKEND_DATA_DIR = path.resolve('..', 'mlcompanion-backend', 'src', 'main', 'resources', 'data', 'wiki');
const BUNDLE_FILE = path.join(BACKEND_DATA_DIR, 'heroes.bundle.json');
const FALLBACK_FILE = path.join(BACKEND_DATA_DIR, 'hero-image-fallbacks.json');

const CONCURRENCY = 6;

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

async function fetchAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const type = response.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${type};base64,${buffer.toString('base64')}`;
}

async function mapWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

async function run() {
  const files = fs
    .readdirSync(HEROES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const version = buildVersion(files);
  const generatedAt = new Date().toISOString();

  const heroes = files.map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(HEROES_DIR, file), 'utf8'));
    return normalizeHero(raw, file);
  });

  const bundlePayload = {
    version,
    generatedAt,
    total: heroes.length,
    heroes,
  };

  const candidateUrls = new Set();
  for (const hero of heroes) {
    if (hero.icon) candidateUrls.add(hero.icon);
    if (hero.portrait) candidateUrls.add(hero.portrait);
  }

  const urls = [...candidateUrls];
  let okCount = 0;
  let failCount = 0;
  const fallbackEntries = await mapWithConcurrency(
    urls,
    async (url) => {
      try {
        const dataUrl = await fetchAsDataUrl(url);
        okCount += 1;
        return [url, dataUrl];
      } catch (error) {
        failCount += 1;
        console.warn(`[hero-fallback] skip ${url}: ${String(error)}`);
        return null;
      }
    },
    CONCURRENCY,
  );

  const images = Object.fromEntries(fallbackEntries.filter(Boolean));
  const fallbackPayload = {
    version,
    generatedAt,
    total: Object.keys(images).length,
    images,
  };

  fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
  fs.writeFileSync(BUNDLE_FILE, JSON.stringify(bundlePayload));
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackPayload));

  console.log(`[backend-heroes] bundle heroes: ${heroes.length}`);
  console.log(`[backend-heroes] fallback images: ${okCount} ok, ${failCount} fail`);
  console.log(`[backend-heroes] version: ${version}`);
  console.log(`[backend-heroes] wrote: ${BUNDLE_FILE}`);
  console.log(`[backend-heroes] wrote: ${FALLBACK_FILE}`);
}

run();
