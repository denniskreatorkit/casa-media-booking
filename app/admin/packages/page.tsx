import { prisma } from "@/lib/db";
import PackagesManager from "./PackagesManager";

export default async function PackagesPage() {
  const packages = await prisma.package.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Packages</h1>
      <PackagesManager
        initialPackages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          durationMinutes: p.durationMinutes,
          description: p.description ?? "",
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}
