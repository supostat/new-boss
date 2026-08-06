# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Venue manager** — the primary user. Works from a desktop in the venue's back office, seated,
with a keyboard and a full-size screen. Their recurring job is the daily hours confirmation: for
each staff member who worked yesterday, reconcile what was rota'd against what was actually
clocked, resolve the discrepancies, and accept a final set of hours. This is a decision task under
mild time pressure, repeated every day, over every person on shift. Mobile is an occasional
fallback, never the scene the design is built for.

**Ops / area manager** — supervises several venues. Reads across the fleet, intervenes in
individual venues, and holds the permissions a venue manager does not (including overriding the
guard on original clock times).

**Admin** — manages the fleet itself: staff records, venues, portal users, and the permissions
that gate everything above.

**Staff** are subjects of the system, not users of it. They clock in and out at the venue on a
fixed device, and they may never open the portal. A staff record may optionally be linked to a
portal user; the link lives on the staff side and is not required. `user ≠ staff` is a product
distinction, not an implementation detail.

Authorization has two orthogonal axes. Levels are ordered and checked as at-or-above:
`manager → ops_manager → area_manager → admin → dev` (the code currently ships the two ends of
that range and the tuple holds the shape of the rest). Traits are unordered specializations OR-ed
into the level check: `payroll_manager`, `security_manager`, `chef`. Access to a venue is temporal
data — a membership with a validity window, evaluated at a point in time — not a static flag.

## Product Purpose

boss is the corporate portal for a UK nightclub and bar network: rotas, hours confirmation, staff
records, and venues. It exists so that the hours a business pays for are the hours it can account
for — every accepted hour traceable to the clock events, evidence, and human judgment that
produced it.

It succeeds when a venue manager can clear a day's confirmations quickly and without leaving the
list, when an accepted figure can be explained months later, and when an override is a recorded
decision rather than an invisible edit.

## Positioning

Not a generic workforce-management SaaS. boss is built for one operator's actual shift reality:
overnight shifts that cross midnight, clock devices that fail mid-service, photo evidence attached
to clock events, and a manager who must reconcile plan against fact the next morning.

The mechanism a neighboring product could not truthfully copy is the treatment of the hours triple.
Rota'd, clocked, and accepted are not three columns on a row — they are an aggregate over three
distinct records: the day's confirmation, an append-only log of clock events carrying their
evidence, and a stack of proposed shift candidates from which the manager accepts a breakdown of
the day. The disagreement between plan and fact is the product's subject matter, not an error state
to be normalized away.

## Operating Context

**The clocking scene (not the portal).** Staff clock in and out at the venue on a fixed device.
A clock event carries its evidence kind: a photo captured at the moment of clocking, or a manual
entry when the device or facial recognition failed. Manual entries and the clock-in notes staff
leave ("iPad wasn't working until 11 past") are exactly the material the manager adjudicates the
next day. Photo bytes go straight from browser to object storage via a presigned upload; the
server signs, it does not carry the file.

**The confirmation scene (the portal).** The list page *is* the work page — there is no
list → detail navigation. Each staff card on the day's list is a complete working unit: identity
with the rota'd / clocked / accepted totals and their delta, an event timeline, the notes with
their trust indicator, and the stack of shift candidates with per-candidate breaks, an accept
action showing the computed figure, and a delete.

**Two scopes, decided structurally.** Venue-scoped work (hours confirmation, rotas) carries the
venue in the URL and a venue selector in the frame; a deep link to "same page, different venue" is
free. Fleet-scoped work (staff and their records) has no selector — venues are data there, appearing
as master-venue and work-venue columns and filters. Which scope a page belongs to is settled by
which route it hangs from, not by a runtime condition.

