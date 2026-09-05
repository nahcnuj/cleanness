#!/usr/bin/env node
/**
 * Structural CI checks for the cleanness marketplace + CLEAN skill contract.
 * No network, no LLM — safe for GitHub Actions.
 *
 * Mechanically enforced (see also README):
 * - marketplace / plugin.json presence, JSON, name, version sync
 * - SKILL.md frontmatter basics + report template markers + axis names
 * - rubric: each axis section has score bands 1–5
 * - report fixtures: template markers, five axis scores, headline average,
 *   per-axis Evidence headings, and `path:line` citations when score < 5
 * - report Scope paths that point under tests/fixtures must exist
 *
 * Not enforced here: Agent Skills YAML allowlist (skills-ref), LLM scoring judgment.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

const AXES = [
  "Cohesive",
  "Loosely coupled",
  "Encapsulated",
  "Assertive",
  "Nonredundant",
];

const REPORT_MARKERS = [
  "# CLEAN report",
  "**CLEAN score:**",
  "## Evidence",
  "## Top remediations",
];

const SKILL_REL = "plugins/cleanness/skills/cleanness/SKILL.md";
const RUBRIC_REL =
  "plugins/cleanness/skills/cleanness/references/clean-rubric.md";

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) {
    fail(`missing file: ${rel}`);
    return null;
  }
  return fs.readFileSync(abs(rel), "utf8");
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

/**
 * Minimal frontmatter extract for local `npm test`.
 * Agent Skills YAML legality is owned by `skills-ref` in CI.
 */
function splitFrontmatter(md, rel) {
  if (!md.startsWith("---\n") && !md.startsWith("---\r\n")) {
    fail(`${rel}: missing YAML frontmatter opener`);
    return { fields: {}, body: md };
  }
  const end = md.indexOf("\n---", 3);
  if (end < 0) {
    fail(`${rel}: missing YAML frontmatter closer`);
    return { fields: {}, body: md };
  }
  const raw = md.slice(4, end).replace(/^\r?\n/, "").trimEnd();
  const body = md.slice(end + 4).replace(/^\r?\n/, "");
  return { fields: parseSimpleFields(raw), body };
}

