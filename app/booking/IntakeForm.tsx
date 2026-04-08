"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Package {
  id: string;
  name: string;
  durationMinutes: number;
  description: string;
}

export default function IntakeForm({ packages }: { packages: Package[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    agentName: "",
    agentEmail: "",
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    propertyAddress: "",
    packageId: packages[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/bookings/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push(
      `/booking/slots?draftId=${data.bookingDraftId}&packageId=${form.packageId}&address=${encodeURIComponent(form.propertyAddress)}`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Package
        </legend>
        <div className="space-y-2">
          {packages.map((pkg) => (
            <label
              key={pkg.id}
              className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                form.packageId === pkg.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="packageId"
                value={pkg.id}
                checked={form.packageId === pkg.id}
                onChange={update("packageId")}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-sm">
                  {pkg.name}{" "}
                  <span className="text-gray-400 font-normal">
                    ({pkg.durationMinutes} min)
                  </span>
                </div>
                {pkg.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {pkg.description}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property Address
        </label>
        <input
          value={form.propertyAddress}
          onChange={update("propertyAddress")}
          placeholder="Street, City, Postal Code"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Real Estate Agent
        </legend>
        <div className="space-y-3">
          <input
            value={form.agentName}
            onChange={update("agentName")}
            placeholder="Agent name"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            value={form.agentEmail}
            onChange={update("agentEmail")}
            placeholder="Agent email"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Seller / Property Owner
        </legend>
        <div className="space-y-3">
          <input
            value={form.sellerName}
            onChange={update("sellerName")}
            placeholder="Seller name"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            value={form.sellerEmail}
            onChange={update("sellerEmail")}
            placeholder="Seller email"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="tel"
            value={form.sellerPhone}
            onChange={update("sellerPhone")}
            placeholder="Seller phone"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </fieldset>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? "Checking availability…" : "See Available Slots →"}
      </button>
    </form>
  );
}
