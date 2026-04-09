/**
 * Phase 2 — Slot engine integration tests.
 * Validates generateSlots() against a real test database.
 */
import { generateSlots } from "@/lib/scheduler/generate";
import { cleanDb, prisma, seedPackage, seedPhotographer } from "./setup/testDb";

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Returns the next occurrence of a given dayOfWeek (0=Sun) from today. */
function nextWeekday(dayOfWeek: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7; // at least 1 day ahead
  d.setDate(d.getDate() + diff);
  return d;
}

describe("generateSlots — basic slot generation", () => {
  it("returns slots when a photographer has availability", async () => {
    const dayOfWeek = nextWeekday(1).getDay(); // Monday
    const { photographer } = await seedPhotographer({ dayOfWeek });
    const pkg = await seedPackage({ id: "pkg-s1", durationMinutes: 60 });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Teststraat 1, Rotterdam",
      windowDays: 14,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].photographerId).toBe(photographer.id);
    expect(slots[0].startAt).toBeInstanceOf(Date);
    expect(slots[0].endAt).toBeInstanceOf(Date);
  });

  it("returns no slots when no photographers are active", async () => {
    await prisma.photographer.create({
      data: {
        id: "phot-inactive",
        name: "Inactive",
        email: "inactive@test.casamedia.nl",
        isActive: false,
      },
    });
    const pkg = await seedPackage({ id: "pkg-s2" });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 14,
    });

    expect(slots).toHaveLength(0);
  });

  it("returns no slots when photographer has no availability rules", async () => {
    await prisma.photographer.create({
      data: {
        id: "phot-norules",
        name: "No Rules",
        email: "norules@test.casamedia.nl",
        isActive: true,
      },
    });
    const pkg = await seedPackage({ id: "pkg-s3" });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 14,
    });

    expect(slots).toHaveLength(0);
  });

  it("slots respect package duration (endAt = startAt + durationMinutes)", async () => {
    const dayOfWeek = nextWeekday(2).getDay(); // Tuesday
    await seedPhotographer({ id: "phot-dur", dayOfWeek });
    const pkg = await seedPackage({ id: "pkg-s4", durationMinutes: 90 });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 7,
    });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots.slice(0, 5)) {
      const durationMs = slot.endAt.getTime() - slot.startAt.getTime();
      expect(durationMs).toBe(90 * 60 * 1000);
    }
  });

  it("slots are sorted earliest first", async () => {
    const dayOfWeek = nextWeekday(3).getDay();
    await seedPhotographer({ id: "phot-sort", dayOfWeek });
    const pkg = await seedPackage({ id: "pkg-s5" });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 14,
    });

    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startAt.getTime()).toBeGreaterThanOrEqual(
        slots[i - 1].startAt.getTime()
      );
    }
  });

  it("returns at most 40 slots", async () => {
    const dayOfWeek = nextWeekday(4).getDay();
    await seedPhotographer({ id: "phot-cap", dayOfWeek, maxBookings: 99 });
    const pkg = await seedPackage({ id: "pkg-s6", durationMinutes: 30 });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 28,
    });

    expect(slots.length).toBeLessThanOrEqual(40);
  });
});

