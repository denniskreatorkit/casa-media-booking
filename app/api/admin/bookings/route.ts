import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";
import { BookingStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as BookingStatus | null;
  const photographerId = searchParams.get("photographerId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(photographerId ? { photographerId } : {}),
      ...(dateFrom || dateTo
        ? {
            startAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      photographer: { select: { id: true, name: true } },
      package: { select: { id: true, name: true, durationMinutes: true } },
    },
    orderBy: { startAt: "desc" },
  });

  return NextResponse.json({ bookings });
}
