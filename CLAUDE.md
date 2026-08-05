# CLAUDE.md — boss

The project canon is `docs/design-book.html` (revision 0.8). This file is the digest for agents.
On any divergence the canon wins and the digest gets fixed. Same for `DESIGN.md` — it is derived
from §XII of the book.

## What this is

boss — a rebuild of the corporate portal for a UK nightclub/bar network: rotas, hours
confirmation, staff, venues. Monolith + worker. One developer + an agentic pipeline.
The pipeline's memory is mneme, and mneme only.

## Principles (§I)

1. **One language.** TypeScript from migration to button. A second language never enters the repo.
2. **One base.** Postgres = data + queues + cron + pub/sub. There is no Redis in this project.
3. **One craftsman's budget.** Any new technology must justify its solo cost of ownership.
4. **Convention = type.** A rule is enforced by the compiler or CI, not by memory. If a rule
   cannot be machine-checked, design the check first, then introduce the rule.

## Stack

Bun · Hono (thin HTTP adapter) · Better Auth (sessions in Postgres, isolated in `platform/auth.ts`) · tRPC inward, REST + OpenAPI (`rest/v1`) outward ·
Zod as the single validation language · Drizzle + Postgres · queue in Postgres (pg-boss or
Graphile Worker — open bake-off, §V) · React SPA without SSR · TanStack Router (code-based)
+ Query · Tailwind v4 `@theme` + shadcn/ui · SSE (events invalidate, they carry no data) ·
Vitest + Playwright · Docker → Dokku → DigitalOcean.

## Repository map (§III)

```
CLAUDE.md  docs/design-book.html
apps/server/src/{main,worker,app,router}.ts
apps/server/src/features/<slice>/{router,service,queries,jobs,events,*.test}.ts
apps/server/src/platform/   # queue · sse · auth · s3 · env
apps/server/src/rest/v1/    # external facade
apps/web/src/features/<slice>/{routes.tsx,components/,api.ts}
apps/web/src/shell/         # frame: header, site-select, layouts for both scopes
apps/web/src/ui/            # shadcn primitives; ui/domain/ — the domain vocabulary
apps/web/src/styles/tokens.css
packages/db/{schema,migrations,seed}/   packages/shared/{schemas,domain}/
e2e/  scripts/  docker/
```

Slices are named by domain (`hours-confirmation`, `staff`), never by technology.
Venue-scoped routes — `/venues/$venueId/…` (site-select lives in the frame);
fleet-scoped — `/staff…` (no selector; venues are data there).

## Rules

- **Imports** (enforced by `scripts/check-imports.ts`): slices never import each other —
  only via `platform/` or events; `@boss/db` is server-only; `ui/` never imports `features/`;
  `better-auth` is imported ONLY in `platform/auth.ts` — slices see `Session` / `requireRole()`
  / role procedures, never the library. `user ≠ staff`: users log into the portal, staff clock
  at venues; the optional link lives on the staff side.
- **Dependencies**: latest stable releases; lockfile in git; betas and RCs never enter the
  production branch.
- **Migrations**: `drizzle-kit generate` only (+ `--custom` for hand-written SQL);
  expand → migrate → contract; a rollback is a new migration forward; squawk in CI.
- **Data**: types flow from `$inferSelect`; the rota / clocked / amended triple is an
  aggregate, not columns (§IV).
- **UI**: semantic tokens from `styles/tokens.css` only; primitives via `shadcn add` at the
  moment of need; domain vocabulary in `ui/domain/` with variants as `Record<Union, …>`
  (exhaustive, no default); catalog — Ladle; extraction by the rule of three.
- **Overlays**: sizes are the `OverlaySize` union ('confirm' 400 / 'form' 560 / 'wide' 720;
  drawer fixed 480) — never a number prop. Genres: confirm / dialog (≤~6 fields, no scroll) /
  drawer (~7–12 fields, sticky footer, discard guard) / inline. 13+ fields = a passport-form
  PAGE with its own route, never an overlay. Editing complex entities is per-section via
  dialog/drawer; a shareable overlay lives in router search params, ephemeral confirms in state.
- **Interface copy** — English, verb-first (Accept, Undo, Clock out).
  Code, identifiers, commits — English.
- **Tests**: a red test before the change; the bulk are integration tests against a real
  Postgres (transaction rolled back per test); no database mocks.

## Memory (mneme)

- Before any architectural decision — recall first, not after.
- Notes capture **decisions and findings**, not facts and not copies of the canon. Anchors —
  real file paths in this repository only.
- Renaming a path = an anchor migration: never rename without walking the notes.
- Note-worthy events: extracting a component into `ui/domain/`; a conflict after a dependency
  upgrade; a recurring impeccable-audit finding; a deliberate choice the detector flags
  ("ours, not slop").

<!-- MNEME-CRITERIA-CONTRACT -->
## mneme: phase criteria contract

- A done-when criterion is ONE argv command — no quotes, no `&&`/`|`: the gate-runner spawns a
  single process, and any quote or shell operator is an instant red `malformed-command` gate.
- Executable-first: a criterion is a command with exit 0 and a DEFINITE target (a specific test
  file, a `grep -q MARKER path`) — never a bare full-suite run alone. An agent-judged criterion
  is allowed only where the outcome is fundamentally not machine-checkable, and is marked
  `agent-judged` explicitly.
- Every criterion command must EXIST in the project (a script in package.json, a file on disk) —
  verify before writing the spec, never guess.
<!-- /MNEME-CRITERIA-CONTRACT -->

## Quality loop (§XIII)

tsc → Vitest (real Postgres) → `/impeccable audit` on changed files → `/impeccable polish`
as the final pass → CI: check-imports · squawk · `impeccable detect src/` (exit 2 blocks the
merge) → mneme notes; staging is reviewed by the human.

## Prohibitions

- `drizzle-kit push` outside the local sandbox.
- Downgrading dependency versions without the human (a conflict = a mneme note, not a rollback).
- Raw hex, new colors, inline color styles — tokens only.
- Cross-slice imports; `@boss/db` in web; `features/` from `ui/`; `better-auth` outside
  `platform/auth.ts`.
- An overlay for a form that does not fit a drawer unscrolled; overlay width as a number.
- Down-migrations; path renames without an anchor migration.
- BEM and any class-naming notation — the vocabulary lives in types and components.

## Open questions (never freeze without the human)

- Semantics of a shift candidate's `bypass` — hypothesis: skipping face/photo evidence
  verification; awaiting a check against the Rails models (§IV).
- Queue: pg-boss vs Graphile Worker — settled by the bake-off (§V).
