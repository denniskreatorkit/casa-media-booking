import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AvailabilityEditor from "./AvailabilityEditor";
import BlocksManager from "./BlocksManager";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function PhotographerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const photographer = await prisma.photographer.findUnique({
    where: { id: params.id },
    include: {
      availabilityRules: { orderBy: { dayOfWeek: "asc" } },
      availabilityBlocks: {
        where: { endAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
      },
    },
  });

  if (!photographer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {photographer.name}
      </h1>
      <p className="text-gray-500 text-sm mb-6">{photographer.email}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Availability Rules
          </h2>
          <AvailabilityEditor
            photographerId={photographer.id}
            initialRules={photographer.availabilityRules.map((r) => ({
              dayOfWeek: r.dayOfWeek,
              startTime: r.startTime,
              endTime: r.endTime,
              maxBookings: r.maxBookings,
              bufferMinutes: r.bufferMinutes,
            }))}
            dayNames={DAY_NAMES}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Calendar Blocks
          </h2>
          <BlocksManager
            photographerId={photographer.id}
            initialBlocks={photographer.availabilityBlocks.map((b) => ({
              id: b.id,
              startAt: b.startAt.toISOString(),
              endAt: b.endAt.toISOString(),
              reason: b.reason ?? "",
            }))}
          />
        </div>
      </div>
    </div>
  );
}
