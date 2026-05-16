import { prisma } from "@/lib/db";
import { MemoriesBrowser } from "./MemoriesBrowser";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  const rows = await prisma.memory.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const initial = rows.map((m) => ({
    id: m.id,
    title: m.title,
    summary: m.summary,
    imageUrl: m.imageUrl,
    audioUrl: m.audioUrl,
    tags: m.tags ? (JSON.parse(m.tags) as string[]) : [],
    createdAt: m.createdAt.toISOString(),
    locationText: m.locationText,
    status: m.status,
  }));

  return <MemoriesBrowser initial={initial} />;
}
