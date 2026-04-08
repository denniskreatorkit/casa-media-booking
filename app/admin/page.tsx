import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const [totalBookings, pendingBookings, photographers, upcomingBookings] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.photographer.count({ where: { isActive: true } }),
      prisma.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { gte: new Date() },
        },
        include: {
          photographer: { select: { name: true } },
          package: { select: { name: true } },
        },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Bookings" value={totalBookings} />
        <StatCard label="Pending" value={pendingBookings} />
        <StatCard label="Active Photographers" value={photographers} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Upcoming Bookings
      </h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Date / Time
              </th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Agent
              </th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Address
              </th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Package
              </th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Photographer
              </th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {upcomingBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(booking.startAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">{booking.agentName}</td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {booking.propertyAddress}
                </td>
                <td className="px-4 py-3">{booking.package.name}</td>
                <td className="px-4 py-3">{booking.photographer.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
            {upcomingBookings.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No upcoming bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link
          href="/admin/bookings"
          className="text-blue-600 text-sm hover:underline"
        >
          View all bookings →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    RESCHEDULED: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
