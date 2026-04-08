import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const photographers = await prisma.photographer.findMany({
    include: { availabilityRules: true, _count: { select: { bookings: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ photographers });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { name, email, googleCalendarId } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 }
    );
  }

  const photographer = await prisma.photographer.create({
    data: { name, email, googleCalendarId: googleCalendarId ?? "" },
  });

  return NextResponse.json({ photographer }, { status: 201 });
}
