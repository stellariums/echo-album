import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processMemory } from "@/lib/pipeline";

// POST /api/memories/[id]/process — retry the AI pipeline for an existing memory.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const memory = await prisma.memory.findUnique({
    where: { id: params.id },
  });
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  void processMemory(memory.id).catch((err) => {
    console.error(`[pipeline] retry memory ${memory.id} failed:`, err);
  });

  return NextResponse.json({ id: memory.id, status: "processing" });
}
