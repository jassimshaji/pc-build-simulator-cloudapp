"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteComponentButton({ id, model }: { id: string; model: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${model}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    const response = await fetch(`/api/components/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error?.message ?? "Delete failed.");
      setIsDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-400 hover:underline disabled:opacity-50"
    >
      {isDeleting ? "..." : "Delete"}
    </button>
  );
}
