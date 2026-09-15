"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { KnowledgeEntry, ProcedureEntry } from "@/lib/knowledgeBase";

type Source = "voice" | "text";

type AppState =
  | { screen: "home" }
  | { screen: "recording" }
  | { screen: "transcribing" }
  | { screen: "understanding"; transcript: string; source: Source }
  | { screen: "result"; transcript: string; source: Source; entry: KnowledgeEntry | null }
  | { screen: "voice_error"; message: string };

const EXAMPLE_PROMPTS = [
  { label: "CIN very", prompt: "Very ny CIN-ko, aiza no manao déclaration de perte?" },
  { label: "Kopia nahaterahana", prompt: "Mila certificat de naissance aho ho an'ny zanako" },
  { label: "Pasipaoro", prompt: "Ohatrinona ny frais pour ny passeport vaovao?" },
  { label: "Permis very", prompt: "Very ny permis de conduire-ko, inona no atao?" },
  { label: "Casier judiciaire", prompt: "Mila extrait de casier judiciaire aho eny amin'ny fitsarana" },
  { label: "Titre foncier", prompt: "Manao ahoana ny procédure ho an'ny titre foncier?" },
];

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
  const [showLegalModal, setShowLegalModal] = useState(false);

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
            <p className="prompt__fr">De quelle démarche administrative avez-vous besoin ?</p>
          </div>

          <button className="mic-button" onClick={startRecording} aria-label="Start voice recording">
            <MicIcon />
          </button>
          <p className="mic-hint">Tsindrio mba hiteny / Appuyez pour parler</p>

          <div className="divider">
            <span>na / ou</span>
          </div>

          <form className="text-fallback" onSubmit={handleTextSubmit}>
            <input
              type="text"
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              placeholder="Very ny CIN, pasipaoro, kopia..."
              aria-label="Type your question instead"
            />
            <button type="submit" disabled={!textValue.trim()}>
              Handefa
            </button>
          </form>

          {/* Quick suggestions pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "4px" }}>
            {EXAMPLE_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => proceedToUnderstanding(item.prompt, "text")}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 10px",
                  fontSize: "12px",
                  color: "var(--color-ink-soft)",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <Link
              href="/record"
              style={{
                fontSize: "12px",
                color: "var(--color-ink-soft)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              🎙️ Studio Benchmark
            </Link>

            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              style={{
                fontSize: "12px",
                color: "var(--color-ink-soft)",
                background: "transparent",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Mentions Légales & Origine
            </button>
          </div>
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
            <NotMatchedCard onTryExample={() => proceedToUnderstanding(EXAMPLE_PROMPTS[0].prompt, "text")} />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "12px" }}>
            <button className="secondary-button secondary-button--ghost" onClick={reset}>
              Hanao fanontaniana hafa / Poser une autre question
            </button>
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              style={{
                fontSize: "12px",
                color: "var(--color-ink-soft)",
                background: "transparent",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Mentions Légales & Origine du projet
            </button>
          </div>
        </main>
      )}

      {state.screen === "voice_error" && (
        <main className="screen screen--error">
          <Brand />
          <p className="error-message">{state.message}</p>
          <button className="primary-button" onClick={reset}>
            Hiverina / Retour
          </button>
        </main>
      )}

      {/* Legal & Origin Modal */}
      {showLegalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowLegalModal(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "520px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px 22px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              textAlign: "left",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "10px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--color-primary)" }}>
                Mentions Légales & Origine
              </h2>
              <button
                onClick={() => setShowLegalModal(false)}
                style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--color-ink-soft)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", lineHeight: 1.55, color: "var(--color-ink)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Identité & Concepteur
                </h3>
                <p style={{ margin: 0 }}>
                  <strong>AIZA</strong> est conçu et développé par <strong>Arozo Andriamaharo</strong>, résidant à Antananarivo, Madagascar (Contact : <code style={{ fontSize: "12px" }}>arozo.andria@gmail.com</code>).
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Contexte d&rsquo;origine
                </h3>
                <p style={{ margin: 0 }}>
                  Ce projet a été initialement créé dans le cadre du <strong>Sahara CodeSwitch Africa Challenge</strong> (organisé par <strong>Intron Health</strong>). Il a pour vocation de combler le fossé linguistique à Madagascar, où plus de 30 millions de citoyens s&rsquo;expriment naturellement en mélangeant le malgache et le français (code-switching) lors de leurs démarches administratives.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Sources & Vérifiabilité des procédures
                </h3>
                <p style={{ margin: 0 }}>
                  Toutes les démarches (CIN, acte de naissance, mariage, permis, passeport, casier judiciaire, titre foncier) sont extraites des réglementations publiques et portails officiels (Ministère de l&rsquo;Intérieur, Commune Urbaine d&rsquo;Antananarivo, Tribunal d&rsquo;Anosy, Service des Domaines). L&rsquo;application ne génère jamais de fausses procédures et s&rsquo;abstient explicitement en cas d&rsquo;absence d&rsquo;information vérifiée.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Protection des données & Vie privée
                </h3>
                <p style={{ margin: 0 }}>
                  AIZA ne stocke, n&rsquo;enregistre et ne revend aucun enregistrement vocal personnel. Le flux audio est transmis de manière chiffrée et éphémère pour transcription puis immédiatement détruit.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px", color: "var(--color-ink)" }}>
                  Projet Open Source
                </h3>
                <p style={{ margin: 0 }}>
                  Le code source complet, la documentation et le benchmark sont publics sous licence open-source :<br />
                  <a
                    href="https://github.com/arozo-andria/aiza"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-primary)", fontWeight: 600, wordBreak: "break-all" }}
                  >
                    https://github.com/arozo-andria/aiza
                  </a>
                </p>
              </section>
            </div>

            <button
              onClick={() => setShowLegalModal(false)}
              className="primary-button"
              style={{ marginTop: "18px", padding: "12px", fontSize: "14px" }}
            >
              Mazava / Compris
            </button>
          </div>
        </div>
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
        Try: &ldquo;{EXAMPLE_PROMPTS[0].prompt}&rdquo;
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
