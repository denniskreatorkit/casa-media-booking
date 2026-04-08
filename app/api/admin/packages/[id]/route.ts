import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { name, durationMinutes, description, isActive } = body;

  const pkg = await prisma.package.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(durationMinutes !== undefined && {
        durationMinutes: Number(durationMinutes),
      }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ package: pkg });
}
