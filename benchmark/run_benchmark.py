#!/usr/bin/env python3
"""
Benchmark Sahara vs. two Malagasy-specific fine-tunes on real MG/FR
code-switched audio (AIZA's actual target domain).

Usage:
    ./venv/bin/python3 run_benchmark.py

Expects:
    audio/01.*, audio/02.*, ... - recordings matching ground_truth.json ids
    ../.env.local               - SAHARA_API_KEY (Sahara is skipped, not
                                   faked, if this isn't set yet)

Outputs:
    results.json - raw per-utterance transcripts + metrics
    REPORT.md     - the submission-ready benchmark report
"""
import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Optional, Tuple

import requests
from jiwer import wer, cer

BENCHMARK_DIR = Path(__file__).parent
AUDIO_DIR = BENCHMARK_DIR / "audio"
GROUND_TRUTH_PATH = BENCHMARK_DIR / "ground_truth.json"
ENV_LOCAL_PATH = BENCHMARK_DIR.parent / ".env.local"

SAHARA_URL = "https://infer.voice.intron.io/file/v1/upload/sync"
SAHARA_LANGUAGE = "fr"

MODELS = {
    "whisper-small-malagasy": "misterkissi/whisper-small-malagasy",
    "whisper-small-waxal-mlg": "waxal-benchmarking/whisper-small-waxal-mlg",
}


def load_env_local() -> dict:
    env = {}
    if ENV_LOCAL_PATH.exists():
        for line in ENV_LOCAL_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def find_audio_files() -> dict:
    if not AUDIO_DIR.exists():
        return {}
    files = {}
    for f in sorted(AUDIO_DIR.iterdir()):
        if f.suffix.lower() in (".wav", ".m4a", ".mp3", ".ogg", ".flac", ".webm"):
            match = re.match(r"^(\d{2})", f.stem)
            key = match.group(1) if match else f.stem
            files[key] = f
    return files


def normalize(text: str) -> str:
    text = text.lower().strip()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def transcribe_sahara(audio_path: Path, api_key: str) -> Tuple[str, float, Optional[str]]:
    start = time.time()
    try:
        mime = "audio/webm" if audio_path.suffix.lower() == ".webm" else "audio/wav"
        with open(audio_path, "rb") as f:
            resp = requests.post(
                SAHARA_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"audio_file_blob": (audio_path.name, f, mime)},
                data={
                    "audio_file_name": audio_path.name,
                    "use_language_asr_input": SAHARA_LANGUAGE,
                },
                timeout=60,
            )
        elapsed = time.time() - start
        if not resp.ok:
            return "", elapsed, f"HTTP {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        transcript = data.get("data", {}).get("audio_transcript", "")
        return transcript, elapsed, None
    except Exception as e:  # noqa: BLE001 - benchmark script, surface any failure
        return "", time.time() - start, str(e)


