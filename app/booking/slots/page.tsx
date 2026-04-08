import { Suspense } from "react";
import SlotPicker from "./SlotPicker";

export default function SlotsPage({
  searchParams,
}: {
  searchParams: { draftId: string; packageId: string; address: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Choose a Time Slot
          </h1>
          <p className="text-gray-500 mt-2">
            Select the date and time that works best.
          </p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-400">Loading available slots…</p>}>
          <SlotPicker
            draftId={searchParams.draftId}
            packageId={searchParams.packageId}
            address={searchParams.address}
          />
        </Suspense>
      </div>
    </div>
  );
}
