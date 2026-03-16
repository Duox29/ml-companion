#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    inputDir: "data/mlbb/heroes",
    outputDir: "data/mlbb-refined/heroes",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input" && argv[i + 1]) {
      args.inputDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--output" && argv[i + 1]) {
      args.outputDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanStringArray(value) {
  return asArray(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function extractHeroDetail(raw) {
  const node = raw?.data?.["/api/hero-detail/{hero}/"]?.body?.data?.records?.[0]?.data ?? {};
  const heroData = node?.hero?.data ?? {};

  const skills = asArray(heroData.heroskilllist)
    .flatMap((group) => asArray(group?.skilllist))
    .map((skill) => ({
      id: toNumberOrNull(skill?.skillid),
      name: stringOrEmpty(skill?.skillname),
      icon: stringOrEmpty(skill?.skillicon),
      cooldown_cost: stringOrEmpty(skill?.["skillcd&cost"]),
      tags: cleanStringArray(skill?.skilltag),
      description: stringOrEmpty(skill?.skilldesc),
      video: stringOrEmpty(skill?.skillvideo),
    }));

  const skins = asArray(heroData.heroskin).map((skin) => ({
    id: toNumberOrNull(skin?.id ?? skin?.skinid),
    name: stringOrEmpty(skin?.name ?? skin?.skinname),
    icon: stringOrEmpty(skin?.icon ?? skin?.head ?? skin?.portrait),
  }));

  return {
    id: toNumberOrNull(heroData.heroid) ?? toNumberOrNull(node.hero_id) ?? toNumberOrNull(raw?.hero?.id) ?? 0,
    name: stringOrEmpty(heroData.name) || stringOrEmpty(raw?.hero?.name),
    icon: stringOrEmpty(heroData.head) || stringOrEmpty(node.head),
    portrait: stringOrEmpty(heroData.painting) || stringOrEmpty(node.painting) || stringOrEmpty(node.head_big),
    role: cleanStringArray(heroData.sortlabel),
    lane: cleanStringArray(heroData.roadsortlabel),
    specialty: cleanStringArray(heroData.speciality),
    lore: {
      story: stringOrEmpty(heroData.story),
      tale: stringOrEmpty(heroData.tale),
    },
    skill: skills,
    skin: skins,
    quote: {
      select: stringOrEmpty(heroData?.quotes?.select ?? heroData?.quote?.select),
      movement: cleanStringArray(heroData?.quotes?.movement ?? heroData?.quote?.movement),
      ultimate: stringOrEmpty(heroData?.quotes?.ultimate ?? heroData?.quote?.ultimate),
    },
    stats: {
      difficulty: toNumberOrNull(heroData.difficulty),
      ability: cleanStringArray(heroData.abilityshow).map((v) => toNumberOrNull(v)).filter((v) => v !== null),
    },
  };
}

function extractRateStats(raw) {
  const heroRateRecords = asArray(raw?.data?.["/api/hero-rate/{hero}/"]?.body?.data?.records).map((record) => {
    const d = record?.data ?? {};
    return {
      rank: stringOrEmpty(d.bigrank),
      camp_type: stringOrEmpty(d.camp_type),
      match_type: stringOrEmpty(d.match_type),
      win_rate: toNumberOrNull(d.win_rate),
    };
  });

  const detailStatsRecords = asArray(raw?.data?.["/api/hero-detail-stats/{hero}/"]?.body?.data?.records).map((record) => {
    const d = record?.data ?? {};
    return {
      rank: stringOrEmpty(d.bigrank),
      camp_type: stringOrEmpty(d.camp_type),
      match_type: stringOrEmpty(d.match_type),
      appearance_rate: toNumberOrNull(d.main_hero_appearance_rate),
      ban_rate: toNumberOrNull(d.main_hero_ban_rate),
      win_rate: toNumberOrNull(d.main_hero_win_rate),
    };
  });

  return {
    hero_rate: heroRateRecords,
    detail_stats: detailStatsRecords,
  };
}

function extractSkillCombo(raw) {
  const records = asArray(raw?.data?.["/api/hero-skill-combo/{hero}/"]?.body?.data?.records);
  return records.map((record) => {
    const d = record?.data ?? {};
    return {
      skill_id: toNumberOrNull(d.skill_id),
      title: stringOrEmpty(d.title),
      description: stringOrEmpty(d.desc),
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(process.cwd(), args.inputDir);
  const outputDir = path.resolve(process.cwd(), args.outputDir);
  const metaDir = path.resolve(path.dirname(outputDir), "_meta");

  await mkdir(outputDir, { recursive: true });
  await mkdir(metaDir, { recursive: true });

  const files = (await readdir(inputDir)).filter((file) => file.endsWith(".json")).sort();
  const index = [];

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    const raw = JSON.parse(await readFile(inputPath, "utf8"));

    const refined = extractHeroDetail(raw);
    const rateStats = extractRateStats(raw);
    const skillCombo = extractSkillCombo(raw);

    const output = {
      id: refined.id,
      name: refined.name,
      icon: refined.icon,
      portrait: refined.portrait,
      role: refined.role,
      lane: refined.lane,
      specialty: refined.specialty,
      lore: refined.lore,
      skill: refined.skill,
      stats: {
        difficulty: refined.stats.difficulty,
        ability: refined.stats.ability,
        hero_rate: rateStats.hero_rate,
        detail_stats: rateStats.detail_stats,
      },
      skin: refined.skin,
      quote: refined.quote,
      skill_combo: skillCombo,
    };

    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    index.push({
      id: output.id,
      name: output.name,
      file: `heroes/${file}`,
    });
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    sourceDir: inputDir,
    outputDir,
    totalHeroes: index.length,
    heroes: index.sort((a, b) => Number(a.id) - Number(b.id)),
  };

  await writeFile(path.join(metaDir, "index.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  process.stdout.write(`Refined ${index.length} heroes -> ${outputDir}\n`);
}

main().catch((error) => {
  console.error("Refine failed:", error);
  process.exitCode = 1;
});

