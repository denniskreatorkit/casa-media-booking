import { config } from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";

export default async function globalSetup() {
  // Load test credentials from .env.test before anything else
  config({ path: resolve(process.cwd(), ".env.test") });

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL not set. Copy .env.test.template to .env.test and fill in values."
    );
  }

  // Push schema to the test database (no migrations needed for tests)
  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit",
  });

  console.log("\n✅ Test database schema ready.");
}
