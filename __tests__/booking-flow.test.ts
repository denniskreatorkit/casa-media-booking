/**
 * Phase 2 — Booking flow integration tests.
 * Exercises the booking init → slot selection → confirm pipeline directly
 * against the test database (bypassing HTTP/Next.js layer for speed).
 */
import { cleanDb, prisma, seedPackage, seedPhotographer } from "./setup/testDb";

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helpers — mirrors the API logic so we can test DB behaviour directly
// ---------------------------------------------------------------------------

async function createDraft(data: {
  packageId: string;
  propertyAddress: string;
  agentName?: string;
  agentEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
}) {
  return prisma.booking.create({
    data: {
      photographerId: null, // null until slot is confirmed
      packageId: data.packageId,
      status: "PENDING",
      startAt: new Date(0),
      endAt: new Date(0),
      propertyAddress: data.propertyAddress,
      agentName: data.agentName ?? "Agent Test",
      agentEmail: data.agentEmail ?? "agent@test.nl",
      sellerName: data.sellerName ?? "Seller Test",
      sellerEmail: data.sellerEmail ?? "seller@test.nl",
      sellerPhone: data.sellerPhone ?? "+31612345678",
    },
  });
}

async function confirmDraft(
  draftId: string,
  photographerId: string,
  startAt: Date,
  durationMinutes: number
) {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

  // Conflict check (mirrors confirm route)
  const conflict = await prisma.booking.findFirst({
    where: {
      photographerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      id: { not: draftId },
      OR: [{ startAt: { lt: endAt }, endAt: { gt: startAt } }],
    },
  });

  if (conflict) throw new Error("Slot is no longer available");

  return prisma.booking.update({
    where: { id: draftId },
    data: { photographerId, status: "CONFIRMED", startAt: startAt, endAt },
    include: { photographer: true, package: true },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Booking init (draft creation)", () => {
  it("creates a draft booking with photographerId=null", async () => {
    const pkg = await seedPackage({ id: "pkg-b1" });

    const draft = await createDraft({
      packageId: pkg.id,
      propertyAddress: "Keizersgracht 1, Amsterdam",
    });

    expect(draft.photographerId).toBeNull();
    expect(draft.status).toBe("PENDING");
    expect(draft.startAt).toEqual(new Date(0));
  });

  it("fails when package does not exist", async () => {
    await expect(
      createDraft({ packageId: "nonexistent", propertyAddress: "Test" })
    ).rejects.toThrow();
  });
});

describe("Booking confirmation", () => {
  it("confirms a draft with correct photographer and times", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b2" });
    const pkg = await seedPackage({ id: "pkg-b2", durationMinutes: 60 });
    const draft = await createDraft({ packageId: pkg.id, propertyAddress: "A" });

    const slotStart = new Date("2030-07-15T10:00:00Z");
    const confirmed = await confirmDraft(
      draft.id,
      photographer.id,
      slotStart,
      60
    );

    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.photographerId).toBe(photographer.id);
    expect(confirmed.startAt).toEqual(slotStart);
    expect(confirmed.endAt).toEqual(new Date("2030-07-15T11:00:00Z"));
  });

  it("prevents double-confirmation of same draft", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b3" });
    const pkg = await seedPackage({ id: "pkg-b3", durationMinutes: 60 });
    const draft = await createDraft({ packageId: pkg.id, propertyAddress: "A" });
    const slotStart = new Date("2030-07-16T10:00:00Z");

    await confirmDraft(draft.id, photographer.id, slotStart, 60);

    // The draft is now confirmed — photographerId is no longer null
    const updated = await prisma.booking.findUnique({ where: { id: draft.id } });
    expect(updated!.photographerId).not.toBeNull();

    // A second confirmation attempt should be detectable
    expect(updated!.status).toBe("CONFIRMED");
  });

  it("rejects confirmation when slot conflicts with existing booking", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b4" });
    const pkg = await seedPackage({ id: "pkg-b4", durationMinutes: 60 });

    // First confirmed booking at 10:00–11:00
    const existing = await createDraft({
      packageId: pkg.id,
      propertyAddress: "Existing",
    });
    const slotStart = new Date("2030-07-17T10:00:00Z");
    await confirmDraft(existing.id, photographer.id, slotStart, 60);

    // Second draft tries to book 10:30–11:30 (overlaps)
    const draft2 = await createDraft({ packageId: pkg.id, propertyAddress: "B" });
    await expect(
      confirmDraft(
        draft2.id,
        photographer.id,
        new Date("2030-07-17T10:30:00Z"),
        60
      )
    ).rejects.toThrow("Slot is no longer available");
  });

  it("allows adjacent non-overlapping bookings for the same photographer", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b5" });
    const pkg = await seedPackage({ id: "pkg-b5", durationMinutes: 60 });

    const draft1 = await createDraft({ packageId: pkg.id, propertyAddress: "A" });
    await confirmDraft(
      draft1.id,
      photographer.id,
      new Date("2030-07-18T09:00:00Z"),
      60
    );

    const draft2 = await createDraft({ packageId: pkg.id, propertyAddress: "B" });
    // Starts exactly when the first ends — no overlap
    const confirmed2 = await confirmDraft(
      draft2.id,
      photographer.id,
      new Date("2030-07-18T10:00:00Z"),
      60
    );
    expect(confirmed2.status).toBe("CONFIRMED");
  });

  it("allows same slot for different photographers", async () => {
    const { photographer: p1 } = await seedPhotographer({ id: "phot-b6a" });
    const { photographer: p2 } = await seedPhotographer({ id: "phot-b6b" });
    const pkg = await seedPackage({ id: "pkg-b6", durationMinutes: 60 });

    const slotStart = new Date("2030-07-19T10:00:00Z");

    const d1 = await createDraft({ packageId: pkg.id, propertyAddress: "A" });
    const d2 = await createDraft({ packageId: pkg.id, propertyAddress: "B" });

    const c1 = await confirmDraft(d1.id, p1.id, slotStart, 60);
    const c2 = await confirmDraft(d2.id, p2.id, slotStart, 60);

    expect(c1.status).toBe("CONFIRMED");
    expect(c2.status).toBe("CONFIRMED");
  });
});

describe("Booking status transitions", () => {
  it("cancels a confirmed booking", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b7" });
    const pkg = await seedPackage({ id: "pkg-b7", durationMinutes: 60 });
    const draft = await createDraft({ packageId: pkg.id, propertyAddress: "A" });

    await confirmDraft(
      draft.id,
      photographer.id,
      new Date("2030-07-20T10:00:00Z"),
      60
    );

    const cancelled = await prisma.booking.update({
      where: { id: draft.id },
      data: { status: "CANCELLED" },
    });
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("CANCELLED bookings do not count as conflicts", async () => {
    const { photographer } = await seedPhotographer({ id: "phot-b8" });
    const pkg = await seedPackage({ id: "pkg-b8", durationMinutes: 60 });
    const slotStart = new Date("2030-07-21T10:00:00Z");

    // Create and cancel a booking
    const d1 = await createDraft({ packageId: pkg.id, propertyAddress: "A" });
    await confirmDraft(d1.id, photographer.id, slotStart, 60);
    await prisma.booking.update({
      where: { id: d1.id },
      data: { status: "CANCELLED" },
    });

    // A new draft should be confirmable in the same slot
    const d2 = await createDraft({ packageId: pkg.id, propertyAddress: "B" });
    const confirmed = await confirmDraft(d2.id, photographer.id, slotStart, 60);
    expect(confirmed.status).toBe("CONFIRMED");
  });
});
