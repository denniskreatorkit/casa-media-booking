import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const photographer = await prisma.photographer.findUnique({
    where: { id: params.id },
    include: { availabilityRules: true, availabilityBlocks: true },
  });

  if (!photographer) {
    return NextResponse.json(
      { error: "Photographer not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ photographer });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { name, email, googleCalendarId, isActive } = body;

  const photographer = await prisma.photographer.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(googleCalendarId !== undefined && { googleCalendarId }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ photographer });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  await prisma.photographer.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
