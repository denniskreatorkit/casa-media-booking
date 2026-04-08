/**
 * Travel time stub — returns 0 until Google Maps API is wired in Phase 4.
 * The real implementation will call the Distance Matrix API and persist
 * results in TravelTimeCache.
 */
export async function getTravelSeconds(
  _originAddress: string,
  _destAddress: string
): Promise<number> {
  return 0;
}
