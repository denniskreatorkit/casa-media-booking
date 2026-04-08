"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Block {
  id: string;
  startAt: string;
  endAt: string;
  reason: string;
}

export default function BlocksManager({
  photographerId,
  initialBlocks,
}: {
  photographerId: string;
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photographerId, startAt, endAt, reason }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setBlocks((prev) => [
        ...prev,
        { id: data.block.id, startAt, endAt, reason },
      ]);
      setStartAt("");
      setEndAt("");
      setReason("");
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-1.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Adding…" : "Add Block"}
        </button>
      </form>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between border border-gray-200 rounded-md p-2 text-sm"
          >
            <div>
              <span className="font-medium">
                {new Date(block.startAt).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                →{" "}
                {new Date(block.endAt).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {block.reason && (
                <span className="text-gray-400 ml-2">{block.reason}</span>
              )}
            </div>
            <button
              onClick={() => handleDelete(block.id)}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Remove
            </button>
          </div>
        ))}
        {blocks.length === 0 && (
          <p className="text-gray-400 text-sm">No blocks set</p>
        )}
      </div>
    </div>
  );
}
