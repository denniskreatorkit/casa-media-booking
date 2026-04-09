import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentName,
      agentEmail,
      sellerName,
      sellerEmail,
      sellerPhone,
      propertyAddress,
      packageId,
    } = body;

    if (
      !agentName ||
      !agentEmail ||
      !sellerName ||
      !sellerEmail ||
      !sellerPhone ||
      !propertyAddress ||
      !packageId
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Store draft as a temporary booking with status PENDING and a placeholder time
    // The real slot is confirmed in /api/bookings/confirm
    const draft = await prisma.booking.create({
      data: {
        photographerId: null, // null until slot is confirmed
        packageId,
        status: "PENDING",
        startAt: new Date(0),
        endAt: new Date(0),
        propertyAddress,
        agentName,
        agentEmail,
        sellerName,
        sellerEmail,
        sellerPhone,
      },
    });

    return NextResponse.json({ bookingDraftId: draft.id });
  } catch (err) {
    console.error("Booking init error:", err);
    return NextResponse.json(
      { error: "Failed to create booking draft" },
      { status: 500 }
    );
  }
}
