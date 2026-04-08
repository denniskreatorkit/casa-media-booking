"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Slot {
  photographerId: string;
  photographerName: string;
  startAt: string;
  endAt: string;
  travelScore: number;
}

export default function SlotPicker({
  draftId,
  packageId,
  address,
}: {
  draftId: string;
  packageId: string;
  address: string;
}) {
  const router = useRouter();
  const [grouped, setGrouped] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(
      `/api/slots?packageId=${packageId}&address=${encodeURIComponent(address)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setGrouped(data.grouped ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [packageId, address]);

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    setError("");

    const res = await fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingDraftId: draftId,
        photographerId: selected.photographerId,
        startAt: selected.startAt,
      }),
    });

    const data = await res.json();
    setConfirming(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to confirm booking");
      return;
    }

    router.push(`/booking/confirmation?id=${data.booking.id}`);
  }

  if (loading) {
    return <p className="text-center text-gray-400">Loading available slots…</p>;
  }

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <p className="text-gray-500">
          No available slots found in the next 28 days. Please contact us
          directly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((date) => (
        <div key={date} className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            {new Date(date).toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {grouped[date].map((slot, i) => {
              const isSelected =
                selected?.startAt === slot.startAt &&
                selected?.photographerId === slot.photographerId;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(slot)}
                  className={`text-sm border rounded-lg px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">
                    {new Date(slot.startAt).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {slot.photographerName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-medium text-blue-900 mb-3">
            Selected:{" "}
            {new Date(selected.startAt).toLocaleDateString("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            with {selected.photographerName}
          </p>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {confirming ? "Confirming…" : "Confirm Booking →"}
          </button>
        </div>
      )}
    </div>
  );
}
