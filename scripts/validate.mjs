#!/usr/bin/env node
/**
 * Structural CI checks for the cleanness marketplace + CLEAN skill contract.
 * No network, no LLM — safe for GitHub Actions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing file: ${rel}`);
    return null;
  }
  return fs.readFileSync(abs, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`invalid JSON ${rel}: ${err.message}`);
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function parseFrontmatter(md, rel) {
  if (!md.startsWith("---\n") && !md.startsWith("---\r\n")) {
    fail(`${rel}: missing YAML frontmatter opener`);
    return { frontmatter: {}, body: md };
  }
  const end = md.indexOf("\n---", 3);
  if (end < 0) {
    fail(`${rel}: missing YAML frontmatter closer`);
    return { frontmatter: {}, body: md };
  }
  const raw = md.slice(4, end).trim();
  const body = md.slice(end + 4).replace(/^\r?\n/, "");
  // Minimal YAML subset for our frontmatter (scalars + one nested metadata map).
  const frontmatter = {};
  let currentMap = frontmatter;
  let mapKey = null;
  let foldedKey = null;
  let foldedLines = [];

  const flushFolded = () => {
    if (foldedKey != null) {
      currentMap[foldedKey] = foldedLines.join(" ").trim();
      foldedKey = null;
      foldedLines = [];
    }
  };

  for (const line of raw.split(/\r?\n/)) {
    if (foldedKey != null) {
      if (/^\s+\S/.test(line)) {
        foldedLines.push(line.trim());
        continue;
      }
      flushFolded();
    }
    const mapMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/);
    if (mapMatch) {
      mapKey = mapMatch[1];
      currentMap = {};
      frontmatter[mapKey] = currentMap;
      continue;
    }
    const kv = line.match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, indent, key, value] = kv;
    const target = indent ? currentMap : frontmatter;
    if (!indent) currentMap = frontmatter;
    if (value === ">" || value === "|") {
      foldedKey = key;
      foldedLines = [];
      currentMap = target;
      continue;
    }
    target[key] = value.replace(/^["']|["']$/g, "");
  }
  flushFolded();
  return { frontmatter, body };
}

const AXES = [
  "Cohesive",
  "Loosely coupled",
  "Encapsulated",
  "Assertive",
  "Nonredundant",
];

function validateManifests() {
  const claudeMarket = readJson(".claude-plugin/marketplace.json");
  const grokMarket = readJson(".grok-plugin/marketplace.json");
  const claudePlugin = readJson("plugins/cleanness/.claude-plugin/plugin.json");
  const grokPlugin = readJson("plugins/cleanness/.grok-plugin/plugin.json");

  for (const [label, market] of [
    ["claude", claudeMarket],
    ["grok", grokMarket],
  ]) {
    if (!market) continue;
    if (market.name !== "cleanness") fail(`${label} marketplace name must be cleanness`);
    if (!Array.isArray(market.plugins) || market.plugins.length < 1) {
      fail(`${label} marketplace must list at least one plugin`);
      continue;
    }
    const plugin = market.plugins.find((p) => p.name === "cleanness");
    if (!plugin) {
      fail(`${label} marketplace missing cleanness plugin entry`);
      continue;
    }
    const src = plugin.source;
    const localPath =
      typeof src === "string"
        ? src
        : src && typeof src === "object"
          ? src.path
          : null;
    if (!localPath) {
      fail(`${label} marketplace cleanness entry missing local source path`);
      continue;
    }
    const normalized = localPath.replace(/^\.\//, "");
    if (!exists(normalized)) {
      fail(`${label} marketplace source path does not exist: ${localPath}`);
    }
    if (plugin.version && claudePlugin && plugin.version !== claudePlugin.version) {
      warn(`${label} marketplace version ${plugin.version} != plugin.json ${claudePlugin.version}`);
    }
  }

  for (const [label, plugin] of [
    ["claude plugin.json", claudePlugin],
    ["grok plugin.json", grokPlugin],
  ]) {
    if (!plugin) continue;
    if (plugin.name !== "cleanness") fail(`${label}: name must be cleanness`);
    if (!plugin.version) fail(`${label}: missing version`);
    if (!plugin.license) fail(`${label}: missing license`);
  }

  if (
    claudePlugin &&
    grokPlugin &&
    claudePlugin.version !== grokPlugin.version
  ) {
    fail(
      `plugin.json version mismatch: claude=${claudePlugin.version} grok=${grokPlugin.version}`,
    );
  }

  return claudePlugin?.version ?? grokPlugin?.version ?? null;
}

function validateSkill(pluginVersion) {
  const skillRel = "plugins/cleanness/skills/cleanness/SKILL.md";
  const rubricRel = "plugins/cleanness/skills/cleanness/references/clean-rubric.md";
  const md = read(skillRel);
  if (md == null) return;
  if (!exists(rubricRel)) fail(`missing rubric: ${rubricRel}`);

  const { frontmatter, body } = parseFrontmatter(md, skillRel);
  const allowed = new Set([
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
  ]);
  for (const key of Object.keys(frontmatter)) {
    if (!allowed.has(key)) {
      fail(
        `${skillRel}: unexpected frontmatter field "${key}" (Agent Skills allows ${[...allowed].join(", ")})`,
      );
    }
  }
  if (frontmatter.name !== "cleanness") {
    fail(`${skillRel}: name must be cleanness, got ${frontmatter.name}`);
  }
  if (!frontmatter.description || frontmatter.description.length < 20) {
    fail(`${skillRel}: description missing or too short`);
  }
  if (!/CLEAN|cleanness|コード品質/.test(frontmatter.description)) {
    fail(`${skillRel}: description should mention CLEAN / cleanness triggers`);
  }
  if (frontmatter.license && frontmatter.license !== "MIT") {
    warn(`${skillRel}: license is ${frontmatter.license}, expected MIT`);
  }
  if (
    pluginVersion &&
    frontmatter.metadata?.version &&
    frontmatter.metadata.version !== pluginVersion
  ) {
    fail(
      `SKILL metadata.version ${frontmatter.metadata.version} != plugin version ${pluginVersion}`,
    );
  }

  for (const axis of AXES) {
    if (!body.includes(axis)) {
      fail(`${skillRel}: body missing axis "${axis}"`);
    }
  }

  const requiredSnippets = [
    "# CLEAN report",
    "**CLEAN score:**",
    "## Evidence",
    "## Top remediations",
    "references/clean-rubric.md",
  ];
  for (const snippet of requiredSnippets) {
    if (!body.includes(snippet)) {
      fail(`${skillRel}: missing required snippet: ${snippet}`);
    }
  }

  const rubric = read(rubricRel);
  if (rubric == null) return;
  for (const axis of AXES) {
    if (!rubric.includes(axis) && !rubric.includes(axis.split(" ")[0])) {
      // Accept heading forms like "C — Cohesive"
      if (!new RegExp(axis.replace(" ", ".*"), "i").test(rubric)) {
        fail(`${rubricRel}: missing axis coverage for ${axis}`);
      }
    }
    for (const score of [1, 2, 3, 4, 5]) {
      // Each axis section should mention score bands; require global presence of "| 5 |" etc.
    }
  }
  for (const score of [1, 2, 3, 4, 5]) {
    const re = new RegExp(`\\|\\s*${score}\\s*\\|`);
    const matches = rubric.match(new RegExp(re, "g")) || [];
    if (matches.length < AXES.length) {
      fail(
        `${rubricRel}: expected score band ${score} at least once per axis (found ${matches.length})`,
      );
    }
  }
}

function validateReportFixture(rel) {
  const text = read(rel);
  if (text == null) return;
  if (!text.includes("# CLEAN report")) fail(`${rel}: missing title`);
  if (!/\*\*CLEAN score:\*\*\s*\d(?:\.\d)?\s*\/\s*5/.test(text)) {
    fail(`${rel}: missing CLEAN score line`);
  }
  for (const axis of AXES) {
    if (!text.includes(axis)) fail(`${rel}: missing axis ${axis}`);
  }
  if (!text.includes("## Evidence")) fail(`${rel}: missing Evidence`);
  if (!text.includes("## Top remediations")) {
    fail(`${rel}: missing Top remediations`);
  }
  // Scores in table should be 1-5 integers
  const scoreCells = [...text.matchAll(/\|\s*[A-Za-z][^|]*\|\s*([1-5])\s*\|/g)];
  if (scoreCells.length < AXES.length) {
    fail(`${rel}: expected at least ${AXES.length} axis score cells, found ${scoreCells.length}`);
  }
}

function validateFixtures() {
  const dir = path.join(ROOT, "tests", "fixtures", "reports");
  if (!fs.existsSync(dir)) {
    fail("missing tests/fixtures/reports");
    return;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  if (files.length < 1) fail("no report fixtures under tests/fixtures/reports");
  for (const file of files) {
    validateReportFixture(path.join("tests", "fixtures", "reports", file));
  }

  // Sample code fixtures exist for manual / future LLM evals
  for (const sample of [
    "tests/fixtures/samples/cohesive-ok.ts",
    "tests/fixtures/samples/messy-god.ts",
  ]) {
    if (!exists(sample)) fail(`missing sample fixture: ${sample}`);
  }
}

const pluginVersion = validateManifests();
validateSkill(pluginVersion);
validateFixtures();

if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error("Validation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("All cleanness structural checks passed.");
