import type { z } from "zod";

// Introspects a Zod object schema (one of @pcbuilder/component-models'
// per-category spec schemas) into a flat field list a form can render, and
// converts raw HTML form input back into a plausible JS value for that
// schema. This is a UI convenience only — the server always re-validates the
// submitted specifications against the real schema (registry.ts), so this
// module never needs to be perfectly exhaustive, just good enough to render
// a usable admin form for every category currently defined.
//
// Built against Zod v4's actual runtime shape (`schema.def.type` as the
// discriminator, `.unwrap()`/`.removeDefault()`/`.element`/`.shape`/`.options`
// as the stable public accessors) — verified empirically against the
// installed zod version rather than assumed from v3 knowledge, since v4
// reworked its internals substantially.

export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "string-array"
  | "number-array"
  | "object";

export interface FieldDescriptor {
  name: string;
  kind: FieldKind;
  required: boolean;
  enumOptions?: string[];
  defaultValue?: unknown;
  children?: FieldDescriptor[]; // only present when kind === "object"
}

// Minimal structural type covering what we actually touch on a Zod schema
// instance, so this file doesn't need Zod's full internal type exports.
interface IntrospectableSchema {
  def: { type: string };
  unwrap?: () => IntrospectableSchema;
  removeDefault?: () => IntrospectableSchema;
  element?: IntrospectableSchema;
  shape?: Record<string, IntrospectableSchema>;
  options?: string[];
}

function unwrap(schema: IntrospectableSchema): {
  inner: IntrospectableSchema;
  required: boolean;
  defaultValue?: unknown;
} {
  let required = true;
  let defaultValue: unknown;
  let current = schema;

  for (;;) {
    if (current.def.type === "optional" && current.unwrap) {
      required = false;
      current = current.unwrap();
      continue;
    }
    if (current.def.type === "default") {
      required = false;
      defaultValue = (current as unknown as { def: { defaultValue: unknown } }).def.defaultValue;
      current = current.removeDefault ? current.removeDefault() : current;
      continue;
    }
    break;
  }

  return { inner: current, required, defaultValue };
}

function describeField(name: string, schema: IntrospectableSchema): FieldDescriptor {
  const { inner, required, defaultValue } = unwrap(schema);

  switch (inner.def.type) {
    case "enum":
      return { name, kind: "enum", required, enumOptions: inner.options, defaultValue };
    case "boolean":
      return { name, kind: "boolean", required, defaultValue };
    case "number":
      return { name, kind: "number", required, defaultValue };
    case "string":
      return { name, kind: "string", required, defaultValue };
    case "array": {
      const element = inner.element ? unwrap(inner.element).inner : undefined;
      const isNumeric = element?.def.type === "number";
      return { name, kind: isNumeric ? "number-array" : "string-array", required, defaultValue };
    }
    case "object":
      return {
        name,
        kind: "object",
        required,
        children: inner.shape ? describeShape(inner.shape) : [],
      };
    default:
      // Unions, records, etc. — anything not explicitly handled renders as a
      // plain string field; the server's real validation is the source of
      // truth regardless of how permissive the form is.
      return { name, kind: "string", required, defaultValue };
  }
}

function describeShape(shape: Record<string, IntrospectableSchema>): FieldDescriptor[] {
  return Object.entries(shape).map(([name, fieldSchema]) => describeField(name, fieldSchema));
}

export function describeSpecSchema(schema: z.ZodType): FieldDescriptor[] | null {
  const introspectable = schema as unknown as IntrospectableSchema;
  if (introspectable.def.type !== "object" || !introspectable.shape) {
    return null; // e.g. the generic z.record fallback for future categories
  }
  return describeShape(introspectable.shape);
}

// Converts flat form state (string/boolean values keyed by field name, with
// "parent.child" keys for nested objects) into a plausible specifications
// object matching the field descriptors' shape.
export function coerceFormValues(
  fields: FieldDescriptor[],
  raw: Record<string, string | boolean>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = raw[field.name];

    if (field.kind === "object" && field.children) {
      const nested: Record<string, string | boolean> = {};
      for (const child of field.children) {
        const key = `${field.name}.${child.name}`;
        if (key in raw) nested[child.name] = raw[key];
      }
      const nestedValue = coerceFormValues(field.children, nested);
      if (Object.keys(nestedValue).length > 0) result[field.name] = nestedValue;
      continue;
    }

    if (rawValue === undefined || rawValue === "") {
      continue; // let the server schema's own required/optional/default rules decide
    }

    switch (field.kind) {
      case "number": {
        const num = Number(rawValue);
        if (!Number.isNaN(num)) result[field.name] = num;
        break;
      }
      case "boolean":
        result[field.name] = rawValue === true || rawValue === "true";
        break;
      case "string-array":
        result[field.name] = String(rawValue)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        break;
      case "number-array":
        result[field.name] = String(rawValue)
          .split(",")
          .map((entry) => Number(entry.trim()))
          .filter((entry) => !Number.isNaN(entry));
        break;
      default:
        result[field.name] = rawValue;
    }
  }

  return result;
}
