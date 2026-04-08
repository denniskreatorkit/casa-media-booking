import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const photographerId = searchParams.get("photographerId");

  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      ...(photographerId ? { photographerId } : {}),
      endAt: { gte: new Date() },
    },
    include: { photographer: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ blocks });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { photographerId, startAt, endAt, reason } = body;

  if (!photographerId || !startAt || !endAt) {
    return NextResponse.json(
      { error: "photographerId, startAt, and endAt are required" },
      { status: 400 }
    );
  }

  const block = await prisma.availabilityBlock.create({
    data: {
      photographerId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      reason,
    },
  });

  return NextResponse.json({ block }, { status: 201 });
}
