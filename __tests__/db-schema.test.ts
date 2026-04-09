/**
 * Phase 1 — Database schema integration tests.
 * Validates CRUD operations for all core models via the test database.
 */
import { cleanDb, prisma, seedPackage, seedPhotographer } from "./setup/testDb";

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Package CRUD", () => {
  it("creates and retrieves a package", async () => {
    const pkg = await prisma.package.create({
      data: {
        name: "Photos Only",
        durationMinutes: 60,
        isActive: true,
      },
    });

    const found = await prisma.package.findUnique({ where: { id: pkg.id } });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Photos Only");
    expect(found!.durationMinutes).toBe(60);
    expect(found!.isActive).toBe(true);
  });

  it("updates a package", async () => {
    const pkg = await seedPackage();
    await prisma.package.update({
      where: { id: pkg.id },
      data: { durationMinutes: 90 },
    });

    const updated = await prisma.package.findUnique({ where: { id: pkg.id } });
    expect(updated!.durationMinutes).toBe(90);
  });

  it("soft-deactivates a package", async () => {
    const pkg = await seedPackage();
    await prisma.package.update({
      where: { id: pkg.id },
      data: { isActive: false },
    });

    const inactive = await prisma.package.findUnique({ where: { id: pkg.id } });
    expect(inactive!.isActive).toBe(false);
  });
});

describe("Photographer CRUD", () => {
  it("creates a photographer with availability rules", async () => {
    const { photographer, rule } = await seedPhotographer({ dayOfWeek: 2 });

    const found = await prisma.photographer.findUnique({
      where: { id: photographer.id },
      include: { availabilityRules: true },
    });

    expect(found).not.toBeNull();
    expect(found!.isActive).toBe(true);
    expect(found!.availabilityRules).toHaveLength(1);
    expect(found!.availabilityRules[0].dayOfWeek).toBe(2);
    expect(found!.availabilityRules[0].startTime).toBe("09:00");
  });

  it("enforces unique email", async () => {
    await seedPhotographer({ id: "phot-a" });
    await expect(
      prisma.photographer.create({
        data: {
          id: "phot-b",
          name: "Duplicate",
          email: "phot-a@test.casamedia.nl",
          isActive: true,
        },
      })
    ).rejects.toThrow();
  });

  it("cascades deletes availability rules", async () => {
    const { photographer } = await seedPhotographer();
    await prisma.photographer.delete({ where: { id: photographer.id } });

    const rules = await prisma.availabilityRule.findMany({
      where: { photographerId: photographer.id },
    });
    expect(rules).toHaveLength(0);
  });
});

describe("AvailabilityBlock", () => {
  it("creates a block and cascades on photographer delete", async () => {
    const { photographer } = await seedPhotographer();

    const block = await prisma.availabilityBlock.create({
      data: {
        photographerId: photographer.id,
        startAt: new Date("2030-01-01T09:00:00Z"),
        endAt: new Date("2030-01-01T11:00:00Z"),
        reason: "Sick day",
      },
    });

    expect(block.reason).toBe("Sick day");

    await prisma.photographer.delete({ where: { id: photographer.id } });
    const found = await prisma.availabilityBlock.findUnique({
      where: { id: block.id },
    });
    expect(found).toBeNull();
  });
});

describe("Booking lifecycle", () => {
  it("creates a PENDING booking and transitions to CONFIRMED", async () => {
    const { photographer } = await seedPhotographer();
    const pkg = await seedPackage({ durationMinutes: 60 });

    const booking = await prisma.booking.create({
      data: {
        photographerId: photographer.id,
        packageId: pkg.id,
        status: "PENDING",
        startAt: new Date("2030-06-01T10:00:00Z"),
        endAt: new Date("2030-06-01T11:00:00Z"),
        propertyAddress: "Teststraat 1, Rotterdam",
        agentName: "Agent Henk",
        agentEmail: "henk@makelaars.nl",
        sellerName: "Seller Jan",
        sellerEmail: "jan@example.com",
        sellerPhone: "+31612345678",
      },
    });

    expect(booking.status).toBe("PENDING");

    const confirmed = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });
    expect(confirmed.status).toBe("CONFIRMED");
  });

  it("stores optional geo coordinates", async () => {
    const { photographer } = await seedPhotographer();
    const pkg = await seedPackage();

    const booking = await prisma.booking.create({
      data: {
        photographerId: photographer.id,
        packageId: pkg.id,
        status: "PENDING",
        startAt: new Date("2030-06-01T10:00:00Z"),
        endAt: new Date("2030-06-01T11:00:00Z"),
        propertyAddress: "Coolsingel 40, Rotterdam",
        propertyLat: 51.9168,
        propertyLng: 4.4769,
        agentName: "Agent Test",
        agentEmail: "agent@test.nl",
        sellerName: "Seller Test",
        sellerEmail: "seller@test.nl",
        sellerPhone: "+31612345678",
      },
    });

    expect(booking.propertyLat).toBeCloseTo(51.9168);
    expect(booking.propertyLng).toBeCloseTo(4.4769);
  });
});

describe("TravelTimeCache", () => {
  it("stores and retrieves cached travel times", async () => {
    const entry = await prisma.travelTimeCache.create({
      data: {
        originAddress: "Schiedam Centrum",
        destAddress: "Coolsingel 40, Rotterdam",
        travelSeconds: 900,
      },
    });

    expect(entry.travelSeconds).toBe(900);

    const found = await prisma.travelTimeCache.findUnique({
      where: {
        originAddress_destAddress: {
          originAddress: "Schiedam Centrum",
          destAddress: "Coolsingel 40, Rotterdam",
        },
      },
    });
    expect(found!.travelSeconds).toBe(900);
  });

  it("enforces unique origin+dest pair", async () => {
    await prisma.travelTimeCache.create({
      data: { originAddress: "A", destAddress: "B", travelSeconds: 100 },
    });

    await expect(
      prisma.travelTimeCache.create({
        data: { originAddress: "A", destAddress: "B", travelSeconds: 200 },
      })
    ).rejects.toThrow();
  });
});

describe("AdminUser", () => {
  it("creates an admin user with unique email", async () => {
    const admin = await prisma.adminUser.create({
      data: {
        email: "admin@casamedia.nl",
        passwordHash: "hashed",
        name: "Admin Test",
      },
    });
    expect(admin.email).toBe("admin@casamedia.nl");
  });
});
