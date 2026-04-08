"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Package {
  id: string;
  name: string;
  durationMinutes: number;
  description: string;
  isActive: boolean;
}

export default function PackagesManager({
  initialPackages,
}: {
  initialPackages: Package[];
}) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPackages);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);

    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        durationMinutes: Number(newDuration),
        description: newDesc,
      }),
    });

    const data = await res.json();
    setAdding(false);

    if (res.ok) {
      setPackages((prev) => [...prev, data.package]);
      setNewName("");
      setNewDuration("");
      setNewDesc("");
      router.refresh();
    }
  }

  async function updateDuration(id: string, durationMinutes: number) {
    await fetch(`/api/admin/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMinutes }),
    });
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, durationMinutes } : p))
    );
  }

  return (
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
                  Duration (min)
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3 font-medium">{pkg.name}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={pkg.durationMinutes}
                      onChange={(e) =>
                        updateDuration(pkg.id, Number(e.target.value))
                      }
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{pkg.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add Package
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Duration (minutes)"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            required
            min={15}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {adding ? "Adding…" : "Add Package"}
          </button>
        </form>
      </div>
    </div>
  );
}
