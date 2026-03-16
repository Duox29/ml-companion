#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DOCS_SITE = "https://mlbb-stats-docs.rone.dev";
const DOCS_DISCOVERY_URL = `${DOCS_SITE}/docs`;
const DOCS_EXAMPLE_ROOT = `${DOCS_SITE}/docs/example-usage`;
const GROUPS = ["mlbb-data", "academy-data", "mplid-data"];
const DEFAULT_API_BASE = "https://mlbb-stats.rone.dev";

const REQUIRED_HERO_TEMPLATES = [
  "/api/hero-detail/{hero}/",
  "/api/hero-detail-stats/{hero}/",
  "/api/hero-skill-combo/{hero}/",
  "/api/hero-compatibility/{hero}/",
];

function parseArgs(argv) {
  const args = {
    outDir: "data/mlbb",
    concurrency: 6,
    heroLimit: null,
    includeGlobal: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--out-dir" && argv[i + 1]) {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--concurrency" && argv[i + 1]) {
      args.concurrency = Number(argv[i + 1]) || args.concurrency;
      i += 1;
      continue;
    }
    if (token === "--hero-limit" && argv[i + 1]) {
      args.heroLimit = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--skip-global") {
      args.includeGlobal = false;
    }
  }

  return args;
}

function normalizeEndpoint(raw) {
  if (!raw || !raw.startsWith("/api/")) return null;
  let endpoint = raw.trim();
  endpoint = endpoint.replace(/[),.;"'`]+$/g, "");
  endpoint = endpoint.replace(/\/{2,}/g, "/");
  if (!endpoint.startsWith("/api/")) return null;
  return endpoint;
}

function toTemplateFromEndpoint(endpoint) {
  if (!endpoint) return null;
  if (endpoint.includes("<") && endpoint.includes(">")) {
    const templated = endpoint.replace(/<[^>]+>/g, "{hero}");
    return normalizeEndpoint(templated)?.replace(/\/?$/, "/");
  }

  const heroDynamic = endpoint.match(
    /^\/api\/(hero-(?:detail|detail-stats|skill-combo|compatibility|counter|relation|rate))\/([^/]+)\/?$/i,
  );

  if (heroDynamic) {
    const [, prefix, value] = heroDynamic;
    const isLikelyExample =
      /^\d+$/.test(value) ||
      /^[a-z][a-z0-9\-]*$/i.test(value);
    if (isLikelyExample) {
      return `/api/${prefix}/{hero}/`;
    }
  }

  return null;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "unknown";
}

async function fetchText(url, { allowNonOk = false } = {}) {
  const res = await fetch(url);
  if (!res.ok && !allowNonOk) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    body: parsed,
  };
}

function extractSlugs(rootHtml) {
  const slugs = new Set();

  const escapedMatches = rootHtml.matchAll(
    /\\"title\\":\\"GET [^\\"]+\\",\\"href\\":\\"\/([a-z0-9-]+)\\"/g,
  );
  for (const m of escapedMatches) {
    slugs.add(m[1]);
  }

  const plainMatches = rootHtml.matchAll(
    /"title":"GET [^"]+","href":"\/([a-z0-9-]+)"/g,
  );
  for (const m of plainMatches) {
    slugs.add(m[1]);
  }

  return Array.from(slugs);
}

async function resolveDocPages(slugs) {
  const pages = [];
  for (const slug of slugs) {
    let found = null;
    for (const group of GROUPS) {
      const docsUrl = `${DOCS_EXAMPLE_ROOT}/${group}/${slug}`;
      try {
        const html = await fetchText(docsUrl);
        const hasGetTitle = /<title>GET [^<]+<\/title>/i.test(html);
        const notFound = /NEXT_NOT_FOUND/i.test(html);
        if (hasGetTitle && !notFound) {
          found = { slug, group, docsUrl, html };
          break;
        }
      } catch {
        // Ignore and keep trying
      }
    }
    if (found) pages.push(found);
  }
  return pages;
}

