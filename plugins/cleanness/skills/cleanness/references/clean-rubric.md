# CLEAN rubric

Score each axis from 1 (poor) to 5 (excellent). Use the band that best matches the dominant pattern in scope.

## C — Cohesive（凝集性）

Units (functions, types, modules) group related behavior around one clear purpose.

| Score | Band |
|-------|------|
| 5 | Each unit has one reason to change; names and contents align; mixed concerns are rare |
| 4 | Mostly single-purpose; a few mild mixes that do not obscure intent |
| 3 | Mixed responsibilities appear regularly; hard to summarize a unit in one sentence |
| 2 | God objects / kitchen-sink modules; unrelated behaviors share state freely |
| 1 | No coherent grouping; behavior scattered without a readable purpose |

**Signals:** SRP violations, unrelated methods on one type, feature envy across domains, packages that cannot be described without "and".

## L — Loosely coupled（疎結合）

Dependencies are few, explicit, and point the right direction. Changes stay local.

| Score | Band |
|-------|------|
| 5 | Narrow interfaces; dependents use abstractions; ripple from a change stays local |
| 4 | Coupling is mostly intentional; a few concrete cross-deps that are easy to isolate |
| 3 | Noticeable tangles; edits often require touching distant modules |
| 2 | Tight webs, circular deps, or Law-of-Demeter chains through many objects |
| 1 | Everything depends on everything; safe change is impractical |

**Signals:** Circular imports, concrete infra leaking into core, shotgun surgery, deep `a.b.c.d` chains, hidden global coupling.

## E — Encapsulated（カプセル化）

Internals stay hidden behind a stable, minimal surface. Invariants are owned by the unit that can enforce them.

| Score | Band |
|-------|------|
| 5 | Public API is minimal; internals private; invariants enforced at the boundary |
| 4 | Mostly hidden; a few leaks that callers could avoid |
| 3 | Callers reach into structure or rely on undocumented internals |
| 2 | Wide public surface; mutable internals shared; invariants unenforced |
| 1 | No boundary; data and control are fully exposed |

**Signals:** Public fields that should be private, leaking collections, getters that invite external mutation, bypassed constructors, package-private sprawl without intent.

## A — Assertive（断定的）

Code states what it does decisively: clear names, one obvious path, no speculative scaffolding or ambiguous control flow.

| Score | Band |
|-------|------|
| 5 | Intent is obvious; names decide; control flow is direct; no dead speculative branches |
| 4 | Mostly decisive; a few hedges or unclear names that do not dominate |
| 3 | Frequent ambiguity: vague names, optional everything, unclear ownership of decisions |
| 2 | Speculative APIs, feature flags without need, boolean soup, apologetic comments instead of structure |
| 1 | Code refuses to commit; readers cannot tell what is real vs leftover exploration |

**Signals:** `maybe`/`Util`/`Manager` without domain meaning, unused extension points, nested ternaries, contradictory comments, TODOs that define behavior.

## N — Nonredundant（非冗長）

Knowledge and behavior appear once. No dead code, copy-paste variants, or parallel implementations of the same rule.

| Score | Band |
|-------|------|
| 5 | Single source of truth; duplication is intentional and tiny (e.g. symmetry) |
| 4 | Minor duplication that is cheap to live with |
| 3 | Repeated logic or data in several places; fixes need coordinated edits |
| 2 | Large copy-paste blocks; parallel hierarchies; dead paths kept "just in case" |
| 1 | Redundancy dominates; truth cannot be located |

**Signals:** Copy-paste functions, duplicated conditionals, dead exports, mirrored type hierarchies, comments that restate code.

## Scoring notes

- Score the **scoped** code, not an imagined ideal rewrite.
- When evidence conflicts, weight the pattern that affects change risk most.
- Language-idiomatic patterns (e.g. framework required coupling) are not automatic penalties; judge whether *unnecessary* coupling/leakage/duplication remains.
