import { config } from "dotenv";
import { resolve } from "path";

// Must run before any module that imports lib/db.ts
config({ path: resolve(process.cwd(), ".env.test") });
