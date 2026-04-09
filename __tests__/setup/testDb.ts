import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test so DATABASE_URL is set for the test process
config({ path: resolve(process.cwd(), ".env.test") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function createTestClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = createTestClient();

/** Remove all rows seeded by a test, in FK-safe order. */
export async function cleanDb() {
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.photographer.deleteMany();
  await prisma.package.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.travelTimeCache.deleteMany();
}

/** Seed a minimal photographer + availability rule for testing. */
export async function seedPhotographer(overrides?: {
  id?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  maxBookings?: number;
}) {
  const id = overrides?.id ?? "phot-test";
  const photographer = await prisma.photographer.create({
    data: {
      id,
      name: "Test Photographer",
      email: `${id}@test.casamedia.nl`,
      isActive: true,
    },
  });

  const rule = await prisma.availabilityRule.create({
    data: {
      photographerId: photographer.id,
      dayOfWeek: overrides?.dayOfWeek ?? 1, // Monday
      startTime: overrides?.startTime ?? "09:00",
      endTime: overrides?.endTime ?? "17:00",
      maxBookings: overrides?.maxBookings ?? 4,
      bufferMinutes: 15,
    },
  });

  return { photographer, rule };
}

/** Seed a test package. */
export async function seedPackage(overrides?: {
  id?: string;
  durationMinutes?: number;
}) {
  return prisma.package.create({
    data: {
      id: overrides?.id ?? "pkg-test",
      name: "Test Package",
      durationMinutes: overrides?.durationMinutes ?? 60,
      isActive: true,
    },
  });
}
