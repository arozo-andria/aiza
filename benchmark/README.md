# AIZA Benchmark

Compares Sahara against two Malagasy-specific fine-tunes on real MG/FR
code-switched audio. See `../submission/` for why this benchmark uses its
own recordings rather than the official `AfriSwitch` dataset (gated, no
public preview, and doesn't cover Malagasy regardless).

## Setup (already done in this repo checkout)

```bash
python3 -m venv venv
./venv/bin/pip install faster-whisper jiwer torch --index-url https://download.pytorch.org/whl/cpu \
  transformers soundfile librosa huggingface_hub accelerate requests python-dotenv
brew install ffmpeg   # needed to decode .m4a/.mp3 recordings
```

## Running it

1. Drop recordings into `audio/`, named `01.*`, `02.*`, ... matching the
   `id`s in `ground_truth.json` (any audio extension librosa/ffmpeg can
   read: .wav, .m4a, .mp3, .ogg, .flac).
2. Make sure `../.env.local` has a real `SAHARA_API_KEY` (Sahara is skipped,
   not faked, if it's still the placeholder value).
3. Run:

```bash
./venv/bin/python3 run_benchmark.py
```

First run downloads and caches both HuggingFace models (~3.2GB total, one
time only - `HF_HOME` is not overridden here so they cache to the default
`~/.cache/huggingface`; models_cache/ from the initial exploratory download
is gitignored and can be deleted).

## Output

- `results.json` - every model's raw hypothesis + WER/CER per utterance
- `REPORT.md` - the submission-ready report (summary table + per-utterance
  breakdown + the dataset-coverage note)

## Models compared

| Label | Source | Notes |
|---|---|---|
| `sahara` | Intron Sahara (`infer.voice.intron.io`) | What AIZA ships with |
| `whisper-small-malagasy` | `misterkissi/whisper-small-malagasy` on HF | Whisper-small fine-tuned for Malagasy |
| `w2v-bert-2.0-malagasy-asr` | `badrex/w2v-bert-2.0-malagasy-asr` on HF | Wav2Vec2-BERT fine-tuned for Malagasy |

Both local models run fully offline via `transformers` - no API key, no
rate limits, no dependency on anything landing in time.
