import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { id: string };
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: searchParams.id },
    include: { photographer: true, package: true },
  });

  if (!booking || booking.status === "PENDING") notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow p-8">
          <div className="text-center mb-6">
            <div className="text-green-600 text-5xl mb-3">✓</div>
            <h1 className="text-2xl font-bold text-gray-900">
              Booking Confirmed
            </h1>
            <p className="text-gray-500 mt-1">
              We&apos;ll see you at the shoot!
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <Row label="Date & Time">
              {new Date(booking.startAt).toLocaleDateString("nl-NL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Row>
            <Row label="Package">{booking.package.name}</Row>
            <Row label="Photographer">{booking.photographer?.name ?? ""}</Row>
            <Row label="Property">{booking.propertyAddress}</Row>
            <Row label="Agent">
              {booking.agentName} ({booking.agentEmail})
            </Row>
            <Row label="Seller">
              {booking.sellerName} — {booking.sellerPhone}
            </Row>
            <Row label="Booking ID">
              <span className="font-mono text-xs">{booking.id}</span>
            </Row>
          </dl>

          <div className="mt-8 text-center">
            <Link
              href="/booking"
              className="text-sm text-blue-600 hover:underline"
            >
              Make another booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <dt className="w-28 text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium">{children}</dd>
    </div>
  );
}
