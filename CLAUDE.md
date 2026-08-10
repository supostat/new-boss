# CLAUDE.md — boss

The project canon is `docs/design-book.html` (revision 0.17). This file is the digest for agents.
`docs/` is gitignored while the repository is public: the canon lives locally, is NOT tracked,
and mneme notes must NEVER anchor to `docs/*` (untracked anchor = dead-anchor sink).
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
Zod as the single validation language · Drizzle + Postgres · Biome (lint+format, one binary) · queue in Postgres (pg-boss; contract
`platform/queue.ts` — defineJob + enqueue(tx, …), single surface `export const queue`) · React SPA without SSR · TanStack Router (code-based)
+ Query · Tailwind v4 `@theme` + shadcn/ui · SSE (events invalidate, they carry no data) ·
Vitest + Playwright · Docker → Dokku → DigitalOcean.

Two outward contracts, split on purpose: tRPC is internal, lives on types and may break daily;
REST + OpenAPI (`rest/v1`, URL `/api/v1`, spec generated from the same Zod schemas) serves external
consumers — PRAECO and successors — plus webhooks from the worker, and breaks only through a
version. Internal speed is not hostage to external stability.

## Repository map (§III)

```
CLAUDE.md  docs/design-book.html
apps/server/src/{main,worker,app,router}.ts
apps/server/src/features/<slice>/{router,service,queries,jobs,events,*.test}.ts
apps/server/src/platform/   # queue · sse · auth · s3 · env
apps/server/src/rest/v1/    # external facade
apps/web/src/{main,router}.tsx
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
`staff` is ONE slice: the passport and its eight subdomains (holidays, owed hours, accessories,
shifts, payments, disciplinary, quizzes) never become slices of their own. Invites are our own
domain in `features/users/` — own table and flow, calling the auth API inside.
Routing is code, not files: `routes.tsx` per slice, assembled in `router.tsx`.

## Rules

- **Imports** (enforced by `scripts/check-imports.ts`): slices never import each other —
  only via `platform/` or events; `@boss/db` is server-only; `ui/` never imports `features/`;
  `better-auth` is imported ONLY in `platform/auth.ts` — slices see `Session` / the policy
  primitives (atLeast / hasTrait / inVenue) / role procedures, never the library. `user ≠ staff`: users log into the portal, staff clock
  at venues; the optional link lives on the staff side.
- **Dependencies**: latest stable releases; lockfile in git; betas and RCs never enter the
  production branch.
- **Toolchain** (frozen by spec): the four script names `typecheck` · `test` · `lint` · `format`
  are FROZEN — every future spec criterion cites them, and a rename breaks every future gate.
  Biome carries no type-aware rules (tsc strict carries type strictness); files frozen by past
  specs are excluded from the formatter by name. Normalize with `bunx biome check --write` —
  `format` alone skips assists, `organizeImports` among them. Compose Postgres 18 maps its volume
  to `/var/lib/postgresql`: the 18 major moved PGDATA, and the old path silently bypasses the
  volume.
- **Migrations**: `drizzle-kit generate` only; `--custom` hand-written SQL is for DATA only;
  expand → migrate → contract; a rollback is a new migration forward; squawk in CI.
- **Data**: types flow from `$inferSelect`; the rota / clocked / amended triple is an
  aggregate, not columns (§IV). The ±1h guard limit is a named domain constant, never a literal,
  and the server re-checks whatever the UI checked.
- **API**: procedures are thin — parse the input, call the service. Rights sit at the procedure
  level (`staffProcedure` / `managerProcedure`), never as scattered `if`s in the body.
  Segregation of duties (a creator does not accept their own request, never self, flagged is
  admin-only) is ordinary policy code taking the object.
- **Jobs**: every job must survive a replay — the idempotency key rides in the payload and is
  checked as the first action. Retries back off exponentially; an exhausted job lands in the
  dead-jobs table with a NOTIFY to the alert channel. Cron is the same mechanism, never a system
  crontab.
- **Realtime**: the NOTIFY payload carries only the ADDRESS of the change (venue, entity), never
  data — the client re-reads through the ordinary typed query, so delivery order, lost events and
  duplicated serialization stop being problems. One `LISTEN` per process in the SSE hub. SSE
  stands while the stream is one-way; bidirectionality is a separate decision of a separate
  revision.
- **State**: TanStack Query is the server cache, the URL holds filters and context, `useState`
  holds the ephemeral. There is no state manager, because no state needs one.
- **UI**: semantic tokens from `styles/tokens.css` only (`--color-rota`, never `--green-700`);
  primitives via `shadcn add` at the moment of need — a hand-rolled primitive ("our own Button")
  is forbidden, distinctiveness lives in tokens and the domain layer; domain vocabulary in
  `ui/domain/` with variants as `Record<Union, …>` (exhaustive, no default); catalog — Ladle;
  extraction by the rule of three, with one named exception — `StatusPill`, `EvidenceTimeline`
  and `HoursTotals` are extracted up front because legacy already proved their repetition
  (`CandidateCard`, `AvatarRing` follow the rule).
- **Overlays**: sizes are the `OverlaySize` union ('confirm' 400 / 'form' 560 / 'wide' 720;
  drawer fixed 480) — never a number prop. Genres: confirm / dialog (≤~6 fields, no scroll) /
  drawer (~7–12 fields, sticky footer, discard guard) / inline. 13+ fields = a passport-form
  PAGE with its own route, never an overlay. Editing complex entities is per-section via
  dialog/drawer; a shareable overlay lives in router search params, ephemeral confirms in state.
- **Motion & toasts**: three motion tokens only (`--motion-fast` 100 / `--motion-base` 140 /
  `--motion-slow` 160ms) in tokens.css; enter at base/slow ease-out, EXIT ALWAYS FAST; inline
  expansion never animates; `prefers-reduced-motion` kills all; motion is declarative (Radix
  data-state + `@theme` animations), never hand-written JS. Toast is the FIFTH genre — feedback,
  not an overlay: surface card with a semantic 3px left edge (success / pending / error),
  bottom-right, a collapsed DECK in the sonner gesture (offset+scale, ≤3 visible, hover expands
  to a list); durations are named constants — success ~5s, pending lives until its outcome (not
  a timer), errors are STICKY until dismissed, yet swipe-to-dismiss closes ANY toast, sticky
  included; no Undo slot (a toast confirms an outcome and never promises reversibility — undoing
  a disable is not a plain enable). sonner via shadcn, re-clothed in tokens; the only call point
  is our `toast()` from `ui/`; a hand-rolled toaster is forbidden. Depth (shadow) belongs to
  overlays and toasts only.
- **Interface copy** — English, verb-first (Accept, Undo, Clock out).
  Code, identifiers, commits — English.
- **Authz**: ordered Level tuple ('manager'…'dev', checks via atLeast = at-or-above) + orthogonal
  Trait union OR-ed in; venue membership is temporal data (user_venues with validity windows,
  explicit bypass for system contexts). Policies are per-slice functions (features/…/policy.ts)
  over three shared primitives (atLeast / hasTrait / inVenue) — no central policy file, no policy
  engine, no rights-in-DB, no RLS. Static part (level+traits) is reusable in UI; object predicates
  are server-only, UI receives computed flags in data.
- **Code comments**: never reference the book (§), phases, or specs — code explains itself;
  the provenance of decisions lives in mneme notes and specs.
- **Tests**: a red test before the change; the bulk are integration tests against a real
  Postgres (transaction rolled back per test); no database mocks. An hourglass, not a pyramid:
  ~70% integration (the slice end to end — procedure → service → transaction → job → NOTIFY),
  ~20% unit (pure logic: reconciling the three times, breaks, shifts crossing midnight), ~10% e2e.
  The test lives in the slice, beside the code it specifies.

## Deploy (§X)

One image, two processes (`web` + `worker` in the Procfile); DO Managed Postgres (backups, PITR
and failover bought, not built); migrations run in the release phase before traffic switches.
Clock-in photos are presigned-uploaded from the browser straight to Spaces — the server issues the
signature and the bytes never pass through it. Secrets are env through Dokku today, the ARCA
module next, same interface. Observability is structured logs to stdout plus the dead-jobs table
with a Telegram NOTIFY alert; a separate APM is deliberately absent while the fleet is small.

## Rejected (§XI) — never re-propose without the human

Rails · NestJS · GraphQL · Redis · Next.js/SSR · Elysia · Fastify · Prisma · own auth on
primitives (Oslo/Arctic) · Auth.js and managed auth (Clerk, Auth0) · pnpm · policy engines and
rights-in-data (CASL, casbin, Postgres RLS) · testcontainers · ESLint+Prettier · oxlint ·
Graphile Worker · Phoenix LiveView · Kubernetes · BEM notation. Each carries a recorded reason in
the book. A proposal that contradicts a principle is rejected — the principle is not.

## Visual (§XII — DESIGN.md carries the rest)

Two rules here are architectural, not decorative:

- **Page patterns.** A new screen picks from the canonical three before inventing a fourth:
  working list (full cards, the decision is made in place, no list → detail), registry (table with
  typed row flags, filter, pagination, one primary action), passport (identity header + actions,
  subdomain tab bar, numbered key-value sections). Row flags are typed state —
  `type StaffFlag = 'ok' | 'retake_photo' | 'attention'`, exhaustive switch, like shift statuses.
- **Exploration verdict, settled.** Ledger inside, Counter on the way in — the login is
  deliberately its own direction (narrow panel, monospace inputs, thin brand stripe). The dark
  direction was tested and closed at both ends; light is the default and dark is a separate
  revision.

## Memory (mneme)

- Before any architectural decision — recall first, not after.
- The corpus lives OUTSIDE the repository (`~/.mneme/…`); nothing mneme-related enters git.
- Notes capture **decisions and findings**, not facts and not copies of the canon. Anchors —
  real, GIT-TRACKED file paths in this repository only; `docs/*` is untracked by design and
  is never an anchor.
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
as the final pass → the guards: `bun scripts/check-structure.ts` · `bun scripts/check-imports.ts`
· squawk on migrations · `impeccable detect src/` (exit 2 blocks the merge) → mneme notes;
staging is reviewed by the human.

**CI is live.** `.github/workflows/ci.yml` runs on every push to main (plus manual dispatch):
fresh Postgres + Mailpit services, migrations, typecheck, lint, both guards, the full suite,
squawk over migrations behind the named pre-CI baseline, and `impeccable detect` over the web
app. Ladle remains declared, not installed — the catalog arrives with the work that first
needs it.

## Prohibitions

- `drizzle-kit push` outside the local sandbox.
- Downgrading dependency versions without the human (a conflict = a mneme note, not a rollback).
- Raw hex, new colors, inline color styles — tokens only.
- Cross-slice imports; `@boss/db` in web; `features/` from `ui/`; `better-auth` outside
  `platform/auth.ts`.
- An overlay for a form that does not fit a drawer unscrolled; overlay width as a number.
- Down-migrations; path renames without an anchor migration.
- BEM and any class-naming notation — the vocabulary lives in types and components.
- A hand-rolled UI primitive where shadcn has one; a state manager; a NOTIFY payload carrying
  data; photo bytes routed through the server; a hand-rolled toaster; motion values outside
  the three motion tokens.

## Open questions (never freeze without the human)

- Not verified: the legacy `moss` branch — the ±1h validator does not fire there at all. When
  moss periods are ported, check that semantics separately (§IV).
- Otherwise none. New forks enter here through the plan fan, never silently.

## Settled (formerly open)

- Queue: pg-boss won the §V bake-off on the shared contract suite (transactionality · retries ·
  observability): tx-client enqueue into its insert + a documented, SQL-readable `pgboss` schema
  vs Graphile Worker's privatized tables. The loser is fully erased; the contract suite stays as
  the living specification of the queue.

- Candidate `bypass` → `originalTimesBypass`: a permission-gated bypass of the ±1 hour guard
  against the original clock times snapshot (hasTrait('payroll_manager') || atLeast(level,
  'ops_manager')); it does NOT disable overlap checks or week freeze. Bypass facts are
  audit-logged (an improvement over legacy). Face flags are a staff-slice concern
  (`allowClockingWithoutFacialRecognition` + admin-only button visibility) and never touch
  hours acceptance: the flag turns on only with an irreplaceable avatar, resets on disable /
  retake / avatar change, and the clocking app reads it through the external REST facade.
