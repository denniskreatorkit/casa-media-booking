import { prisma } from "@/lib/db";
import Link from "next/link";
import AddPhotographerForm from "./AddPhotographerForm";

export default async function PhotographersPage() {
  const photographers = await prisma.photographer.findMany({
    include: {
      availabilityRules: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Photographers</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">
                    Bookings
                  </th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {photographers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email}</td>
                    <td className="px-4 py-3">{p._count.bookings}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/photographers/${p.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Add Photographer
            </h2>
            <AddPhotographerForm />
          </div>
        </div>
      </div>
    </div>
  );
}
