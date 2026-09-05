---
name: cleanness
description: >
  Measure code quality with CLEAN — Cohesive, Loosely coupled, Encapsulated,
  Assertive, Nonredundant. Scores each axis 1–5 with evidence and remediations.
  Use when the user asks for CLEAN score, code quality measurement, cohesion,
  coupling, encapsulation, assertiveness, redundancy, コード品質, 凝集性,
  疎結合, カプセル化, 断定的, 非冗長, or runs /cleanness.
license: MIT
compatibility: Works with Claude Code and Grok Build via Agent Skills (SKILL.md).
metadata:
  short-description: "Measure CLEAN code quality"
  author: nahcnuj
  version: "1.0.0"
  argument-hint: "[path-or-scope]"
---

# CLEAN code quality measurement

Score the target code on the five CLEAN axes. Read `references/clean-rubric.md` before scoring.

## Scope

1. If `$ARGUMENTS` is set, treat it as the path, glob, or description of what to measure.
2. Otherwise prefer the user's stated files/PR/diff; if none, measure the focused change set (`git diff` / recent edits), not the entire repository.
3. Skip generated code, vendored deps, lockfiles, and binary assets unless the user asks otherwise.

## Procedure

1. Load `references/clean-rubric.md`.
2. Inspect the scoped code with search and file reads. Cite concrete evidence (`path:line`).
3. Score each axis **1–5** using only the rubric bands. Do not invent extra axes.
4. Compute **CLEAN score** = average of the five scores, rounded to one decimal.
5. Report in this exact structure:

```markdown
# CLEAN report

**Scope:** <what was measured>
**CLEAN score:** <n.n> / 5

| Axis | Score | One-line finding |
|------|-------|------------------|
| Cohesive (凝集性) | n | … |
| Loosely coupled (疎結合) | n | … |
| Encapsulated (カプセル化) | n | … |
| Assertive (断定的) | n | … |
| Nonredundant (非冗長) | n | … |

## Evidence
### Cohesive
- `path:line` — …

### Loosely coupled
- …

### Encapsulated
- …

### Assertive
- …

### Nonredundant
- …

## Top remediations
1. **[Axis]** — what to change, why it moves the score
2. …
3. …
```

## Rules

- Evidence before scores. Every score below 5 needs at least one citation.
- Prefer the three highest-leverage remediations over long laundry lists.
- If scope is empty or unreadable, say so and stop; do not fabricate scores.
- Do not refactor unless the user asks after the report.
