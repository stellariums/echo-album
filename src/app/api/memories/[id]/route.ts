import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const memory = await prisma.memory.findUnique({
    where: { id: params.id },
  });
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(memory);
}

// Best-effort unlink of a local /uploads/<file> URL. URLs that point at
// Vercel Blob (or anywhere outside our /uploads/ dir) are left alone —
// Blob's TTL/garbage collection covers them.
async function unlinkLocalUpload(url: string | null): Promise<void> {
  if (!url) return;
  const match = url.match(/\/uploads\/([\w.-]+)$/);
  if (!match) return;
  const filePath = path.join(process.cwd(), "public", "uploads", match[1]);
  try {
    await unlink(filePath);
  } catch {
    // File missing or permission issue — DB row delete is the source of
    // truth, leftover orphan files are harmless.
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const memory = await prisma.memory.findUnique({
    where: { id: params.id },
  });
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await Promise.all([
    unlinkLocalUpload(memory.imageUrl),
    unlinkLocalUpload(memory.audioUrl),
  ]);

  await prisma.memory.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
