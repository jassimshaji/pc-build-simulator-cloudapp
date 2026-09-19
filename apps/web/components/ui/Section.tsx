import type { ReactNode } from "react";

// A titled block inside a side panel ("Build summary", "Airflow", ...).
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-medium text-zinc-200">{title}</h2>
      {children}
    </section>
  );
}

// Muted single-line message (empty states, hints).
export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-zinc-600">{children}</p>;
}
