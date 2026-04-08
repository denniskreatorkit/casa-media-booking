import { prisma } from "@/lib/db";
import { getTravelSeconds } from "./travel";
import type { SlotCandidate, SlotGeneratorOptions } from "./types";

function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function generateSlots(
  options: SlotGeneratorOptions
): Promise<SlotCandidate[]> {
  const { packageId, address, windowDays = 28, stepMinutes = 15 } = options;

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error(`Package ${packageId} not found`);

  const photographers = await prisma.photographer.findMany({
    where: { isActive: true },
    include: {
      availabilityRules: true,
      availabilityBlocks: true,
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: {
            gte: new Date(),
            lte: addMinutes(new Date(), windowDays * 24 * 60),
          },
        },
      },
    },
  });

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = addMinutes(windowStart, windowDays * 24 * 60);

  const allSlots: SlotCandidate[] = [];

  for (const photographer of photographers) {
    // Walk each day in the window
    const current = new Date(windowStart);
    while (current < windowEnd) {
      const dayOfWeek = current.getDay();
      const rule = photographer.availabilityRules.find(
        (r) => r.dayOfWeek === dayOfWeek
      );

      if (!rule) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dayStart = parseTime(rule.startTime, current);
      const dayEnd = parseTime(rule.endTime, current);

      // Count bookings already on this day
      const dayBookings = photographer.bookings.filter((b) =>
        intervalsOverlap(
          new Date(b.startAt),
          new Date(b.endAt),
          dayStart,
          dayEnd
        )
      );

      if (dayBookings.length >= rule.maxBookings) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Build busy intervals for this photographer on this day
      const busyIntervals: Array<{ start: Date; end: Date }> = [
        ...photographer.bookings.map((b) => ({
          start: addMinutes(new Date(b.startAt), -rule.bufferMinutes),
          end: addMinutes(new Date(b.endAt), rule.bufferMinutes),
        })),
        ...photographer.availabilityBlocks
          .filter((block) =>
            intervalsOverlap(
              new Date(block.startAt),
              new Date(block.endAt),
              dayStart,
              dayEnd
            )
          )
          .map((block) => ({
            start: new Date(block.startAt),
            end: new Date(block.endAt),
          })),
      ];

      // Generate candidate slots
      let slotStart = new Date(dayStart);
      // Skip slots in the past
      if (slotStart < new Date()) {
        const now = new Date();
        // Round up to next stepMinutes
        const msStep = stepMinutes * 60 * 1000;
        slotStart = new Date(Math.ceil(now.getTime() / msStep) * msStep);
      }

      while (slotStart < dayEnd) {
        const slotEnd = addMinutes(slotStart, pkg.durationMinutes);

        if (slotEnd > dayEnd) break;

        const overlaps = busyIntervals.some((interval) =>
          intervalsOverlap(slotStart, slotEnd, interval.start, interval.end)
        );

        if (!overlaps) {
          const travelScore = await getTravelSeconds("", address);
          allSlots.push({
            photographerId: photographer.id,
            photographerName: photographer.name,
            startAt: new Date(slotStart),
            endAt: new Date(slotEnd),
            travelScore,
          });
        }

        slotStart = addMinutes(slotStart, stepMinutes);
      }

      current.setDate(current.getDate() + 1);
    }
  }

  // Sort by date then by travel score
  allSlots.sort((a, b) => {
    const timeDiff = a.startAt.getTime() - b.startAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.travelScore - b.travelScore;
  });

  return allSlots.slice(0, 40);
}
