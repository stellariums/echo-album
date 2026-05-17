import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { processMemory } from "@/lib/pipeline";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/aac",
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB

function baseMimeType(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extFromMime(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/x-m4a": "m4a",
    // Legacy: pre-patch APKs (capacitor-voice-recorder default) emitted raw
    // ADTS labelled audio/aac. Whisper rejects ".aac" but accepts ".m4a";
    // the rename alone wasn't enough (content was still ADTS, not MP4) —
    // we kept this mapping so old clients at least save with a matching
    // extension. Current APK builds use a patched plugin that emits real
    // MP4-AAC and audio/mp4.
    "audio/aac": "m4a",
  };
  return map[baseMimeType(mime)] ?? fallback;
}

async function saveFile(
  file: File,
  prefix: "img" | "aud",
  fallbackExt: string
): Promise<string> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  const ext = extFromMime(file.type, fallbackExt);
  const name = `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body" },
      { status: 400 }
    );
  }

  const image = form.get("image");
  const audio = form.get("audio");
  const userNote = (form.get("userNote") as string | null) ?? null;
  const locationText = (form.get("locationText") as string | null) ?? null;

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "Image is required" },
      { status: 400 }
    );
  }
  const imageMime = baseMimeType(image.type);
  if (!ALLOWED_IMAGE_MIME.has(imageMime)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${image.type}` },
      { status: 400 }
    );
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large (max 8MB)" },
      { status: 400 }
    );
  }

  let audioUrl: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    const audioMime = baseMimeType(audio.type);
    if (!ALLOWED_AUDIO_MIME.has(audioMime)) {
      return NextResponse.json(
        { error: `Unsupported audio type: ${audio.type}` },
        { status: 400 }
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Audio too large (max 5MB)" },
        { status: 400 }
      );
    }
    audioUrl = await saveFile(audio, "aud", "webm");
  }

  const imageUrl = await saveFile(image, "img", "jpg");

  const memory = await prisma.memory.create({
    data: {
      imageUrl,
      audioUrl,
      userNote: userNote?.trim() || null,
      locationText: locationText?.trim() || null,
      status: "pending",
    },
  });

  // Fire-and-forget the AI pipeline. The HTTP response returns immediately;
  // the client polls GET /api/memories/[id] for status changes.
  void processMemory(memory.id).catch((err) => {
    console.error(`[pipeline] memory ${memory.id} failed:`, err);
  });

  return NextResponse.json({
    id: memory.id,
    status: memory.status,
    imageUrl: memory.imageUrl,
  });
}

export async function GET() {
  const memories = await prisma.memory.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(memories);
}
