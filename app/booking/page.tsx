import { prisma } from "@/lib/db";
import IntakeForm from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { durationMinutes: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Book a Shoot</h1>
          <p className="text-gray-500 mt-2">
            Schedule a photography session for your listing.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-8">
          <IntakeForm
            packages={packages.map((p) => ({
              id: p.id,
              name: p.name,
              durationMinutes: p.durationMinutes,
              description: p.description ?? "",
            }))}
          />
        </div>
      </div>
    </div>
  );
}
