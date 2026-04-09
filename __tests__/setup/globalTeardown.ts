import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.test") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export default async function globalTeardown() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  // Clean up all test data in dependency order
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.photographer.deleteMany();
  await prisma.package.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.travelTimeCache.deleteMany();

  await prisma.$disconnect();
  console.log("\n✅ Test database cleaned up.");
}
