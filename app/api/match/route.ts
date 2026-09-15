import { NextRequest, NextResponse } from "next/server";
import { matchIntent } from "@/lib/matchIntent";

export const runtime = "nodejs";

// Runs keyword matching against the SQLite-backed knowledge base server-side
// (node:sqlite can't run in the browser) and returns the matched entry, if
// any - null means "no verified match," which the client renders honestly
// rather than guessing.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const transcript = (body as { transcript?: unknown })?.transcript;
  if (typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json({ error: "Missing transcript." }, { status: 400 });
  }

  const entry = matchIntent(transcript);
  return NextResponse.json({ entry });
}
