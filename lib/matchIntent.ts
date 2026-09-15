import { listEntries } from "./db";
import { KnowledgeEntry } from "./knowledgeBase";

// Server-only (pulls in lib/db.ts, which uses node:sqlite) - call this from
// an API route (see app/api/match/route.ts), never from a "use client" file.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "déclaration" -> "declaration"
    .trim();
}

// Dead-simple keyword/substring matching - no ML. This is the single seam to
// swap in a real NLU/LLM classifier later; every caller only depends on this
// function's (transcript) -> KnowledgeEntry | null signature. Checks every
// entry in the DB, so inserting a new procedure/advice row is automatically
// matchable - nothing here needs to change.
export function matchIntent(transcript: string): KnowledgeEntry | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  const entries = listEntries();
  return (
    entries.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(normalize(keyword)))
    ) ?? null
  );
}

export type { KnowledgeEntry, ProcedureEntry, AdviceEntry } from "./knowledgeBase";
