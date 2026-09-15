import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import {
  AdviceEntry,
  HistoryEntry,
  KnowledgeEntry,
  ProcedureEntry,
  SEED_ENTRIES,
} from "./knowledgeBase";

// Server-only (uses node:sqlite - never import this from a "use client" file).
//
// The DB file ships bundled/committed (data/aiza.db) so reads work on
// Vercel's read-only serverless filesystem with zero setup. Writes work
// locally but won't persist across requests in production - serverless
// instances don't share or keep a writable disk. That's fine for what this
// MVP needs today (the KB is read-mostly), but a real "add a procedure from
// the app" admin flow would need a hosted DB (e.g. Turso/LibSQL, Postgres)
// instead of a local file. Noted here rather than silently broken.
const DB_PATH = path.join(process.cwd(), "data", "aiza.db");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;

  // If the file already exists (committed/pre-seeded, e.g. shipped in the
  // Vercel deployment bundle), open read-only and never attempt a write -
  // serverless functions get a read-only filesystem outside /tmp. Only a
  // first local run (no file yet) opens read-write to bootstrap + seed it.
  const alreadyExists = fs.existsSync(DB_PATH);

  if (alreadyExists) {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
    return db;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('procedure', 'advice')),
      title_mg TEXT NOT NULL,
      title_fr TEXT NOT NULL,
      source TEXT NOT NULL,
      last_verified TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keywords (
      entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      note TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_keywords_entry ON keywords(entry_id);
    CREATE INDEX IF NOT EXISTS idx_history_entry ON history(entry_id);
  `);

  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: DatabaseSync) {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM knowledge_entries")
    .get() as { count: number };
  if (count > 0) return;

  for (const entry of SEED_ENTRIES) {
    insertEntry(entry, db);
  }
}

type KindSpecificData =
  | Pick<ProcedureEntry, "required_documents" | "steps" | "service_location" | "cost" | "processing_time">
  | Pick<AdviceEntry, "body_mg" | "body_fr">;

export function insertEntry(entry: KnowledgeEntry, dbOverride?: DatabaseSync) {
  const conn = dbOverride ?? getDb();

  const data: KindSpecificData =
    entry.kind === "procedure"
      ? {
          required_documents: entry.required_documents,
          steps: entry.steps,
          service_location: entry.service_location,
          cost: entry.cost,
          processing_time: entry.processing_time,
        }
      : { body_mg: entry.body_mg, body_fr: entry.body_fr };

  conn
    .prepare(
      `INSERT INTO knowledge_entries (id, kind, title_mg, title_fr, source, last_verified, data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind = excluded.kind, title_mg = excluded.title_mg, title_fr = excluded.title_fr,
         source = excluded.source, last_verified = excluded.last_verified, data_json = excluded.data_json`
    )
    .run(
      entry.id,
      entry.kind,
      entry.title_mg,
      entry.title_fr,
      entry.source,
      entry.last_verified,
      JSON.stringify(data)
    );

  const insertKeyword = conn.prepare(
    "INSERT INTO keywords (entry_id, keyword) VALUES (?, ?)"
  );
  conn.prepare("DELETE FROM keywords WHERE entry_id = ?").run(entry.id);
  for (const keyword of entry.keywords) insertKeyword.run(entry.id, keyword);

  const insertHistory = conn.prepare(
    "INSERT INTO history (entry_id, date, note) VALUES (?, ?, ?)"
  );
  for (const h of entry.history) insertHistory.run(entry.id, h.date, h.note);
}

// Appends one history row without touching the rest of the entry - this is
// the "insert procedures/conseils avec historique" path: verifying an
// existing entry again later is a new row, not an overwrite.
export function addHistoryNote(entryId: string, note: HistoryEntry) {
  getDb()
    .prepare("INSERT INTO history (entry_id, date, note) VALUES (?, ?, ?)")
    .run(entryId, note.date, note.note);
}

export function listEntries(): KnowledgeEntry[] {
  const conn = getDb();
  const rows = conn.prepare("SELECT * FROM knowledge_entries").all() as Array<{
    id: string;
    kind: "procedure" | "advice";
    title_mg: string;
    title_fr: string;
    source: string;
    last_verified: string;
    data_json: string;
  }>;

  const keywordStmt = conn.prepare(
    "SELECT keyword FROM keywords WHERE entry_id = ?"
  );
  const historyStmt = conn.prepare(
    "SELECT date, note FROM history WHERE entry_id = ? ORDER BY id ASC"
  );

  return rows.map((row) => {
    const keywords = (keywordStmt.all(row.id) as Array<{ keyword: string }>).map(
      (k) => k.keyword
    );
    const history = (
      historyStmt.all(row.id) as Array<{ date: string; note: string }>
    ).map((h) => ({ date: h.date, note: h.note }));
    const data = JSON.parse(row.data_json);

    const base = {
      id: row.id,
      title_mg: row.title_mg,
      title_fr: row.title_fr,
      source: row.source,
      last_verified: row.last_verified,
      keywords,
      history,
    };

    return row.kind === "procedure"
      ? ({ ...base, kind: "procedure", ...data } as ProcedureEntry)
      : ({ ...base, kind: "advice", ...data } as AdviceEntry);
  });
}
