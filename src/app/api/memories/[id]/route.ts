import { NextResponse } from "next/server";
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
