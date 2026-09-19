"use client";

import { useEffect, useState } from "react";
import type { Category, ComponentSummary } from "@/types/workspace";

// The component picker's data: which category and search text are active, and
// the matching components fetched from the public catalog API. A newer query
// aborts the previous request so a slow response can never overwrite a fresher one.
export function useComponentCatalog(categories: Category[]) {
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(categories[0]?.key ?? null);
  const [search, setSearch] = useState("");
  const [components, setComponents] = useState<ComponentSummary[]>([]);

  useEffect(() => {
    if (!activeCategoryKey) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ category: activeCategoryKey, limit: "50" });
    if (search) params.set("q", search);

    fetch(`/api/components?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body) => setComponents(body?.data?.items ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") setComponents([]);
      });

    return () => controller.abort();
  }, [activeCategoryKey, search]);

  return { components, activeCategoryKey, setActiveCategoryKey, search, setSearch };
}
