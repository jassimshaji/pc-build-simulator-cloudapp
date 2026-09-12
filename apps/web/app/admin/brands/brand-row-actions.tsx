"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BrandRowActions({
  id,
  name,
  componentCount,
}: {
  id: string;
  name: string;
  componentCount: number;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const response = await fetch(`/api/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
    const body = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Rename failed.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete brand "${name}"?`)) return;
    const response = await fetch(`/api/brands/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error?.message ?? "Delete failed.");
      return;
    }
    router.refresh();
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        />
        <button type="button" onClick={handleSave} disabled={isSaving} className="text-sm text-zinc-300 hover:underline">
          Save
        </button>
        <button type="button" onClick={() => setIsEditing(false)} className="text-sm text-zinc-500 hover:underline">
          Cancel
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-3 text-sm">
      <button type="button" onClick={() => setIsEditing(true)} className="text-zinc-300 hover:underline">
        Rename
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={componentCount > 0}
        title={componentCount > 0 ? "Cannot delete: components still use this brand." : undefined}
        className="text-red-400 hover:underline disabled:cursor-not-allowed disabled:text-zinc-600 disabled:no-underline"
      >
        Delete
      </button>
    </div>
  );
}
