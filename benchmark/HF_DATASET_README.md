---
license: cc-by-nc-4.0
language:
- mg
- fr
task_categories:
- automatic-speech-recognition
tags:
- code-switching
- malagasy
- french
- administrative
- sahara-codeswitch-africa-challenge
size_categories:
- n<1K
---

# AIZA — Malagasy/French Code-Switched Administrative Speech (Benchmark Set)

10 short, self-recorded, consented audio clips of Malagasy/French code-switched
questions about Malagasy administrative procedures (lost ID card, birth
certificate, passport, land title, etc.) — created as the benchmark audio for
[AIZA](https://aiza-sahara-codeswitch.vercel.app), a submission to the
**Sahara CodeSwitch Africa Main Challenge**.

## Why this dataset exists

Neither Sahara's published language list nor the official `intronhealth/AfriSwitch`
code-switching benchmark covers Malagasy. To honestly benchmark speech
recognition on AIZA's actual target domain, we recorded our own small,
consented test set rather than claim results on a language pair no existing
public benchmark covers.

## Consent and privacy

- Every clip is self-recorded by the dataset creator, specifically for this
  benchmark, with full awareness of its public use here.
- Content is limited to generic administrative example sentences (no real
  names, ID numbers, or personal data of any kind).

## Files

- `audio/<id>.webm` — 10 short recordings (see `metadata.csv` for per-file duration)
- `metadata.csv` — id, topic, reference transcript, duration (seconds), languages
- `ground_truth.json` — same reference transcripts, JSON form
- `results.json` — full benchmark results (Sahara + 2 Malagasy-specific ASR
  models: WER/CER per utterance) — see the submission's Benchmark Report for
  the human-readable writeup

## Stats

- 10 utterances, ~44 seconds total
- Languages: Malagasy (mg) code-switched with French (fr)
- Domain: civic/administrative queries

## License

CC BY-NC 4.0 — free to use for non-commercial research and benchmarking, with attribution.
