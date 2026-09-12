"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSpecSchema } from "@pcbuilder/component-models";
import {
  coerceFormValues,
  describeSpecSchema,
  type FieldDescriptor,
} from "@/lib/zod-form";

interface CategoryOption {
  key: string;
  label: string;
}

interface InitialComponent {
  id: string;
  sku: string;
  categoryKey: string;
  brandName: string;
  model: string;
  price: number;
  description: string | null;
  images: string[];
  isAvailable: boolean;
  specifications: Record<string, unknown>;
}

const inputClass =
  "w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100";
const labelClass = "block text-xs text-zinc-400";

function getRawValue(
  field: FieldDescriptor,
  source: Record<string, unknown> | undefined,
): string | boolean {
  const value = source?.[field.name];

  if (field.kind === "boolean") {
    return typeof value === "boolean" ? value : Boolean(field.defaultValue);
  }
  if (value === undefined) {
    return field.defaultValue !== undefined ? String(field.defaultValue) : "";
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "";
  return String(value);
}

function SpecField({
  field,
  namePrefix,
  initialSpecs,
}: {
  field: FieldDescriptor;
  namePrefix: string;
  initialSpecs: Record<string, unknown> | undefined;
}) {
  const fullName = `${namePrefix}${field.name}`;

  if (field.kind === "object" && field.children) {
    const nestedSource = initialSpecs?.[field.name] as Record<string, unknown> | undefined;
    return (
      <fieldset className="space-y-2 rounded border border-zinc-800 p-3">
        <legend className="px-1 text-xs text-zinc-500">{field.name}</legend>
        <div className="grid grid-cols-2 gap-2">
          {field.children.map((child) => (
            <SpecField
              key={child.name}
              field={child}
              namePrefix={`${fullName}.`}
              initialSpecs={nestedSource}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  const rawValue = getRawValue(field, initialSpecs);

  return (
    <div className="space-y-1">
      <label htmlFor={fullName} className={labelClass}>
        {field.name}
        {field.required ? " *" : ""}
        {(field.kind === "string-array" || field.kind === "number-array") && " (comma-separated)"}
      </label>
      {field.kind === "enum" && field.enumOptions ? (
        <select
          id={fullName}
          name={fullName}
          defaultValue={String(rawValue)}
          required={field.required}
          className={inputClass}
        >
          {!field.required && <option value="">--</option>}
          {field.enumOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === "boolean" ? (
        <input
          id={fullName}
          name={fullName}
          type="checkbox"
          defaultChecked={Boolean(rawValue)}
          className="h-4 w-4"
        />
      ) : field.kind === "number" ? (
        <input
          id={fullName}
          name={fullName}
          type="number"
          step="any"
          defaultValue={rawValue === "" ? undefined : String(rawValue)}
          required={field.required}
          className={inputClass}
        />
      ) : (
        <input
          id={fullName}
          name={fullName}
          type="text"
          defaultValue={String(rawValue)}
          required={field.required}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function ComponentForm({
  categories,
  initialComponent,
}: {
  categories: CategoryOption[];
  initialComponent?: InitialComponent;
}) {
  const router = useRouter();
  const mode = initialComponent ? "edit" : "create";
  const [categoryKey, setCategoryKey] = useState(
    initialComponent?.categoryKey ?? categories[0]?.key ?? "",
  );
  const [images, setImages] = useState<string[]>(initialComponent?.images ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = useMemo(() => {
    if (!categoryKey) return [];
    return describeSpecSchema(getSpecSchema(categoryKey)) ?? [];
  }, [categoryKey]);

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Failed to request an upload URL.");
      }

      const uploadResponse = await fetch(body.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed.");
      }

      setImages((prev) => [...prev, body.data.publicUrl]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw: Record<string, string | boolean> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") raw[key] = value;
    }
    for (const field of fields) {
      if (field.kind === "boolean") {
        raw[field.name] = formData.get(field.name) === "on";
      }
    }

    const specifications = coerceFormValues(fields, raw);

    const payload: Record<string, unknown> = {
      brandName: String(formData.get("brandName") ?? ""),
      model: String(formData.get("model") ?? ""),
      price: Number(formData.get("price")),
      description: String(formData.get("description") ?? "") || undefined,
      images,
      isAvailable: formData.get("isAvailable") === "on",
      specifications,
    };

    if (mode === "create") {
      payload.sku = String(formData.get("sku") ?? "");
      payload.categoryKey = categoryKey;
    }

    const url = mode === "create" ? "/api/components" : `/api/components/${initialComponent!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body?.error?.message ?? "Save failed.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="rounded border border-red-900 bg-red-950/40 p-2 text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="sku" className={labelClass}>
            SKU *
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            required
            disabled={mode === "edit"}
            defaultValue={initialComponent?.sku}
            className={`${inputClass} disabled:opacity-50`}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="categoryKey" className={labelClass}>
            Category *
          </label>
          <select
            id="categoryKey"
            value={categoryKey}
            onChange={(event) => setCategoryKey(event.target.value)}
            disabled={mode === "edit"}
            className={`${inputClass} disabled:opacity-50`}
          >
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="brandName" className={labelClass}>
            Brand *
          </label>
          <input
            id="brandName"
            name="brandName"
            type="text"
            required
            defaultValue={initialComponent?.brandName}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="model" className={labelClass}>
            Model *
          </label>
          <input
            id="model"
            name="model"
            type="text"
            required
            defaultValue={initialComponent?.model}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="price" className={labelClass}>
            Price (USD) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initialComponent?.price}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2 pt-5">
          <input
            id="isAvailable"
            name="isAvailable"
            type="checkbox"
            defaultChecked={initialComponent?.isAvailable ?? true}
            className="h-4 w-4"
          />
          <label htmlFor="isAvailable" className="text-sm text-zinc-300">
            Available for sale
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initialComponent?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Images</p>
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-xs">
              <span className="max-w-[200px] truncate text-zinc-400">{url}</span>
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((existing) => existing !== url))}
                className="text-red-400"
              >
                remove
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageSelect} />
        {isUploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      </div>

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <h2 className="text-sm font-medium text-zinc-200">Specifications</h2>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <SpecField
              key={field.name}
              field={field}
              namePrefix=""
              initialSpecs={initialComponent?.specifications}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isUploading}
        className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : mode === "create" ? "Create component" : "Save changes"}
      </button>
    </form>
  );
}
