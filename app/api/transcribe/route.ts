import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface SttResult {
  transcript: string;
  raw: unknown;
}

interface SttProvider {
  id: string;
  label: string;
  transcribe(audio: Blob, language: string): Promise<SttResult>;
}

class SttConfigError extends Error {}
class SttApiError extends Error {
  detail: unknown;
  constructor(message: string, detail: unknown) {
    super(message);
    this.detail = detail;
  }
}

const DEFAULT_SAHARA_URL = "https://infer.voice.intron.io/file/v1/upload/sync";

function audioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

// Intron Sahara /upload/sync: synchronous file upload (<=120s audio), returns
// the transcript directly - no job polling needed. Docs: docs.voice.intron.io
const saharaProvider: SttProvider = {
  id: "sahara",
  label: "Intron Sahara",
  async transcribe(audio, language) {
    const apiKey = process.env.SAHARA_API_KEY;
    const apiUrl = process.env.SAHARA_API_URL || DEFAULT_SAHARA_URL;

    if (!apiKey || apiKey.startsWith("REPLACE_")) {
      throw new SttConfigError(
        "Sahara API key not configured. Set SAHARA_API_KEY in your environment."
      );
    }

    const fileName = `aiza-recording.${audioExtension(audio.type)}`;
    const forward = new FormData();
    forward.append("audio_file_name", fileName);
    forward.append("audio_file_blob", audio, fileName);
    forward.append("use_language_asr_input", language);

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: forward,
    });

    const raw = await res.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // Sahara didn't return JSON - fall through and surface the raw text
      // rather than silently swallowing the failure.
    }

    if (!res.ok) {
      throw new SttApiError(`Sahara API error (${res.status})`, parsed ?? raw);
    }

    const data = (parsed as { data?: { audio_transcript?: string } } | null)?.data;
    return { transcript: data?.audio_transcript ?? "", raw: parsed ?? raw };
  },
};

// STT engine choice is a config seam, not a hardcoded dependency: set
// STT_PROVIDER to switch. Only "sahara" ships in the product, per the
// challenge's own guidance - the 3-model comparison lives in benchmark/
// (see benchmark/REPORT.md), not in the live app. Investigated candidates:
//   - misterkissi/whisper-small-malagasy      - benchmarked (local, HF)
//   - badrex/w2v-bert-2.0-malagasy-asr        - benchmarked (local, HF)
//   - waxal-benchmarking/whisper-small-waxal-mlg - benchmarked (local, HF)
//   - Flo976/whisper-malagasy-medium          - benchmarked (local, HF)
//   - Rakitsoratra (rakitsoratra.professionnel.mg) - commercial Malagasy ASR
//     SaaS (monetized via MVola; closed service, no open weights/API)
//   - Artifisialy / ABIDI v1                  - Malagasy Text-to-Speech (TTS),
//     not STT (speech-to-text), so not applicable for ASR evaluation.
// To add an additional provider to the live app: implement SttProvider, register below.
const PROVIDERS: Record<string, SttProvider> = {
  sahara: saharaProvider,
};

// Proxies to the configured STT provider so API keys never reach the client.
export async function POST(request: NextRequest) {
  const providerId = process.env.STT_PROVIDER || "sahara";
  const provider = PROVIDERS[providerId];
  const language = process.env.SAHARA_ASR_LANGUAGE || "fr";

  if (!provider) {
    return NextResponse.json(
      { error: `Unknown STT_PROVIDER "${providerId}".` },
      { status: 500 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const audio = incoming.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio provided." }, { status: 400 });
  }

  try {
    const result = await provider.transcribe(audio, language);
    return NextResponse.json({
      transcript: result.transcript,
      raw: result.raw,
      provider: provider.id,
    });
  } catch (err) {
    if (err instanceof SttConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof SttApiError) {
      return NextResponse.json(
        { error: err.message, detail: err.detail },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: `Could not reach the ${provider.label} API.`,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
