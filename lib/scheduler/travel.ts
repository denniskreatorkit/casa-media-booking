/**
 * Travel time lookup via Google Maps Distance Matrix API with DB caching.
 *
 * Required env var:
 *   GOOGLE_MAPS_API_KEY
 *
 * Falls back to 0 when:
 *   - API key is not set
 *   - Either address is blank
 *   - API returns an error or ZERO_RESULTS
 */
import { prisma } from "@/lib/db";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DistanceMatrixResponse {
  status: string;
  rows: Array<{
    elements: Array<{
      status: string;
      duration: { value: number; text: string };
    }>;
  }>;
}

export async function getTravelSeconds(
  originAddress: string,
  destAddress: string
): Promise<number> {
  if (!originAddress || !destAddress) return 0;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return 0;

  // Check cache first
  const cutoff = new Date(Date.now() - CACHE_MAX_AGE_MS);
  const cached = await prisma.travelTimeCache.findFirst({
    where: {
      originAddress,
      destAddress,
      cachedAt: { gte: cutoff },
    },
  });
  if (cached) return cached.travelSeconds;

  // Call Distance Matrix API
  const params = new URLSearchParams({
    origins: originAddress,
    destinations: destAddress,
    units: "metric",
    mode: "driving",
    key: apiKey,
  });

  let travelSeconds = 0;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    if (res.ok) {
      const data = (await res.json()) as DistanceMatrixResponse;
      const element = data.rows?.[0]?.elements?.[0];
      if (element?.status === "OK") {
        travelSeconds = element.duration.value;
      }
    }
  } catch (err) {
    console.error("[travel] Distance Matrix API error:", err);
  }

  // Upsert cache entry
  try {
    await prisma.travelTimeCache.upsert({
      where: { originAddress_destAddress: { originAddress, destAddress } },
      create: { originAddress, destAddress, travelSeconds },
      update: { travelSeconds, cachedAt: new Date() },
    });
  } catch (err) {
    console.error("[travel] Cache write error:", err);
  }

  return travelSeconds;
}
