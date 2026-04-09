import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingConfirmationEmails } from "@/lib/ghl-email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingDraftId, photographerId, startAt } = body;

    if (!bookingDraftId || !photographerId || !startAt) {
      return NextResponse.json(
        { error: "bookingDraftId, photographerId, and startAt are required" },
        { status: 400 }
      );
    }

    const draft = await prisma.booking.findUnique({
      where: { id: bookingDraftId },
      include: { package: true },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Booking draft not found" },
        { status: 404 }
      );
    }

    if (draft.photographerId !== null) {
      return NextResponse.json(
        { error: "Booking already confirmed" },
        { status: 409 }
      );
    }

    const photographer = await prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      return NextResponse.json(
        { error: "Photographer not found" },
        { status: 404 }
      );
    }

    const slotStart = new Date(startAt);
    const slotEnd = new Date(
      slotStart.getTime() + draft.package.durationMinutes * 60 * 1000
    );

    // Check for conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        photographerId,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: { not: bookingDraftId },
        OR: [
          { startAt: { lt: slotEnd }, endAt: { gt: slotStart } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Slot is no longer available" },
        { status: 409 }
      );
    }

    const confirmed = await prisma.booking.update({
      where: { id: bookingDraftId },
      data: {
        photographerId,
        status: "CONFIRMED",
        startAt: slotStart,
        endAt: slotEnd,
      },
      include: { photographer: true, package: true },
    });

    // Fire GHL confirmation emails — non-blocking; errors are logged, not thrown
    sendBookingConfirmationEmails({
      bookingId: confirmed.id,
      propertyAddress: confirmed.propertyAddress,
      packageName: confirmed.package.name,
      durationMinutes: confirmed.package.durationMinutes,
      startAt: confirmed.startAt,
      endAt: confirmed.endAt,
      agentName: confirmed.agentName,
      agentEmail: confirmed.agentEmail,
      sellerName: confirmed.sellerName,
      sellerEmail: confirmed.sellerEmail,
      sellerPhone: confirmed.sellerPhone,
      photographerName: confirmed.photographer!.name,
      photographerEmail: confirmed.photographer!.email,
    }).catch((err) => console.error("[GHL] Unexpected error in sendBookingConfirmationEmails:", err));

    return NextResponse.json({ booking: confirmed });
  } catch (err) {
    console.error("Booking confirm error:", err);
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }
}
