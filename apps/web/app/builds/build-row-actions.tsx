"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuildRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run(request: () => Promise<Response>) {
    setError(null);
    const response = await request().catch(() => null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error?.message ?? "Request failed.");
      return;
    }
    router.refresh();
  }

  function handleRename() {
    const next = window.prompt("Rename build", name)?.trim();
    if (!next || next === name) return;
    return run(() =>
      fetch(`/api/builds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      }),
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    return run(() => fetch(`/api/builds/${id}`, { method: "DELETE" }));
  }

  const buttonClass = "rounded border border-zinc-800 px-2 py-1 text-xs hover:bg-zinc-900";

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button type="button" onClick={handleRename} className={buttonClass}>
        Rename
      </button>
      <button
        type="button"
        onClick={() => run(() => fetch(`/api/builds/${id}/duplicate`, { method: "POST" }))}
        className={buttonClass}
      >
        Duplicate
      </button>
      <button type="button" onClick={handleDelete} className={`${buttonClass} text-red-400`}>
        Delete
      </button>
    </div>
  );
}
