import type { InputHTMLAttributes } from "react";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100 placeholder:text-zinc-600 ${className}`.trim()}
      {...props}
    />
  );
}
