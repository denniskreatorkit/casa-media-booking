"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface BookingRow {
  id: string;
  status: string;
  startAt: string;
  agentName: string;
  agentEmail: string;
  sellerName: string;
  propertyAddress: string;
  photographerName: string;
  photographerId: string;
  packageName: string;
}

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULED"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-blue-100 text-blue-800",
};

export default function BookingTable({
  initialBookings,
  photographers,
}: {
  initialBookings: BookingRow[];
  photographers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? ""
  );
  const [photographerFilter, setPhotographerFilter] = useState(
    searchParams.get("photographerId") ?? ""
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (photographerFilter) params.set("photographerId", photographerFilter);
    router.push(`/admin/bookings?${params.toString()}`);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={photographerFilter}
          onChange={(e) => setPhotographerFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All photographers</option>
          {photographers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={applyFilters}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          Filter
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Agent</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Seller</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Address</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Package</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Photographer</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(booking.startAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div>{booking.agentName}</div>
                  <div className="text-gray-400 text-xs">{booking.agentEmail}</div>
                </td>
                <td className="px-4 py-3">{booking.sellerName}</td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {booking.propertyAddress}
                </td>
                <td className="px-4 py-3">{booking.packageName}</td>
                <td className="px-4 py-3">{booking.photographerName}</td>
                <td className="px-4 py-3">
                  <select
                    value={booking.status}
                    onChange={(e) => updateStatus(booking.id, e.target.value)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${
                      STATUS_COLORS[booking.status] ?? "bg-gray-100"
                    }`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
