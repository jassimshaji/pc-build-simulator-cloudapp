"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StockCell({
  componentId,
  stockQuantity,
}: {
  componentId: string;
  stockQuantity: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(stockQuantity));
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = value !== String(stockQuantity);

  async function handleSave() {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return;

    setIsSaving(true);
    const response = await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId, stockQuantity: parsed }),
    });
    setIsSaving(false);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-100"
      />
      {isDirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs text-zinc-300 hover:underline disabled:opacity-50"
        >
          {isSaving ? "..." : "Save"}
        </button>
      )}
    </div>
  );
}
