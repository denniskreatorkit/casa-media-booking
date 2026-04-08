import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdminSession();
  if (response) return response;

  await prisma.availabilityBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
