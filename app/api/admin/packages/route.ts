import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const packages = await prisma.package.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ packages });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const { name, durationMinutes, description } = body;

  if (!name || !durationMinutes) {
    return NextResponse.json(
      { error: "name and durationMinutes are required" },
      { status: 400 }
    );
  }

  const pkg = await prisma.package.create({
    data: { name, durationMinutes: Number(durationMinutes), description },
  });

  return NextResponse.json({ package: pkg }, { status: 201 });
}
