import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const AUDIO_DIR = path.join(process.cwd(), "benchmark", "audio");
const GROUND_TRUTH_PATH = path.join(process.cwd(), "benchmark", "ground_truth.json");

function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

// GET /api/record
// Returns list of sentences with recorded status, or serves audio file if ?file=... is present
export async function GET(request: NextRequest) {
  try {
    ensureAudioDir();
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (fileName) {
      if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
        return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
      }

      const filePath = path.join(AUDIO_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
      };

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    }

    let groundTruth: Array<{ id: string; text: string; topic: string }> = [];
    if (fs.existsSync(GROUND_TRUTH_PATH)) {
      groundTruth = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, "utf-8"));
    }

    const files = fs.readdirSync(AUDIO_DIR);
    const recordedMap: Record<string, string> = {};

    for (const file of files) {
      const match = file.match(/^(\d{2})\.(wav|webm|mp3|m4a|ogg|flac)$/i);
      if (match) {
        recordedMap[match[1]] = file;
      }
    }

    const sentences = groundTruth.map((item) => ({
      ...item,
      recorded: Boolean(recordedMap[item.id]),
      filename: recordedMap[item.id] || null,
      audioUrl: recordedMap[item.id] ? `/api/record?file=${encodeURIComponent(recordedMap[item.id])}` : null,
    }));

    return NextResponse.json({
      sentences,
      total: sentences.length,
      recordedCount: Object.keys(recordedMap).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read recordings", detail: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/record
// Receives formData: { id: "01", audio: Blob }
export async function POST(request: NextRequest) {
  try {
    ensureAudioDir();

    const formData = await request.formData();
    const id = formData.get("id");
    const audio = formData.get("audio");

    if (!id || typeof id !== "string" || !/^\d{2}$/.test(id)) {
      return NextResponse.json({ error: "Invalid sentence id (expected 2 digits e.g. '01')" }, { status: 400 });
    }

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 });
    }

    let ext = "webm";
    if (audio.type.includes("wav")) ext = "wav";
    else if (audio.type.includes("mp4") || audio.type.includes("m4a")) ext = "m4a";
    else if (audio.type.includes("ogg")) ext = "ogg";

    // Clean up any existing file for this id
    const existingFiles = fs.readdirSync(AUDIO_DIR);
    for (const file of existingFiles) {
      if (file.startsWith(`${id}.`)) {
        try {
          fs.unlinkSync(path.join(AUDIO_DIR, file));
        } catch {
          // ignore
        }
      }
    }

    const targetFileName = `${id}.${ext}`;
    const targetFilePath = path.join(AUDIO_DIR, targetFileName);

    const arrayBuffer = await audio.arrayBuffer();
    fs.writeFileSync(targetFilePath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      success: true,
      id,
      filename: targetFileName,
      size: audio.size,
      audioUrl: `/api/record?file=${encodeURIComponent(targetFileName)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save audio recording", detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/record?id=01
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^\d{2}$/.test(id)) {
      return NextResponse.json({ error: "Invalid sentence id" }, { status: 400 });
    }

    ensureAudioDir();
    const existingFiles = fs.readdirSync(AUDIO_DIR);
    let deleted = false;

    for (const file of existingFiles) {
      if (file.startsWith(`${id}.`)) {
        fs.unlinkSync(path.join(AUDIO_DIR, file));
        deleted = true;
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete audio recording", detail: String(error) },
      { status: 500 }
    );
  }
}
