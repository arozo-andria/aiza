# AIZA — Solution Description

**Category:** Legal & Public Services (citizen services / civic reporting)

## Problem

Malagasy administrative procedures — replacing a lost national ID card,
getting a birth certificate, registering an address change — are governed by
real, well-defined rules, but that information is scattered, undocumented in
any single accessible place, and usually only navigable in person, in
French, at a Fokontany or Arrondissement Administratif office. People ask
about them the way they actually speak: mixing Malagasy and French in one
sentence ("Very ny CIN-ko, aiza no manao déclaration de perte?" — "I lost my
CIN, where do I file a loss declaration?"). No existing voice assistant is
built for that code-switched reality, and Malagasy is not currently
supported by Sahara or by any code-switching benchmark dataset we could
find (see the Benchmark Report) — which is itself a finding worth stating
plainly, not hiding.

## Target users

Malagasy citizens handling everyday administrative tasks — replacing lost
documents, registering life events, understanding fees and required
paperwork — particularly those more comfortable speaking than typing long
French bureaucratic queries, or without easy access to someone who already
knows the procedure.

## Solution

AIZA is an installable PWA with one flow: speak or type an administrative
question in whatever mix of Malagasy/French comes naturally, and get back
either:

- a **verified, sourced procedure** — required documents, steps, where to
  go, cost, processing time, source, and last-verified date, all pulled
  from a real database entry, never generated at request time; or
- an **honest "I don't have a verified answer for that"** — explicitly,
  visibly, with no invented procedure. This is the load-bearing design
  decision: a wrong administrative instruction (wrong office, wrong
  document, wrong fee) is worse than no answer at all, so AIZA never
  guesses.

The raw transcript is always shown on screen, unedited, even when
imperfect — the pitch is to benchmark and represent Sahara's actual MG/FR
performance honestly, not paper over its limitations.

## Key technical decisions

- **Sahara-only in the shipped product**, per the challenge's own
  guidance — the app and demo are built on Sahara
  (`infer.voice.intron.io`). The 3-model comparison lives in the separate
  Benchmark Report, not in the live app.
- **Mandatory typed fallback**, not a convenience feature. Given Sahara's
  Malagasy coverage is unverified (confirmed absent from its published
  language list), the text input is a first-class, equally-supported path
  to the same pipeline — not a degraded backup.
- **Deterministic keyword matching today, not an LLM**, on purpose, for an
  MVP where every match must be traceable to a specific verified answer.
  `matchIntent()` is written as a single, isolated seam
  (`lib/matchIntent.ts`) specifically so a real NLU/LLM classifier — the
  natural next step toward a more agentic system that can ask a
  clarifying question instead of returning "no match" — can replace it
  without touching the API contract, the database, or the UI.
- **Real SQLite database** (`lib/db.ts`, Node's built-in `node:sqlite`),
  not hardcoded objects — procedures and advice entries are rows with
  their own `history` log, so verifying an entry again later is an
  appended row, not a silent overwrite. Ships pre-seeded and read-only in
  production, since a serverless deployment's filesystem isn't reliably
  writable — a real "add a procedure" admin flow is the natural next step,
  backed by a hosted DB instead of a bundled file.
- **PWA, not a native app** — zero-install, one Vercel deploy, works on
  any phone a fokontany resident already has.

## Current limitations, stated directly

- One verified procedure ships today (lost CIN); the schema supports many
  more, but content coverage is intentionally small for this MVP.
- Matching is keyword-based, not semantic — it will miss valid phrasings
  it hasn't seen. It fails toward "no match" (honest), never toward a
  wrong answer.
- Not yet agentic: no multi-turn clarification, no tool use beyond the one
  DB lookup. The architecture is built so that's an additive change, not a
  rewrite.
