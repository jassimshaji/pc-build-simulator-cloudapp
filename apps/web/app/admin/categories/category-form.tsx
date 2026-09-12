"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CategoryForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/components/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label, sortOrder: Number(sortOrder) }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Failed to create category.");
      return;
    }

    setKey("");
    setLabel("");
    setSortOrder("0");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="category-key" className="block text-xs text-zinc-400">
          Key (UPPER_SNAKE_CASE)
        </label>
        <input
          id="category-key"
          type="text"
          required
          placeholder="HDD"
          value={key}
          onChange={(event) => setKey(event.target.value.toUpperCase())}
          className="w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="category-label" className="block text-xs text-zinc-400">
          Label
        </label>
        <input
          id="category-label"
          type="text"
          required
          placeholder="Hard Drive"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="category-sort" className="block text-xs text-zinc-400">
          Sort order
        </label>
        <input
          id="category-sort"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
      >
        Add
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
