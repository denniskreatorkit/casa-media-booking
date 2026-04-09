/**
 * Smoke test: send a real GHL booking confirmation email.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/smoke-ghl-email.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

import { sendBookingConfirmationEmails } from "../lib/ghl-email";

async function main() {
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 60 * 1000);

  console.log("[smoke] Sending test booking confirmation via GHL...");
  await sendBookingConfirmationEmails({
    bookingId: "smoke-test-0001",
    propertyAddress: "Laan van Poot 1, 2566 EA Den Haag",
    packageName: "Basis Fotopakket",
    durationMinutes: 90,
    startAt: now,
    endAt: end,
    agentName: "Test Makelaar",
    agentEmail: "dennis@casa-media.nl",
    sellerName: "Test Verkoper",
    sellerEmail: "dennis@casa-media.nl",
    sellerPhone: "+31612345678",
    photographerName: "Jan de Fotograaf",
    photographerEmail: "dennis@casa-media.nl",
  });
  console.log("[smoke] Done.");
}

main().catch((err) => {
  console.error("[smoke] Error:", err);
  process.exit(1);
});