def main():
    env = load_env_local()
    sahara_key = env.get("SAHARA_API_KEY", "")
    sahara_available = bool(sahara_key) and not sahara_key.startswith("REPLACE_")

    ground_truth = json.loads(GROUND_TRUTH_PATH.read_text())
    audio_files = find_audio_files()

    if not audio_files:
        print(f"No audio files found in {AUDIO_DIR}.")
        print("Drop recordings named 01.*, 02.*, ... (matching ground_truth.json ids) there first.")
        sys.exit(1)

    print(f"Found {len(audio_files)} audio file(s): {sorted(audio_files.keys())}")
    print(f"Sahara: {'available' if sahara_available else 'SKIPPED (no SAHARA_API_KEY in .env.local yet)'}")
    print()

    print("Loading local models (first run downloads/caches weights)...")
    from transformers import pipeline

    local_pipelines = {}
    for label, model_id in MODELS.items():
        print(f"  loading {label} ({model_id})...")
        try:
            local_pipelines[label] = pipeline(
                "automatic-speech-recognition", model=model_id, device="cpu"
            )
            print(f"  ✅ {label} loaded successfully.")
        except Exception as e:
            if "whisper" in model_id.lower():
                try:
                    from transformers import WhisperTokenizer
                    tok = WhisperTokenizer.from_pretrained(
                        "openai/whisper-small", language="malagasy", task="transcribe"
                    )
                    local_pipelines[label] = pipeline(
                        "automatic-speech-recognition",
                        model=model_id,
                        tokenizer=tok,
                        device="cpu"
                    )
                    print(f"  ✅ {label} loaded successfully with fallback tokenizer.")
                    continue
                except Exception as e2:
                    e = e2
            print(f"  ⚠️ Could not load {label} ({e}) - will skip in this run.")

    print(f"\nLocal models ready: {list(local_pipelines.keys())}\n")

    model_labels = (["sahara"] if sahara_available else []) + list(local_pipelines.keys())
    results = []

    for entry in ground_truth:
        audio_path = audio_files.get(entry["id"])
        if not audio_path:
            print(f"  [{entry['id']}] no matching audio file - skipping")
            continue

        print(f"[{entry['id']}] {entry['text']}")
        row = {
            "id": entry["id"],
            "topic": entry["topic"],
            "reference": entry["text"],
            "audio_file": audio_path.name,
            "models": {},
        }

        if sahara_available:
            transcript, elapsed, error = transcribe_sahara(audio_path, sahara_key)
            row["models"]["sahara"] = {
                "hypothesis": transcript,
                "latency_s": round(elapsed, 2),
                "error": error,
            }
            tag = f"  [ERROR: {error}]" if error else ""
            print(f"    sahara                    ({elapsed:5.1f}s): {transcript!r}{tag}")

        for label in local_pipelines:
            start = time.time()
            try:
                out = local_pipelines[label](str(audio_path))
                transcript = out["text"] if isinstance(out, dict) else str(out)
                error = None
            except Exception as e:  # noqa: BLE001
                transcript = ""
                error = str(e)
            elapsed = time.time() - start
            row["models"][label] = {
                "hypothesis": transcript,
                "latency_s": round(elapsed, 2),
                "error": error,
            }
            tag = f"  [ERROR: {error}]" if error else ""
            print(f"    {label:26s}({elapsed:5.1f}s): {transcript!r}{tag}")

        results.append(row)
        print()

    summary = {label: {"wer": [], "cer": [], "latency": []} for label in model_labels}
    for row in results:
        ref_norm = normalize(row["reference"])
        for label in model_labels:
            m = row["models"].get(label)
            if not m or m.get("error"):
                continue
            hyp_norm = normalize(m["hypothesis"])
            try:
                w = wer(ref_norm, hyp_norm) if ref_norm else None
                c = cer(ref_norm, hyp_norm) if ref_norm else None
            except Exception:  # noqa: BLE001
                w, c = None, None
            m["wer"] = w
            m["cer"] = c
            if w is not None:
                summary[label]["wer"].append(w)
            if c is not None:
                summary[label]["cer"].append(c)
            summary[label]["latency"].append(m["latency_s"])

    def avg(xs):
        return round(sum(xs) / len(xs), 4) if xs else None

    summary_table = {
        label: {
            "n": len(summary[label]["wer"]),
            "avg_wer": avg(summary[label]["wer"]),
            "avg_cer": avg(summary[label]["cer"]),
            "avg_latency_s": avg(summary[label]["latency"]),
        }
        for label in model_labels
    }

    output = {
        "sahara_available": sahara_available,
        "models": {
            **({"sahara": "Intron Sahara (voice.intron.io)"} if sahara_available else {}),
            **MODELS,
        },
        "summary": summary_table,
        "results": results,
    }

    (BENCHMARK_DIR / "results.json").write_text(
        json.dumps(output, indent=2, ensure_ascii=False)
    )
    print("Wrote results.json")

    write_report(output)
    print("Wrote REPORT.md")


def write_report(output: dict):
    lines = []
    lines.append("# AIZA Code-Switching Benchmark Report\n")
    lines.append(
        "Comparing Sahara against two Malagasy-specific fine-tunes on real, "
        "self-recorded Malagasy/French code-switched administrative queries "
        "(AIZA's actual target domain - see the dataset coverage note below "
        "for why this benchmark uses its own audio rather than the official "
        "AfriSwitch benchmark).\n"
    )

    lines.append("## Models\n")
    for label, model_id in output["models"].items():
        lines.append(f"- **{label}**: `{model_id}`")
    lines.append("")

    lines.append("## Summary (lower WER/CER is better)\n")
    lines.append("| Model | N | Avg WER | Avg CER | Avg latency (s) |")
    lines.append("|---|---|---|---|---|")
    for label, s in output["summary"].items():
        wer_s = f"{s['avg_wer']:.1%}" if s["avg_wer"] is not None else "n/a"
        cer_s = f"{s['avg_cer']:.1%}" if s["avg_cer"] is not None else "n/a"
        lat_s = f"{s['avg_latency_s']:.1f}" if s["avg_latency_s"] is not None else "n/a"
        lines.append(f"| {label} | {s['n']} | {wer_s} | {cer_s} | {lat_s} |")
    lines.append("")

    lines.append("## Per-utterance results\n")
    for row in output["results"]:
        lines.append(f"### {row['id']} — {row['topic']}")
        lines.append(f"**Reference:** {row['reference']}\n")
        for label, m in row["models"].items():
            metrics = ""
            if m.get("wer") is not None:
                metrics = f" _(WER {m['wer']:.1%}, CER {m['cer']:.1%})_"
            err = f"  ⚠️ {m['error']}" if m.get("error") else ""
            lines.append(f"- **{label}**: {m['hypothesis']!r}{metrics}{err}")
        lines.append("")

    lines.append("## Dataset coverage note\n")
    lines.append(
        "Sahara's published language list (confirmed via docs.voice.intron.io "
        "and the challenge's own WhatsApp announcement) does not include "
        "Malagasy. The official `intronhealth/AfriSwitch` benchmark - 14 "
        "African languages code-switched with English - also does not include "
        "Malagasy, and the dataset itself is manually gated with no public "
        "preview, so we could not rely on approval landing before the "
        "deadline. No public code-switched Malagasy/French benchmark dataset "
        "appears to exist yet. That gap is itself a finding, not just a "
        "limitation: it's why AIZA always shows the raw transcript rather "
        "than silently 'correcting' it, and always offers a typed fallback "
        "instead of guessing when confidence is low.\n"
    )

    (BENCHMARK_DIR / "REPORT.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
