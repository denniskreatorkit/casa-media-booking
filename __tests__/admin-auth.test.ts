/**
 * Phase 2 — Admin authentication integration tests.
 * Tests bcrypt password hashing and the credential validation logic
 * used by NextAuth's authorize() callback, against the test database.
 */
import bcrypt from "bcryptjs";
import { cleanDb, prisma } from "./setup/testDb";

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Mirrors the authorize() logic from lib/auth.ts */
async function authorizeAdmin(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

async function createAdmin(
  email: string,
  password: string,
  name = "Admin User"
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.adminUser.create({ data: { email, passwordHash, name } });
}

describe("Admin credential validation", () => {
  it("returns user object for valid credentials", async () => {
    await createAdmin("admin@casamedia.nl", "secureP@ss1");

    const result = await authorizeAdmin("admin@casamedia.nl", "secureP@ss1");

    expect(result).not.toBeNull();
    expect(result!.email).toBe("admin@casamedia.nl");
    expect(result!.name).toBe("Admin User");
    expect(result!.id).toBeDefined();
  });

  it("returns null for wrong password", async () => {
    await createAdmin("admin2@casamedia.nl", "correctPassword");

    const result = await authorizeAdmin("admin2@casamedia.nl", "wrongPassword");
    expect(result).toBeNull();
  });

  it("returns null for non-existent email", async () => {
    const result = await authorizeAdmin("ghost@casamedia.nl", "anypassword");
    expect(result).toBeNull();
  });

  it("enforces unique email constraint", async () => {
    await createAdmin("unique@casamedia.nl", "pass1");
    await expect(createAdmin("unique@casamedia.nl", "pass2")).rejects.toThrow();
  });

  it("password hash is stored (not plaintext)", async () => {
    const password = "mySecret";
    const admin = await createAdmin("hash-test@casamedia.nl", password);

    expect(admin.passwordHash).not.toBe(password);
    expect(admin.passwordHash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("different bcrypt rounds still verify correctly", async () => {
    const password = "testPass123";
    const hash = await bcrypt.hash(password, 12); // higher rounds
    await prisma.adminUser.create({
      data: {
        email: "rounds@casamedia.nl",
        passwordHash: hash,
        name: "Rounds Test",
      },
    });

    const result = await authorizeAdmin("rounds@casamedia.nl", password);
    expect(result).not.toBeNull();
  });
});

describe("AdminUser persistence", () => {
  it("stores and retrieves name and email", async () => {
    await createAdmin("retrieve@casamedia.nl", "pass", "Retrieve Test");

    const found = await prisma.adminUser.findUnique({
      where: { email: "retrieve@casamedia.nl" },
    });

    expect(found!.name).toBe("Retrieve Test");
    expect(found!.email).toBe("retrieve@casamedia.nl");
  });

  it("updatedAt changes on update", async () => {
    const admin = await createAdmin("update@casamedia.nl", "pass");
    const originalUpdatedAt = admin.updatedAt;

    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    const updated = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { name: "Updated Name" },
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime()
    );
  });
});
