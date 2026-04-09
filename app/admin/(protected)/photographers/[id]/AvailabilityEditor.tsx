"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Rule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxBookings: number;
  bufferMinutes: number;
}

export default function AvailabilityEditor({
  photographerId,
  initialRules,
  dayNames,
}: {
  photographerId: string;
  initialRules: Rule[];
  dayNames: string[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(
    dayNames.map((_, i) => {
      const existing = initialRules.find((r) => r.dayOfWeek === i);
      return (
        existing ?? {
          dayOfWeek: i,
          startTime: "09:00",
          endTime: "17:00",
          maxBookings: 4,
          bufferMinutes: 15,
        }
      );
    })
  );
  const [enabled, setEnabled] = useState<boolean[]>(
    dayNames.map((_, i) => initialRules.some((r) => r.dayOfWeek === i))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateRule(i: number, field: keyof Rule, value: string | number) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const activeRules = rules.filter((_, i) => enabled[i]);

    await fetch(`/api/admin/photographers/${photographerId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: activeRules }),
    });

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {dayNames.map((day, i) => (
        <div key={i} className="border border-gray-200 rounded-md p-3">
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              checked={enabled[i]}
              onChange={(e) =>
                setEnabled((prev) =>
                  prev.map((v, idx) => (idx === i ? e.target.checked : v))
                )
              }
              className="h-4 w-4"
            />
            <span className="font-medium text-sm w-8">{day}</span>
            {enabled[i] && (
              <div className="flex items-center gap-2 flex-1 text-sm">
                <input
                  type="time"
                  value={rules[i].startTime}
                  onChange={(e) => updateRule(i, "startTime", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="text-gray-500">–</span>
                <input
                  type="time"
                  value={rules[i].endTime}
                  onChange={(e) => updateRule(i, "endTime", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
          {enabled[i] && (
            <div className="flex gap-4 text-sm ml-7">
              <label className="flex items-center gap-1">
                <span className="text-gray-500">Max/day:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rules[i].maxBookings}
                  onChange={(e) =>
                    updateRule(i, "maxBookings", Number(e.target.value))
                  }
                  className="border border-gray-300 rounded px-2 py-1 w-14 text-sm"
                />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-gray-500">Buffer (min):</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={rules[i].bufferMinutes}
                  onChange={(e) =>
                    updateRule(i, "bufferMinutes", Number(e.target.value))
                  }
                  className="border border-gray-300 rounded px-2 py-1 w-14 text-sm"
                />
              </label>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium mt-2"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save Rules"}
      </button>
    </div>
  );
}
