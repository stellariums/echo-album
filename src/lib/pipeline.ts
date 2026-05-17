// Memory processing pipeline.
//   1. Mark status='analyzing'
//   2. Run vision + ASR in parallel
//   3. Mark status='composing', generate memory card via LLM
//   4. Save result, set status to completed/partial/failed
//
// Status timeline (seen by the polling client):
//   pending → analyzing → composing → {completed|partial|failed}

import { prisma } from "./db";
import { analyzeImage, type VisionResult } from "./ai/vision";
import { transcribeAudio } from "./ai/asr";
import { generateMemoryCard } from "./ai/llm";

export async function processMemory(id: string): Promise<void> {
  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory) throw new Error(`Memory not found: ${id}`);

  await prisma.memory.update({
    where: { id },
    data: { status: "analyzing", errorMessage: null },
  });

  const errors: string[] = [];
  let vision: VisionResult | null = null;
  let speechText: string | null = null;

  // --- Step 1: vision + ASR in parallel ---
  // imageUrl/audioUrl are absolute https URLs (Vercel Blob); the AI helpers
  // fetch the bytes themselves.
  const tasks: Promise<unknown>[] = [
    analyzeImage(memory.imageUrl)
      .then((r) => {
        vision = r;
      })
      .catch((err) => {
        errors.push(`vision: ${err instanceof Error ? err.message : String(err)}`);
      }),
  ];

  if (memory.audioUrl) {
    tasks.push(
      transcribeAudio(memory.audioUrl)
        .then((t) => {
          speechText = t;
        })
        .catch((err) => {
          errors.push(`asr: ${err instanceof Error ? err.message : String(err)}`);
        })
    );
  }

  await Promise.all(tasks);

  // Move into the composing phase so the UI can swap its progress text.
  // (Cast through `as` because TS doesn't track mutations of `vision` through the
  //  .then() closures above, narrowing it incorrectly to `never`.)
  const v = vision as VisionResult | null;
  const s = speechText as string | null;

  await prisma.memory.update({
    where: { id },
    data: {
      status: "composing",
      visionCaption: v?.visionCaption ?? null,
      ocrText: v?.ocrText ?? null,
      speechText: s,
    },
  });

  // --- Step 2: memory card generation ---
  // Try LLM even if vision/ASR partially failed — user note alone can be enough.
  let card: Awaited<ReturnType<typeof generateMemoryCard>> | null = null;
  try {
    card = await generateMemoryCard({
      visionCaption: v?.visionCaption ?? "",
      ocrText: v?.ocrText ?? "",
      speechText: s ?? "",
      userNote: memory.userNote ?? "",
      createdAt: memory.createdAt.toISOString(),
      locationText: memory.locationText ?? "",
    });
  } catch (err) {
    errors.push(`llm: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Step 3: derive final status ---
  let status: "completed" | "partial" | "failed";
  if (errors.length === 0 && card) {
    status = "completed";
  } else if (card) {
    status = "partial";
  } else {
    status = "failed";
  }

  await prisma.memory.update({
    where: { id },
    data: {
      title: card?.title ?? null,
      summary: card?.summary ?? null,
      tags: card ? JSON.stringify(card.tags) : null,
      entities: card ? JSON.stringify(card.entities) : null,
      searchText: card?.searchText ?? null,
      status,
      errorMessage: errors.length > 0 ? errors.join(" | ") : null,
    },
  });
}
