import { prisma } from "@/lib/db";
import BookingTable from "./BookingTable";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; photographerId?: string };
}) {
  const [bookings, photographers] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...(searchParams.status ? { status: searchParams.status as never } : {}),
        ...(searchParams.photographerId
          ? { photographerId: searchParams.photographerId }
          : {}),
      },
      include: {
        photographer: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
      },
      orderBy: { startAt: "desc" },
    }),
    prisma.photographer.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>
      <BookingTable
        initialBookings={bookings.map((b) => ({
          id: b.id,
          status: b.status,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
          agentName: b.agentName,
          agentEmail: b.agentEmail,
          sellerName: b.sellerName,
          propertyAddress: b.propertyAddress,
          photographerName: b.photographer?.name ?? "",
          photographerId: b.photographer?.id ?? "",
          packageName: b.package.name,
        }))}
        photographers={photographers}
      />
    </div>
  );
}