describe("generateSlots — conflict avoidance", () => {
  it("excludes time blocks covered by existing bookings (with buffer)", async () => {
    const dayOfWeek = nextWeekday(1).getDay();
    const { photographer } = await seedPhotographer({
      id: "phot-conflict",
      dayOfWeek,
    });
    const pkg = await seedPackage({ id: "pkg-conflict", durationMinutes: 60 });

    // Book the 10:00–11:00 slot on the next Monday
    const nextMonday = nextWeekday(1);
    const bookingStart = new Date(nextMonday);
    bookingStart.setHours(10, 0, 0, 0);
    const bookingEnd = new Date(nextMonday);
    bookingEnd.setHours(11, 0, 0, 0);

    await prisma.booking.create({
      data: {
        photographerId: photographer.id,
        packageId: pkg.id,
        status: "CONFIRMED",
        startAt: bookingStart,
        endAt: bookingEnd,
        propertyAddress: "Booked Address",
        agentName: "Agent",
        agentEmail: "a@b.nl",
        sellerName: "Seller",
        sellerEmail: "s@b.nl",
        sellerPhone: "+31600000000",
      },
    });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 7,
    });

    // No slot should overlap with 09:45–11:15 (10:00–11:00 + 15 min buffer each side)
    const conflictStart = new Date(bookingStart.getTime() - 15 * 60 * 1000);
    const conflictEnd = new Date(bookingEnd.getTime() + 15 * 60 * 1000);

    for (const slot of slots) {
      const overlaps =
        slot.startAt < conflictEnd && slot.endAt > conflictStart;
      expect(overlaps).toBe(false);
    }
  });

  it("excludes slots during availability blocks", async () => {
    const dayOfWeek = nextWeekday(2).getDay();
    const { photographer } = await seedPhotographer({
      id: "phot-block",
      dayOfWeek,
    });
    const pkg = await seedPackage({ id: "pkg-block", durationMinutes: 60 });

    // Block the entire day
    const nextTuesday = nextWeekday(2);
    await prisma.availabilityBlock.create({
      data: {
        photographerId: photographer.id,
        startAt: new Date(new Date(nextTuesday).setHours(0, 0, 0, 0)),
        endAt: new Date(new Date(nextTuesday).setHours(23, 59, 59, 0)),
        reason: "Day off",
      },
    });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 7,
    });

    // All slots on that blocked Tuesday should be absent
    const blockedDateStr = nextTuesday.toISOString().split("T")[0];
    const slotsOnBlockedDay = slots.filter(
      (s) => s.startAt.toISOString().split("T")[0] === blockedDateStr
    );
    expect(slotsOnBlockedDay).toHaveLength(0);
  });

  it("respects maxBookings per day", async () => {
    const dayOfWeek = nextWeekday(3).getDay();
    const { photographer } = await seedPhotographer({
      id: "phot-maxb",
      dayOfWeek,
      maxBookings: 1,
    });
    const pkg = await seedPackage({ id: "pkg-maxb", durationMinutes: 60 });

    // Create 1 booking (hitting the max)
    const nextWed = nextWeekday(3);
    const bs = new Date(nextWed);
    bs.setHours(9, 0, 0, 0);
    const be = new Date(nextWed);
    be.setHours(10, 0, 0, 0);

    await prisma.booking.create({
      data: {
        photographerId: photographer.id,
        packageId: pkg.id,
        status: "CONFIRMED",
        startAt: bs,
        endAt: be,
        propertyAddress: "Max Test",
        agentName: "Agent",
        agentEmail: "a@b.nl",
        sellerName: "Seller",
        sellerEmail: "s@b.nl",
        sellerPhone: "+31600000000",
      },
    });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Test",
      windowDays: 7,
    });

    // The maxBookings=1 day should yield no slots
    const dateStr = nextWed.toISOString().split("T")[0];
    const slotsOnDay = slots.filter(
      (s) => s.startAt.toISOString().split("T")[0] === dateStr
    );
    expect(slotsOnDay).toHaveLength(0);
  });
});

describe("generateSlots — edge cases", () => {
  it("throws if package does not exist", async () => {
    await expect(
      generateSlots({ packageId: "nonexistent-pkg", address: "Test" })
    ).rejects.toThrow("Package nonexistent-pkg not found");
  });

  it("travelScore is 0 when photographer origin address is blank", async () => {
    // generate.ts passes "" as origin, so getTravelSeconds returns 0 (no API call made)
    const dayOfWeek = nextWeekday(4).getDay();
    await seedPhotographer({ id: "phot-travel", dayOfWeek });
    const pkg = await seedPackage({ id: "pkg-travel" });

    const slots = await generateSlots({
      packageId: pkg.id,
      address: "Laan van Poot 1, Den Haag",
      windowDays: 7,
    });

    for (const slot of slots.slice(0, 5)) {
      expect(slot.travelScore).toBe(0);
    }
  });
});
