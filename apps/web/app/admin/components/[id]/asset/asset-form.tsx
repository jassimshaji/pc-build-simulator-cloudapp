"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_GENERATOR_BY_CATEGORY,
  PROCEDURAL_GENERATORS,
  type ProceduralGenerator,
} from "@/lib/threeDAssets";

type AssetKind = "GLTF_MODEL" | "PROCEDURAL_FALLBACK" | "PLACEHOLDER";

interface InitialAsset {
  kind: AssetKind;
  url: string | null;
  proceduralGeneratorKey: string | null;
  source: string | null;
  licenseInfo: string | null;
  attribution: string | null;
  usageRights: string | null;
}

const inputClass =
  "w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100";
const labelClass = "block text-xs text-zinc-400";

export function AssetForm({
  componentId,
  categoryKey,
  initialAsset,
}: {
  componentId: string;
  categoryKey: string;
  initialAsset: InitialAsset | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<AssetKind>(initialAsset?.kind ?? "PROCEDURAL_FALLBACK");
  const [url, setUrl] = useState(initialAsset?.url ?? "");
  const [generatorKey, setGeneratorKey] = useState<ProceduralGenerator | "">(
    (initialAsset?.proceduralGeneratorKey as ProceduralGenerator | undefined) ??
      DEFAULT_GENERATOR_BY_CATEGORY[categoryKey] ??
      "",
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          purpose: "model",
          size: file.size,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Failed to request an upload URL.");
      }

      const uploadResponse = await fetch(body.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed.");
      }

      setUrl(body.data.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Model upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      kind,
      source: String(formData.get("source") ?? "") || undefined,
      licenseInfo: String(formData.get("licenseInfo") ?? "") || undefined,
      attribution: String(formData.get("attribution") ?? "") || undefined,
      usageRights: String(formData.get("usageRights") ?? "") || undefined,
    };
    if (kind === "GLTF_MODEL") payload.url = url || undefined;
    if (kind === "PROCEDURAL_FALLBACK") payload.proceduralGeneratorKey = generatorKey || undefined;

    const response = await fetch(`/api/components/${componentId}/asset`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(body?.error?.message ?? "Save failed.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded border border-red-900 bg-red-950/40 p-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-emerald-400">Saved.</p>}

      <div className="space-y-1">
        <label htmlFor="kind" className={labelClass}>
          Asset kind
        </label>
        <select
          id="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as AssetKind)}
          className={inputClass}
        >
          <option value="PROCEDURAL_FALLBACK">Procedural fallback (generic geometry)</option>
          <option value="GLTF_MODEL">Uploaded GLTF/GLB model</option>
          <option value="PLACEHOLDER">Placeholder (no visual yet)</option>
        </select>
      </div>

      {kind === "PROCEDURAL_FALLBACK" && (
        <div className="space-y-1">
          <label htmlFor="generatorKey" className={labelClass}>
            Generator
          </label>
          <select
            id="generatorKey"
            value={generatorKey}
            onChange={(event) => setGeneratorKey(event.target.value as ProceduralGenerator)}
            className={inputClass}
          >
            <option value="">-- choose a generator --</option>
            {PROCEDURAL_GENERATORS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600">
            None of these generators exist yet (packages/three-d-engine lands in
            Phase 4) — recording the choice now is a data decision, not a functional
            one yet.
          </p>
        </div>
      )}

      {kind === "GLTF_MODEL" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className={labelClass}>Model file (.glb / .gltf)</label>
            <input type="file" accept=".glb,.gltf" onChange={handleFileChange} disabled={isUploading} />
            {isUploading && <p className="text-xs text-zinc-500">Uploading...</p>}
          </div>
          {url && <p className="truncate text-xs text-zinc-500">{url}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="source" className={labelClass}>
            Source
          </label>
          <input
            id="source"
            name="source"
            type="text"
            defaultValue={initialAsset?.source ?? ""}
            placeholder="e.g. manufacturer, artist, procedural"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="licenseInfo" className={labelClass}>
            License
          </label>
          <input
            id="licenseInfo"
            name="licenseInfo"
            type="text"
            defaultValue={initialAsset?.licenseInfo ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="attribution" className={labelClass}>
            Attribution
          </label>
          <input
            id="attribution"
            name="attribution"
            type="text"
            defaultValue={initialAsset?.attribution ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="usageRights" className={labelClass}>
            Usage rights notes
          </label>
          <input
            id="usageRights"
            name="usageRights"
            type="text"
            defaultValue={initialAsset?.usageRights ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isUploading}
        className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save asset"}
      </button>
    </form>
  );
}