**The staff record** is a registry plus a passport. The registry lists staff with status, job type,
master and work venues, furlough flag, and issued accessories (uniform items such as shirts,
aprons, hoodies, fobs, and cards, tracked by count). The passport is sectioned: employment (main
venue, job type, start date, pay-rate band, NI number, payroll system ID), account (status, created
date, facial-recognition enrollment, bypass protection, ID scanner), and the subdomains — holidays,
owed hours, accessories, shifts, payments, disciplinary, quizzes.

## Capabilities and Constraints

- **Hours acceptance is guarded.** A shift candidate's times are checked against a snapshot of the
  original clock times within ±1 hour. Exceeding that window requires an explicit, permission-gated
  bypass (`payroll_manager` trait, or `ops_manager` level and above), and every use of it is
  audit-logged. The bypass does not disable the other guards: overlap checks and the week freeze
  still apply.
- **Facial-recognition flags belong to the staff record**, not to hours acceptance. Whether a staff
  member may clock without facial recognition, and whether that control is visible at all, is a
  staff-slice concern and never a lever on the hours screen.
- **Interface copy is English and verb-first** (Accept, Undo, Clock out). Code, identifiers, and
  commits are English.
- **Domain vocabulary is enumerated, not free-form.** Statuses, evidence kinds, event kinds, and
  candidate states are closed unions handled exhaustively; a new value is a schema change, not a
  string.
- **Shifts cross midnight.** A working day is not a calendar day, and any date-bounded view has to
  survive an 18:00 → 02:00 shift.
- **One maintainer.** The product is built and operated by a single developer with an agentic
  pipeline. Any capability that cannot be owned solo over a ten-year horizon is out of scope
  regardless of merit.
- **Undecided, deliberately:** fleet size (venue and staff counts) is not yet confirmed as a product
  fact; the canon's mockups use a few hundred staff across roughly thirty venues as illustration
  only. Whether payroll data leaves the system for an external payroll product — the staff passport
  records a payroll system ID — is not established. No integration should be assumed on the strength
  of that field alone.

## Brand Commitments

- **Name:** boss, lowercase.
- **Relationship to the legacy portal:** boss is a new product, not a migration. The legacy system
  is a reference for requirements and a source of evidence about real usage — it is not a
  specification, there is no parity obligation, and no data migration is planned. Legacy behavior is
  reproduced when it earns its place and dropped when it does not.
- No other externally-fixed identity constraints have been established.

## Evidence on Hand

- `docs/design-book.html` — the project canon (revision 0.15), the authority on architecture,
  domain, and the portal's visual language. Untracked by design: the repository is public, the canon
  is local-only.
- `docs/design/` — HTML mockups of the incumbent visual exploration: the hours list, the staff
  registry, a passport form page, the overlay genres, and login. Also untracked, also local-only.
- `docs/SPEC-*.md` and the closed mneme runs behind them — the executed record of the foundation
  work: repository structure, toolchain, the authorization domain, and the queue bake-off.
- `apps/web/src/styles/tokens.css` — the tracked seed of the design system.
- **Absent, and not to be fabricated:** no user research, interviews, testimonials, customers,
  benchmarks, pricing, or press exist for this product. There is no production deployment and no
  migrated data. Real venue names, the production domain, and any staff data are deliberately kept
  out of this tracked file.

## Product Principles

1. **The list is the work.** A manager clears a day without navigating away from it. Any design that
   pushes the decision onto a detail page has moved the work, not organized it.
2. **Evidence before the edit.** Every accepted hour keeps its provenance — the clock events, the
   evidence kind, the notes, and who overrode what. An override is always permitted to the right
   person and never silent.
3. **Disagreement is the subject.** Plan versus fact is what the manager is here to resolve. Surface
   the delta; do not smooth it into a single reconciled number.
4. **Scope is structural.** Venue-scoped and fleet-scoped are different worlds with different frames.
   Which one a surface lives in is a design decision made once, at the route, not re-litigated per
   component.
5. **One operator's budget.** Every capability is judged by what it costs to own alone. A feature
   that demands ongoing attention when nobody is thinking about it is a feature the product cannot
   afford.
