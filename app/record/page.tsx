"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Sentence {
  id: string;
  text: string;
  topic: string;
  recorded: boolean;
  filename: string | null;
  audioUrl: string | null;
}

export default function RecordPage() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSentences();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  async function fetchSentences() {
    try {
      setLoading(true);
      const res = await fetch("/api/record");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSentences(data.sentences || []);
    } catch {
      setErrorMsg("Tsy afaka naka ny lisitry ny fehezanteny.");
    } finally {
      setLoading(false);
    }
  }

  function stopRecordingCleanup() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }

  async function startRecording(id: string) {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            mimeType = candidate;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await uploadRecording(id, audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setActiveRecordingId(id);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setErrorMsg("Tsy afaka nampiasa ny mikrô. Hamarino azafady ny alalana (microphone permission).");
      setActiveRecordingId(null);
    }
  }

  function stopRecording() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setActiveRecordingId(null);
  }

  async function uploadRecording(id: string, blob: Blob) {
    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append("id", id);
      formData.append("audio", blob, `${id}.webm`);

      const res = await fetch("/api/record", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setSentences((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, recorded: true, filename: data.filename, audioUrl: data.audioUrl }
            : s
        )
      );
    } catch {
      setErrorMsg(`Tsy tafakatra ny rakipeo ho an'ny laharana ${id}.`);
    } finally {
      setUploadingId(null);
    }
  }

  async function deleteRecording(id: string) {
    if (!confirm(`Hafafa tokoa ve ny rakipeo laharana ${id}?`)) return;
    try {
      const res = await fetch(`/api/record?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSentences((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, recorded: false, filename: null, audioUrl: null } : s
        )
      );
    } catch {
      setErrorMsg("Tsy nahomby ny famafana.");
    }
  }

  const recordedCount = sentences.filter((s) => s.recorded).length;
  const progressPercent = sentences.length ? Math.round((recordedCount / sentences.length) * 100) : 0;

  return (
    <div className="app-shell" style={{ justifyContent: "center" }}>
      <main className="screen" style={{ maxWidth: "620px", gap: "20px" }}>
        <header style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "14.5px" }}>
            ← Hiverina amin&rsquo;ny AIZA
          </Link>
          <span style={{ fontSize: "12px", color: "var(--color-ink-soft)", fontWeight: 500 }}>
            Benchmark Studio
          </span>
        </header>

        <div style={{ width: "100%", textAlign: "left" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px", color: "var(--color-ink)" }}>
            Fandraisam-peo ho an&rsquo;ny Benchmark
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-ink-soft)", margin: 0, lineHeight: 1.5 }}>
            Enregistrez les 10 phrases de test en malgache/français pour évaluer Sahara et les modèles comparatifs.
          </p>
        </div>

        {errorMsg && (
          <div style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "14px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Progress Card */}
        <div style={{ width: "100%", background: "var(--color-surface)", padding: "18px 20px", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "15px" }}>Fandrosoana / Progression</span>
            <span style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "16px" }}>
              {recordedCount} / {sentences.length} ({progressPercent}%)
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "var(--color-bg)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", background: "var(--color-primary)", transition: "width 0.3s ease" }} />
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--color-ink-soft)", margin: 0 }}>
            {recordedCount === sentences.length
              ? "✅ Voaray avokoa ny rakipeo rehetra! Azo atao ny manomboka ny benchmark."
              : "Vakio mazava amin'ny feo voajanahary ny fehezanteny tsirairay avy."}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--color-ink-soft)", fontSize: "14px" }}>Mampiditra ny fehezanteny…</p>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            {sentences.map((item) => {
              const isRecordingThis = activeRecordingId === item.id;
              const isUploadingThis = uploadingId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-lg)",
                    border: isRecordingThis ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-card)",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-primary)", background: "var(--color-bg)", padding: "4px 10px", borderRadius: "var(--radius-full)" }}>
                      #{item.id} · {item.topic}
                    </span>
                    {item.recorded ? (
                      <span className="badge badge--verified" style={{ fontSize: "12px", padding: "3px 10px" }}>
                        ✓ Voarakitra (Enregistré)
                      </span>
                    ) : (
                      <span className="badge badge--unverified" style={{ fontSize: "12px", padding: "3px 10px" }}>
                        Tsy mbola voarakitra
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--color-ink)", lineHeight: 1.4, margin: 0 }}>
                    &ldquo;{item.text}&rdquo;
                  </p>

                  {/* Audio player if already recorded */}
                  {item.recorded && item.audioUrl && !isRecordingThis && (
                    <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <audio controls src={item.audioUrl} style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
                    </div>
                  )}

                  {/* Action row */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                    {isRecordingThis ? (
                      <button
                        onClick={stopRecording}
                        className="primary-button"
                        style={{
                          background: "#dc2626",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "12px",
                        }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#fff" }} />
                        Hajanona ({recordingSeconds}s) / Arrêter
                      </button>
                    ) : isUploadingThis ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-ink-soft)", fontSize: "14px" }}>
                        <div className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} />
                        Mandraikitra ny feo… (Sauvegarde…)
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                        <button
                          onClick={() => startRecording(item.id)}
                          disabled={activeRecordingId !== null}
                          className="primary-button"
                          style={{
                            flex: 1,
                            padding: "12px 16px",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                          </svg>
                          {item.recorded ? "Averina raisina (Réenregistrer)" : "Handray feo (Enregistrer)"}
                        </button>

                        {item.recorded && (
                          <button
                            onClick={() => deleteRecording(item.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-md)",
                              padding: "0 14px",
                              color: "#dc2626",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            title="Fafana / Supprimer"
                          >
                            Fafana
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer style={{ width: "100%", textAlign: "center", padding: "20px 0", borderTop: "1px solid var(--color-border)", marginTop: "12px" }}>
          <p style={{ fontSize: "13px", color: "var(--color-ink-soft)", margin: "0 0 10px" }}>
            Rehefa voaray ny feo rehetra, mandehana ao amin&rsquo;ny terminal:
          </p>
          <code style={{ display: "block", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px", fontSize: "12.5px", color: "var(--color-primary-dark)", wordBreak: "break-all" }}>
            ./benchmark/venv/bin/python3 run_benchmark.py
          </code>
        </footer>
      </main>
    </div>
  );
}