function extractEndpointsFromPage(html) {
  const normalizedHtml = html
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

  const matches = normalizedHtml.matchAll(
    /\/api\/[a-z0-9_-]+(?:\/(?:[a-z0-9_-]+|<[a-z0-9:_-]+>))*\/?/gi,
  );
  const endpoints = new Set();
  for (const m of matches) {
    const normalized = normalizeEndpoint(m[0]);
    if (normalized) endpoints.add(normalized);
  }
  return Array.from(endpoints);
}

function extractApiBasesFromPage(html) {
  const matches = html.matchAll(/https?:\/\/[^"'<>\s]+\/api\/[a-zA-Z0-9_\/%\-]+/g);
  const bases = new Set();
  for (const m of matches) {
    try {
      const parsed = new URL(m[0]);
      bases.add(`${parsed.protocol}//${parsed.host}`);
    } catch {
      // Ignore malformed URL
    }
  }
  return Array.from(bases);
}

async function runPool(items, worker, concurrency) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next === undefined) return;
      // eslint-disable-next-line no-await-in-loop
      await worker(next);
    }
  });
  await Promise.all(workers);
}

function parseHeroesFromList(heroListBody) {
  const records = heroListBody?.data?.records;
  if (!Array.isArray(records)) return [];

  const heroes = [];
  for (const entry of records) {
    const heroId =
      entry?.data?.hero_id ??
      entry?.hero_id ??
      entry?.id ??
      null;
    const heroName =
      entry?.data?.hero?.data?.name ??
      entry?.hero?.data?.name ??
      entry?.name ??
      null;
    if (heroId !== null && heroName) {
      heroes.push({ id: heroId, name: heroName });
    }
  }
  return heroes;
}

