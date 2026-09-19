"use client";

import { useEffect, useState } from "react";
import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import type { BuildLine } from "@/types/workspace";

// Live compatibility/power check for a build, via POST /api/compatibility/check
// (the single source of truth — the UI never evaluates rules itself).
//
// The result is stored together with the exact selections it was computed for,
// and only *used* while those still match the current build. So a stale report
// can never be shown for a changed build, with no "clear it in every handler"
// bookkeeping, and "checking" is derived rather than tracked.
export function useCompatibilityReport(lines: BuildLine[]) {
  const request = JSON.stringify({
    selections: lines.map((line) => ({ componentId: line.componentId, quantity: line.quantity })),
  });
  const [result, setResult] = useState<{ request: string; report: CompatibilityReport | null } | null>(null);

  useEffect(() => {
    if (lines.length === 0) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/compatibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: request,
    })
      .then((response) => response.json())
      .then((body) => setResult({ request, report: body?.data ?? null }))
      .catch((error) => {
        if (error.name !== "AbortError") setResult({ request, report: null });
      });

    return () => controller.abort();
    // `lines` only matters through `request`, which is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const isCurrent = result?.request === request;
  return {
    report: isCurrent ? result.report : null,
    // A build with parts whose check hasn't come back yet.
    isChecking: lines.length > 0 && !isCurrent,
  };
}
