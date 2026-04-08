import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const rules = await prisma.availabilityRule.findMany({
    where: { photographerId: params.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { rules } = body as {
    rules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      maxBookings: number;
      bufferMinutes: number;
    }>;
  };

  if (!Array.isArray(rules)) {
    return NextResponse.json(
      { error: "rules array is required" },
      { status: 400 }
    );
  }

  // Replace all rules for this photographer
  await prisma.availabilityRule.deleteMany({
    where: { photographerId: params.id },
  });

  const created = await prisma.availabilityRule.createMany({
    data: rules.map((r) => ({
      photographerId: params.id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      maxBookings: r.maxBookings ?? 4,
      bufferMinutes: r.bufferMinutes ?? 15,
    })),
  });

  return NextResponse.json({ count: created.count });
}
