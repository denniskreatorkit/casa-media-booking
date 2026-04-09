import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed packages
  const packages = await Promise.all([
    prisma.package.upsert({
      where: { id: "pkg-photos" },
      update: {},
      create: {
        id: "pkg-photos",
        name: "Photography Only",
        durationMinutes: 60,
        description: "Professional interior and exterior photography.",
      },
    }),
    prisma.package.upsert({
      where: { id: "pkg-photos-measuring" },
      update: {},
      create: {
        id: "pkg-photos-measuring",
        name: "Photos + Measuring",
        durationMinutes: 75,
        description:
          "Photography plus floor plan measuring for accurate listings.",
      },
    }),
    prisma.package.upsert({
      where: { id: "pkg-full" },
      update: {},
      create: {
        id: "pkg-full",
        name: "Full Package",
        durationMinutes: 120,
        description:
          "Photography, measuring, aerial drone shots, and virtual tour.",
      },
    }),
    prisma.package.upsert({
      where: { id: "pkg-aerial" },
      update: {},
      create: {
        id: "pkg-aerial",
        name: "Aerial + Photography",
        durationMinutes: 90,
        description: "Drone aerial shots combined with interior photography.",
      },
    }),
  ]);

  console.log(`Seeded ${packages.length} packages`);

  // Seed photographers
  const photographers = await Promise.all([
    prisma.photographer.upsert({
      where: { email: "jan.de.vries@casamedia.nl" },
      update: {},
      create: {
        id: "phot-jan",
        name: "Jan de Vries",
        email: "jan.de.vries@casamedia.nl",
        googleCalendarId: "",
        isActive: true,
      },
    }),
    prisma.photographer.upsert({
      where: { email: "sophie.bakker@casamedia.nl" },
      update: {},
      create: {
        id: "phot-sophie",
        name: "Sophie Bakker",
        email: "sophie.bakker@casamedia.nl",
        googleCalendarId: "",
        isActive: true,
      },
    }),
    prisma.photographer.upsert({
      where: { email: "mike.janssen@casamedia.nl" },
      update: {},
      create: {
        id: "phot-mike",
        name: "Mike Janssen",
        email: "mike.janssen@casamedia.nl",
        googleCalendarId: "",
        isActive: true,
      },
    }),
  ]);

  console.log(`Seeded ${photographers.length} photographers`);

  // Seed availability rules (Mon–Fri 9:00–17:00 for each photographer)
  const workDays = [1, 2, 3, 4, 5]; // Mon=1 … Fri=5
  for (const photographer of photographers) {
    for (const day of workDays) {
      await prisma.availabilityRule.upsert({
        where: {
          id: `rule-${photographer.id}-${day}`,
        },
        update: {},
        create: {
          id: `rule-${photographer.id}-${day}`,
          photographerId: photographer.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          maxBookings: 4,
          bufferMinutes: 15,
        },
      });
    }
  }

  console.log(`Seeded availability rules`);

  // Seed admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@casamedia.nl" },
    update: {},
    create: {
      email: "admin@casamedia.nl",
      passwordHash,
      name: "Casa Media Admin",
    },
  });

  console.log("Seeded admin user: admin@casamedia.nl / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
