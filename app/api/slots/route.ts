import { NextRequest, NextResponse } from "next/server";
import { generateSlots } from "@/lib/scheduler/generate";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const packageId = searchParams.get("packageId");
  const address = searchParams.get("address");
  const window = parseInt(searchParams.get("window") ?? "28", 10);

  if (!packageId || !address) {
    return NextResponse.json(
      { error: "packageId and address are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await generateSlots({
      packageId,
      address,
      windowDays: Math.min(window, 60),
    });

    // Group by date for UI display
    const grouped: Record<string, typeof slots> = {};
    for (const slot of slots) {
      const dateKey = slot.startAt.toISOString().split("T")[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(slot);
    }

    return NextResponse.json({ slots, grouped });
  } catch (err) {
    console.error("Slot generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate slots" },
      { status: 500 }
    );
  }
}
