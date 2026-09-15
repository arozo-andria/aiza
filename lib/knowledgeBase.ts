// Extensible knowledge-base schema, persisted in SQLite (lib/db.ts). This
// file is the pure types + seed data (safe to import from client
// components); lib/db.ts owns actual storage/queries and is server-only.
// SEED_ENTRIES seeds the DB on first run - after that, the DB is the source
// of truth, so appending a procedure/advice entry later means an INSERT
// (with its own history row), not editing this file.

export type EntryKind = "procedure" | "advice";

export interface HistoryEntry {
  date: string; // ISO date (YYYY-MM-DD)
  note: string; // what was verified/changed at that date
}

interface KnowledgeEntryBase {
  id: string; // stable key, e.g. "lost_cin"
  kind: EntryKind;
  // MG/FR trigger phrases checked against the transcript by matchIntent.
  keywords: string[];
  title_mg: string;
  title_fr: string;
  source: string;
  last_verified: string;
  history: HistoryEntry[];
}

export interface ProcedureEntry extends KnowledgeEntryBase {
  kind: "procedure";
  required_documents: string[];
  steps: string[];
  service_location: string;
  cost: string;
  processing_time: string;
}

export interface AdviceEntry extends KnowledgeEntryBase {
  kind: "advice";
  body_mg: string;
  body_fr: string;
}

export type KnowledgeEntry = ProcedureEntry | AdviceEntry;

// Baked in at build time by next.config.js. Falls back to "now" only if that
// ever runs outside a Next.js build (e.g. a bare `tsx` script).
const BUILD_DATE =
  process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

export const LOST_CIN_PROCEDURE: ProcedureEntry = {
  id: "lost_cin",
  kind: "procedure",
  keywords: [
    "very",
    "very ny cin",
    "kara-panondrom-pirenena",
    "perte",
    "perdu",
    "perdue",
    "j'ai perdu",
    "cin",
    "carte d'identite",
    "carte d identite",
    "declaration de perte",
  ],
  title_mg: "Very ny CIN — Fanaovana fanambarana very",
  title_fr: "Perte de CIN — Déclaration de perte",
  required_documents: [
    "Certificat de résidence + photo",
    "Déclaration de perte de CIN",
    "Photocopie de l'ancienne CIN (si disponible)",
    "Fiche mère",
    "Photos d'identité",
    "Carnet de fokontany",
  ],
  steps: [
    "Se présenter au Fokontany pour le carnet et le certificat de résidence",
    "Constitution du dossier auprès du Chef de l'Arrondissement Administratif (commune)",
    "Vérification et signature du dossier par le Chef de District",
    "Retour à l'Arrondissement Administratif pour la délivrance de la nouvelle CIN",
  ],
  service_location:
    "Arrondissement Administratif (bureau de la commune) — via le Fokontany de résidence",
  cost: "1 200 Ar",
  processing_time: "24 à 48 heures",
  source: "Ivotoro.mg — Procédure officielle Carte d'Identité Nationale (Commune)",
  last_verified: BUILD_DATE,
  history: [{ date: BUILD_DATE, note: "Initial verified entry for MVP launch." }],
};

// Only used to seed an empty DB (see lib/db.ts) - not read at request time.
export const SEED_ENTRIES: KnowledgeEntry[] = [LOST_CIN_PROCEDURE];