async function requestHeroEndpoint(apiBase, template, hero) {
  const candidates = [
    String(hero.id),
    hero.name,
    hero.name.toLowerCase(),
    slugify(hero.name),
  ];

  for (const candidate of candidates) {
    const endpoint = template.replace("{hero}", encodeURIComponent(candidate));
    const url = `${apiBase}${endpoint}`;
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchJson(url);
    if (response.ok) {
      return {
        ok: true,
        endpoint,
        url,
        paramUsed: candidate,
        response,
      };
    }
  }

  const endpoint = template.replace("{hero}", encodeURIComponent(String(hero.id)));
  const url = `${apiBase}${endpoint}`;
  const response = await fetchJson(url);
  return {
    ok: false,
    endpoint,
    url,
    paramUsed: String(hero.id),
    response,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootHtml = await fetchText(DOCS_DISCOVERY_URL, { allowNonOk: true });
  const slugs = extractSlugs(rootHtml);
  const pages = await resolveDocPages(slugs);

  const docsEndpoints = new Map();
  const apiBases = new Set();

  for (const page of pages) {
    const endpoints = extractEndpointsFromPage(page.html);
    docsEndpoints.set(page.slug, {
      slug: page.slug,
      group: page.group,
      docsUrl: page.docsUrl,
      endpoints,
    });
    for (const base of extractApiBasesFromPage(page.html)) {
      apiBases.add(base);
    }
  }

  const apiBase = Array.from(apiBases)[0] ?? DEFAULT_API_BASE;
  const heroTemplates = new Set(REQUIRED_HERO_TEMPLATES);
  const staticEndpoints = new Set();
  const skippedDynamicTemplates = new Set();

  for (const entry of docsEndpoints.values()) {
    for (const endpoint of entry.endpoints) {
      const template = toTemplateFromEndpoint(endpoint);
      if (template) {
        if (entry.slug.startsWith("get-hero-")) {
          heroTemplates.add(template);
        } else {
          skippedDynamicTemplates.add(template);
        }
        continue;
      }
      staticEndpoints.add(endpoint);
    }
  }

  if (!staticEndpoints.has("/api/hero-list/")) {
    staticEndpoints.add("/api/hero-list/");
  }

  const outRoot = path.resolve(process.cwd(), args.outDir);
  const heroesDir = path.join(outRoot, "heroes");
  const metaDir = path.join(outRoot, "_meta");
  await mkdir(heroesDir, { recursive: true });
  await mkdir(metaDir, { recursive: true });

  const globalResults = {};
  if (args.includeGlobal) {
    for (const endpoint of Array.from(staticEndpoints).sort()) {
      const url = `${apiBase}${endpoint}`;
      // eslint-disable-next-line no-await-in-loop
      const result = await fetchJson(url);
      globalResults[endpoint] = {
        url,
        ok: result.ok,
        status: result.status,
        body: result.body,
      };
    }
  }

  let heroListBody = globalResults["/api/hero-list/"]?.body ?? null;
  if (!heroListBody) {
    const fallbackList = await fetchJson(`${apiBase}/api/hero-list/`);
    heroListBody = fallbackList.body;
  }

  let heroes = parseHeroesFromList(heroListBody);
  if (args.heroLimit && Number.isFinite(args.heroLimit) && args.heroLimit > 0) {
    heroes = heroes.slice(0, args.heroLimit);
  }

  const heroTemplateList = Array.from(heroTemplates).sort();
  const heroIndex = [];
  await runPool(
    heroes,
    async (hero) => {
      const dataByTemplate = {};
      for (const template of heroTemplateList) {
        // eslint-disable-next-line no-await-in-loop
        const result = await requestHeroEndpoint(apiBase, template, hero);
        dataByTemplate[template] = {
          ok: result.ok,
          endpoint: result.endpoint,
          url: result.url,
          paramUsed: result.paramUsed,
          status: result.response.status,
          body: result.response.body,
        };
      }

      const fileSlug = `${String(hero.id).padStart(3, "0")}-${slugify(hero.name)}`;
      const fileName = `${fileSlug}.json`;
      const output = {
        hero: {
          id: hero.id,
          name: hero.name,
        },
        source: {
          apiBase,
          generatedAt: new Date().toISOString(),
        },
        data: dataByTemplate,
      };

      await writeFile(
        path.join(heroesDir, fileName),
        `${JSON.stringify(output, null, 2)}\n`,
        "utf8",
      );

      heroIndex.push({
        id: hero.id,
        name: hero.name,
        file: `heroes/${fileName}`,
      });
      process.stdout.write(`Crawled hero ${hero.id} - ${hero.name}\n`);
    },
    args.concurrency,
  );

  const docsMeta = {
    docsDiscoveryUrl: DOCS_DISCOVERY_URL,
    docsExampleRoot: DOCS_EXAMPLE_ROOT,
    discoveredAt: new Date().toISOString(),
    totalSlugs: slugs.length,
    resolvedPages: pages.length,
    endpointsBySlug: Array.from(docsEndpoints.values()),
  };

  const globalMeta = {
    apiBase,
    crawledAt: new Date().toISOString(),
    endpoints: globalResults,
  };

  const indexMeta = {
    apiBase,
    generatedAt: new Date().toISOString(),
    heroCount: heroIndex.length,
    heroTemplates: heroTemplateList,
    skippedDynamicTemplates: Array.from(skippedDynamicTemplates).sort(),
    heroes: heroIndex.sort((a, b) => Number(b.id) - Number(a.id)),
  };

  await Promise.all([
    writeFile(path.join(metaDir, "docs-endpoints.json"), `${JSON.stringify(docsMeta, null, 2)}\n`, "utf8"),
    writeFile(path.join(metaDir, "global-endpoints.json"), `${JSON.stringify(globalMeta, null, 2)}\n`, "utf8"),
    writeFile(path.join(metaDir, "index.json"), `${JSON.stringify(indexMeta, null, 2)}\n`, "utf8"),
  ]);

  process.stdout.write(`Done. Output written to: ${outRoot}\n`);
}

main().catch((error) => {
  console.error("Crawler failed:", error);
  process.exitCode = 1;
});
