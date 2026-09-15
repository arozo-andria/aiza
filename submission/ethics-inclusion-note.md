# AIZA — Ethics, Safety & Inclusion Note

## Consent and privacy

- Recording only happens on an explicit tap; there is no background or
  passive listening.
- AIZA does not store or log audio anywhere itself. The recorded clip is
  sent directly to the configured STT provider (Sahara) for transcription
  and is not written to disk or the database by our code
  (`app/api/transcribe/route.ts` forwards the blob and returns only the
  text).
- No accounts, no login, no persistent user identifiers. The knowledge
  base holds administrative procedures, not any personal or user data.
- Benchmark audio (see the Benchmark Report) is self-recorded and
  self-consented by the project team specifically for this evaluation —
  not scraped, not repurposed from another context, and shared only as
  part of the submission's own benchmark materials.

## Bias awareness — the central finding, not a footnote

Malagasy is absent from Sahara's published language list, and no public
code-switched Malagasy/French benchmark dataset appears to exist yet
(including in the official `intronhealth` collection). That means a
Malagasy speaker is, today, the least-served user of every code-switching
speech system we could find — including the one this product is built on.

We treat that as a finding to surface, not a limitation to minimize:

- AIZA always displays the **raw** transcript, never a silently "cleaned
  up" version — if Sahara mishandles Malagasy, the user sees that
  directly instead of a confident-looking but wrong transcription.
- The typed-text path is not a degraded fallback; it's an equal,
  first-class way to reach the same verified answer, specifically because
  we cannot promise voice will work reliably for Malagasy today.
- The result screen never fabricates a procedure to fill a gap. An
  unmatched query gets an explicit "I don't have a verified answer for
  that" rather than a plausible-sounding guess — because a wrong
  administrative instruction (wrong office, wrong document, wrong fee)
  can cost a real person a wasted trip or a rejected application, which
  is a worse outcome than no answer.

## Respect for user dignity

- Malagasy is presented as a first-class UI language throughout (labels,
  prompts, result text), not an afterthought translation of a French/
  English product.
- Every verified result shows its source and last-verified date, so the
  user — not just the product — can judge how much to trust it, rather
  than presenting institutional information as if it carries unconditional
  authority.
- The target users are people navigating bureaucracy that already holds
  most of the power in the interaction; the product's job is to reduce
  that asymmetry with accurate information, not to add a confident-sounding
  but unreliable intermediary.

## What we did not do

- We did not attempt to access the gated `AfriSwitch` benchmark dataset
  through anything other than the normal request-access flow, and did not
  rely on it once approval didn't land in time.
- We did not synthesize or fabricate Malagasy/French benchmark audio (e.g.
  via TTS) to manufacture a more favorable-looking result — the benchmark
  uses real recorded speech only.
