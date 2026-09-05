# CLEAN report

**Scope:** `tests/fixtures/samples/cohesive-ok.ts`
**CLEAN score:** 4.6 / 5

| Axis | Score | One-line finding |
|------|-------|------------------|
| Cohesive (凝集性) | 5 | Single purpose: parse and validate an email address |
| Loosely coupled (疎結合) | 5 | No hidden deps; pure functions only |
| Encapsulated (カプセル化) | 4 | Internals private via module scope; one public export |
| Assertive (断定的) | 5 | Names and control flow state intent without hedges |
| Nonredundant (非冗長) | 4 | One validation path; no duplicated rules |

## Evidence
### Cohesive
- `tests/fixtures/samples/cohesive-ok.ts:1` — module owns only email parsing/validation

### Loosely coupled
- `tests/fixtures/samples/cohesive-ok.ts:8` — no imports from infrastructure or UI

### Encapsulated
- `tests/fixtures/samples/cohesive-ok.ts:3` — helper stays unexported

### Assertive
- `tests/fixtures/samples/cohesive-ok.ts:12` — early returns with clear failure reasons

### Nonredundant
- `tests/fixtures/samples/cohesive-ok.ts:3` — regex defined once

## Top remediations
1. **[Encapsulated]** — export a narrow `Email` branded type instead of raw string if callers need stronger guarantees
2. **[Nonredundant]** — document the accepted email subset once in a constant name
