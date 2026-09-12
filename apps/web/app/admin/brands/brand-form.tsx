"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function BrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Failed to create brand.");
      return;
    }

    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="brand-name" className="block text-xs text-zinc-400">
          New brand name
        </label>
        <input
          id="brand-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
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
