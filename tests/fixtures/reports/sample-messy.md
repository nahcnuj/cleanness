# CLEAN report

**Scope:** `tests/fixtures/samples/messy-god.ts`
**CLEAN score:** 1.8 / 5

| Axis | Score | One-line finding |
|------|-------|------------------|
| Cohesive (凝集性) | 1 | One type mixes auth, billing, email, and logging |
| Loosely coupled (疎結合) | 2 | Reaches through globals and deep object chains |
| Encapsulated (カプセル化) | 2 | Mutable public fields; callers mutate internals |
| Assertive (断定的) | 2 | Speculative flags and vague method names |
| Nonredundant (非冗長) | 2 | Duplicate discount and email checks |

## Evidence
### Cohesive
- `tests/fixtures/samples/messy-god.ts:1` — `AppManager` owns unrelated concerns

### Loosely coupled
- `tests/fixtures/samples/messy-god.ts:24` — `globalThis.db.users.find` chain

### Encapsulated
- `tests/fixtures/samples/messy-god.ts:4` — public mutable `users` / `orders`

### Assertive
- `tests/fixtures/samples/messy-god.ts:18` — `maybeDoStuff` / unused `experimentalMode`

### Nonredundant
- `tests/fixtures/samples/messy-god.ts:12` — discount logic copied in two methods

## Top remediations
1. **[Cohesive]** — split into AuthService, BillingService, and Mailer with one reason to change each
2. **[Loosely coupled]** — inject a user repository instead of `globalThis.db`
3. **[Nonredundant]** — extract a single `applyDiscount` helper
