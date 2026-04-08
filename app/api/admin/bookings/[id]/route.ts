import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { photographer: true, package: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { status, photographerId, adminNotes, startAt } = body;

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(photographerId !== undefined && { photographerId }),
      ...(adminNotes !== undefined && { adminNotes }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
    },
    include: { photographer: true, package: true },
  });

  return NextResponse.json({ booking });
}
