"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
// Type-only: matching itself now runs server-side in app/api/match/route.ts
// (it queries the SQLite KB via node:sqlite, which can't run in the
// browser) - import the value from "@/lib/matchIntent" here and Next would
// try to bundle node:sqlite for the client and fail the build.
import type { KnowledgeEntry, ProcedureEntry } from "@/lib/knowledgeBase";

type Source = "voice" | "text";

type AppState =
  | { screen: "home" }
  | { screen: "recording" }
  | { screen: "transcribing" }
  | { screen: "understanding"; transcript: string; source: Source }
  | { screen: "result"; transcript: string; source: Source; entry: KnowledgeEntry | null }
  | { screen: "voice_error"; message: string };

const EXAMPLE_PROMPT = "Very ny CIN-ko, aiza no manao déclaration de perte?";
const MAX_RECORDING_MS = 20_000;
const UNDERSTANDING_DELAY_MS = { voice: 1100, text: 1300 } as const;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find(
    (type) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)
  );
}

export function AizaApp() {
  const [state, setState] = useState<AppState>({ screen: "home" });
  const [textValue, setTextValue] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const understandingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (understandingRef.current) clearTimeout(understandingRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function reset() {
    setTextValue("");
    setState({ screen: "home" });
  }

  function proceedToUnderstanding(transcript: string, source: Source) {
    setState({ screen: "understanding", transcript, source });

    const minDelay = new Promise<void>((resolve) => {
      understandingRef.current = setTimeout(resolve, UNDERSTANDING_DELAY_MS[source]);
    });
    const matchRequest = fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })
      .then((res) => (res.ok ? res.json() : { entry: null }))
      .catch(() => ({ entry: null }));

    Promise.all([matchRequest, minDelay]).then(([{ entry }]) => {
      setState({ screen: "result", transcript, source, entry: entry ?? null });
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        void handleRecordedAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState({ screen: "recording" });

      autoStopRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      setState({
        screen: "voice_error",
        message:
          "Tsy afaka nampiasa ny mikrô. / Couldn't access the microphone. Try typing your question instead.",
      });
    }
  }

  function stopRecording() {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleRecordedAudio(blob: Blob) {
    setState({ screen: "transcribing" });
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setState({
          screen: "voice_error",
          message:
            (data && data.error) ||
            "Sahara transcription failed. Try typing your question instead.",
        });
        return;
      }

      const transcript = ((data && data.transcript) || "").trim();
      if (!transcript) {
        setState({
          screen: "voice_error",
          message:
            "Tsy nisy teny azo hita. / No speech was detected. Try typing your question instead.",
        });
        return;
      }

      proceedToUnderstanding(transcript, "voice");
    } catch {
      setState({
        screen: "voice_error",
        message: "Network error reaching Sahara. Try typing your question instead.",
      });
    }
  }

  function handleTextSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = textValue.trim();
    if (!trimmed) return;
    proceedToUnderstanding(trimmed, "text");
  }

  return (
    <div className="app-shell">
      {state.screen === "home" && (
        <main className="screen screen--home">
          <Brand />
          <div className="prompt">
            <p className="prompt__mg">Inona no ilainao?</p>
            <p className="prompt__fr">What do you need?</p>
          </div>

          <button className="mic-button" onClick={startRecording} aria-label="Start voice recording">
            <MicIcon />
          </button>
          <p className="mic-hint">Tap to speak</p>

          <div className="divider">
            <span>or</span>
          </div>

          <form className="text-fallback" onSubmit={handleTextSubmit}>
            <input
              type="text"
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              placeholder={EXAMPLE_PROMPT}
              aria-label="Type your question instead"
            />
            <button type="submit" disabled={!textValue.trim()}>
              Send
            </button>
          </form>
          <p className="example-hint">Type instead — useful if voice isn&rsquo;t working.</p>
          <Link
            href="/record"
            style={{
              marginTop: "16px",
              fontSize: "13px",
              color: "var(--color-ink-soft)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-full)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span>🎙️</span> Studio d&rsquo;enregistrement Benchmark
          </Link>
        </main>
      )}

      {state.screen === "recording" && (
        <main className="screen screen--recording">
          <div className="pulse-wrap">
            <div className="pulse-ring" />
            <button
              className="mic-button mic-button--active"
              onClick={stopRecording}
              aria-label="Stop recording"
              style={{ position: "relative" }}
            >
              <StopIcon />
            </button>
          </div>
          <p className="recording-label">Mihaino izao… / Listening…</p>
          <p className="recording-hint">Tap to stop</p>
        </main>
      )}

      {state.screen === "transcribing" && (
        <main className="screen screen--processing">
          <div className="spinner" />
          <p className="processing-label">Mandika ny feonao… / Transcribing your voice…</p>
        </main>
      )}

      {state.screen === "understanding" && (
        <main className="screen screen--processing">
          <TranscriptBlock
            className="transcript-preview"
            source={state.source}
            transcript={state.transcript}
          />
          <div className="spinner" />
          <p className="processing-label">Mamantatra ny fangatahanao… / Understanding your request…</p>
        </main>
      )}

      {state.screen === "result" && (
        <main className="screen screen--result">
          <Brand />
          <TranscriptBlock
            className="transcript-recap"
            source={state.source}
            transcript={state.transcript}
          />

          {state.entry ? (
            <MatchedCard entry={state.entry} />
          ) : (
            <NotMatchedCard onTryExample={() => proceedToUnderstanding(EXAMPLE_PROMPT, "text")} />
          )}

          <button className="secondary-button secondary-button--ghost" onClick={reset}>
            Ask another question
          </button>
        </main>
      )}

      {state.screen === "voice_error" && (
        <main className="screen screen--error">
          <Brand />
          <p className="error-message">{state.message}</p>
          <button className="primary-button" onClick={reset}>
            Back
          </button>
        </main>
      )}
    </div>
  );
}

function Brand() {
  return (
    <header className="brand">
      <div className="brand__mark">A</div>
      <h1 className="brand__name">AIZA</h1>
    </header>
  );
}

function TranscriptBlock({
  transcript,
  source,
  className,
}: {
  transcript: string;
  source: Source;
  className: string;
}) {
  return (
    <div className={className}>
      <span className="transcript-preview__label transcript-recap__label">
        {source === "voice" ? "Voice transcript (raw)" : "Typed input"}
      </span>
      <p className="transcript-preview__text transcript-recap__text">&ldquo;{transcript}&rdquo;</p>
    </div>
  );
}

function MatchedCard({ entry }: { entry: KnowledgeEntry }) {
  return (
    <div className="result-card result-card--matched">
      <span className="badge badge--verified">✓ Verified</span>

      <div>
        <h2>{entry.title_mg}</h2>
        <p className="result-card__subtitle">{entry.title_fr}</p>
      </div>

      {entry.kind === "procedure" ? (
        <ProcedureBody entry={entry} />
      ) : (
        <section>
          <p>{entry.body_mg}</p>
          <p className="result-card__subtitle">{entry.body_fr}</p>
        </section>
      )}

      <footer className="result-source">
        <p>Source: {entry.source}</p>
        <p>Last verified: {entry.last_verified}</p>
      </footer>
    </div>
  );
}

function ProcedureBody({ entry }: { entry: ProcedureEntry }) {
  return (
    <>
      <section>
        <h3>Required documents / Antontan-taratasy ilaina</h3>
        <ul>
          {entry.required_documents.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Steps / Dingana</h3>
        <ol>
          {entry.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <dl className="result-meta">
        <div>
          <dt>Where / Aiza</dt>
          <dd>{entry.service_location}</dd>
        </div>
        <div>
          <dt>Cost / Vidiny</dt>
          <dd>{entry.cost}</dd>
        </div>
        <div>
          <dt>Processing time / Faharetana</dt>
          <dd>{entry.processing_time}</dd>
        </div>
      </dl>
    </>
  );
}

function NotMatchedCard({ onTryExample }: { onTryExample: () => void }) {
  return (
    <div className="result-card result-card--unmatched">
      <span className="badge badge--unverified">No verified match</span>

      <p className="unmatched-message">
        Tsy manana fomba voamarina ho an&rsquo;izany aho hatramin&rsquo;izao — ary tsy te hanao vinavina.
      </p>
      <p className="unmatched-message">
        I don&rsquo;t have a verified procedure for this yet, and I don&rsquo;t want to guess.
      </p>
      <p className="unmatched-suggestion">Here&rsquo;s what I do have verified:</p>

      <button className="secondary-button" onClick={onTryExample}>
        Try: &ldquo;{EXAMPLE_PROMPT}&rdquo;
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
        fill="currentColor"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}
