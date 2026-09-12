"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: { row: number; sku?: string; error: string }[];
}

export function ImportExportPanel() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/components/import", { method: "POST", body: formData });
    const body = await response.json();
    setIsImporting(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Import failed.");
      return;
    }

    setResult(body.data);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-lg font-medium text-zinc-200">Export</h2>
        <p className="text-sm text-zinc-500">
          Downloads every component (available or not) as a CSV. The{" "}
          <code>specifications</code> and <code>images</code> columns are JSON-encoded —
          edit them as JSON, then re-import.
        </p>
        {/* File download from an API route, not a page navigation — next/link doesn't apply here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/components/export"
          className="inline-block rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-950"
        >
          Export CSV
        </a>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-zinc-200">Import</h2>
        <p className="text-sm text-zinc-500">
          Upserts by SKU — rows with an existing SKU update that component; new SKUs
          create one. Bad rows are skipped and reported individually rather than
          failing the whole file.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isImporting}
        />
        {isImporting && <p className="text-sm text-zinc-500">Importing...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {result && (
          <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
            <p>
              {result.total} row(s) processed — {result.created} created, {result.updated}{" "}
              updated, {result.failed.length} failed.
            </p>
            {result.failed.length > 0 && (
              <ul className="list-inside list-disc text-red-400">
                {result.failed.map((failure) => (
                  <li key={failure.row}>
                    Row {failure.row}
                    {failure.sku ? ` (${failure.sku})` : ""}: {failure.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