function parseSimpleFields(raw) {
  const fields = {};
  let section = null;
  let foldedKey = null;
  let foldedLines = [];
  let foldedTarget = fields;

  const flushFolded = () => {
    if (foldedKey == null) return;
    foldedTarget[foldedKey] = foldedLines.join(" ").trim();
    foldedKey = null;
    foldedLines = [];
  };

  for (const line of raw.split(/\r?\n/)) {
    if (foldedKey != null) {
      if (/^\s+\S/.test(line)) {
        foldedLines.push(line.trim());
        continue;
      }
      flushFolded();
    }

    const sectionOpen = line.match(/^([A-Za-z0-9_-]+):\s*$/);
    if (sectionOpen) {
      section = {};
      fields[sectionOpen[1]] = section;
      continue;
    }

    const kv = line.match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, indent, key, value] = kv;
    const target = indent && section ? section : fields;
    if (!indent) section = null;

    if (value === ">" || value === "|") {
      foldedKey = key;
      foldedLines = [];
      foldedTarget = target;
      continue;
    }
    target[key] = value.replace(/^["']|["']$/g, "");
  }
  flushFolded();
  return fields;
}

function localSourcePath(plugin) {
  const src = plugin?.source;
  if (typeof src === "string") return src.replace(/^\.\//, "");
  if (src && typeof src === "object" && typeof src.path === "string") {
    return src.path.replace(/^\.\//, "");
  }
  return null;
}

function validateManifests() {
  const markets = [
    {
      label: "claude",
      marketRel: ".claude-plugin/marketplace.json",
      pluginRel: "plugins/cleanness/.claude-plugin/plugin.json",
    },
    {
      label: "grok",
      marketRel: ".grok-plugin/marketplace.json",
      pluginRel: "plugins/cleanness/.grok-plugin/plugin.json",
    },
  ];

  const plugins = {};
  for (const { label, marketRel, pluginRel } of markets) {
    const market = readJson(marketRel);
    const plugin = readJson(pluginRel);
    plugins[label] = plugin;

    if (plugin) {
      if (plugin.name !== "cleanness") fail(`${pluginRel}: name must be cleanness`);
      if (!plugin.version) fail(`${pluginRel}: missing version`);
      if (!plugin.license) fail(`${pluginRel}: missing license`);
    }
    if (!market) continue;

    if (market.name !== "cleanness") {
      fail(`${label} marketplace name must be cleanness`);
    }
    if (!Array.isArray(market.plugins) || market.plugins.length < 1) {
      fail(`${label} marketplace must list at least one plugin`);
      continue;
    }

    const entry = market.plugins.find((p) => p.name === "cleanness");
    if (!entry) {
      fail(`${label} marketplace missing cleanness plugin entry`);
      continue;
    }

    const localPath = localSourcePath(entry);
    if (!localPath) {
      fail(`${label} marketplace cleanness entry missing local source path`);
    } else if (!exists(localPath)) {
      fail(`${label} marketplace source path does not exist: ${localPath}`);
    }

    if (entry.version && plugin?.version && entry.version !== plugin.version) {
      fail(
        `${label} marketplace plugin version ${entry.version} != ${pluginRel} ${plugin.version}`,
      );
    }
    if (
      market.metadata?.version &&
      plugin?.version &&
      market.metadata.version !== plugin.version
    ) {
      fail(
        `${label} marketplace metadata.version ${market.metadata.version} != ${pluginRel} ${plugin.version}`,
      );
    }
  }

  const claude = plugins.claude;
  const grok = plugins.grok;
  if (claude?.version && grok?.version && claude.version !== grok.version) {
    fail(
      `plugin.json version mismatch: claude=${claude.version} grok=${grok.version}`,
    );
  }

  return claude?.version ?? grok?.version ?? null;
}

function rubricSections(rubric) {
  const sections = {};
  let current = null;
  for (const line of rubric.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return sections;
}

function validateSkill(pluginVersion) {
  const md = read(SKILL_REL);
  if (md == null) return;
  if (!exists(RUBRIC_REL)) fail(`missing rubric: ${RUBRIC_REL}`);

  const { fields, body } = splitFrontmatter(md, SKILL_REL);
  if (fields.name !== "cleanness") {
    fail(`${SKILL_REL}: name must be cleanness, got ${fields.name}`);
  }
  if (!fields.description || fields.description.length < 20) {
    fail(`${SKILL_REL}: description missing or too short`);
  }
  if (!/CLEAN|cleanness|コード品質/.test(fields.description ?? "")) {
    fail(`${SKILL_REL}: description should mention CLEAN / cleanness triggers`);
  }
  if (fields.license && fields.license !== "MIT") {
    warn(`${SKILL_REL}: license is ${fields.license}, expected MIT`);
  }
  if (
    pluginVersion &&
    fields.metadata?.version &&
    fields.metadata.version !== pluginVersion
  ) {
    fail(
      `SKILL metadata.version ${fields.metadata.version} != plugin version ${pluginVersion}`,
    );
  }

  for (const axis of AXES) {
    if (!body.includes(axis)) {
      fail(`${SKILL_REL}: body missing axis "${axis}"`);
    }
  }
  for (const marker of REPORT_MARKERS) {
    if (!body.includes(marker)) {
      fail(`${SKILL_REL}: missing required snippet: ${marker}`);
    }
  }
  if (!body.includes("references/clean-rubric.md")) {
    fail(`${SKILL_REL}: missing required snippet: references/clean-rubric.md`);
  }

  const rubric = read(RUBRIC_REL);
  if (rubric == null) return;

  const sections = rubricSections(rubric);
  for (const axis of AXES) {
    const heading = Object.keys(sections).find(
      (h) => h.includes(axis) || h.endsWith(`— ${axis}`) || h.endsWith(`- ${axis}`),
    );
    if (!heading) {
      fail(`${RUBRIC_REL}: missing axis section for ${axis}`);
      continue;
    }
    const text = sections[heading].join("\n");
    for (const score of [1, 2, 3, 4, 5]) {
      if (!new RegExp(`\\|\\s*${score}\\s*\\|`).test(text)) {
        fail(`${RUBRIC_REL}: axis "${axis}" missing score band ${score}`);
      }
    }
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function parseAxisTableScores(text, rel) {
  const scores = {};
  for (const axis of AXES) {
    const re = new RegExp(
      `\\|\\s*${axis.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^|]*\\|\\s*([1-5])\\s*\\|`,
    );
    const m = text.match(re);
    if (!m) {
      fail(`${rel}: missing score cell for axis ${axis}`);
      continue;
    }
    scores[axis] = Number(m[1]);
  }
  return scores;
}

function validateReportFixture(rel) {
  const text = read(rel);
  if (text == null) return;

  for (const marker of REPORT_MARKERS) {
    if (!text.includes(marker)) fail(`${rel}: missing ${marker}`);
  }

  const scoreLine = text.match(/\*\*CLEAN score:\*\*\s*(\d(?:\.\d)?)\s*\/\s*5/);
  if (!scoreLine) {
    fail(`${rel}: missing CLEAN score line`);
    return;
  }
  const headline = Number(scoreLine[1]);
  const scores = parseAxisTableScores(text, rel);
  const values = AXES.map((a) => scores[a]).filter((n) => Number.isFinite(n));
  if (values.length === AXES.length) {
    const expected = round1(values.reduce((a, b) => a + b, 0) / AXES.length);
    if (headline !== expected) {
      fail(
        `${rel}: CLEAN score ${headline} != average of axis scores ${expected}`,
      );
    }
  }

  for (const axis of AXES) {
    if (!text.includes(`### ${axis}`)) {
      fail(`${rel}: Evidence missing heading ### ${axis}`);
    }
    const score = scores[axis];
    if (score != null && score < 5) {
      const axisBlock = text.split(`### ${axis}`)[1]?.split(/^### /m)[0] ?? "";
      if (!/`[^`\n]+:\d+`/.test(axisBlock)) {
        fail(
          `${rel}: score ${score} on ${axis} needs at least one \`path:line\` citation`,
        );
      }
    }
  }

  const scope = text.match(/\*\*Scope:\*\*\s*`([^`]+)`/);
  if (scope) {
    const scopePath = scope[1].trim();
    if (
      scopePath.startsWith("tests/fixtures/") &&
      !exists(scopePath.replace(/\\/g, "/"))
    ) {
      fail(`${rel}: Scope path does not exist: ${scopePath}`);
    }
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

