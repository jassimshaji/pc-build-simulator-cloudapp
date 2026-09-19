import type { ButtonHTMLAttributes } from "react";

// One place for the app's button styles, so a restyle (or a new theme) is a
// change here rather than a hunt through every panel.
const VARIANTS = {
  // The single main action of a region.
  primary: "rounded bg-zinc-100 font-medium text-zinc-950 disabled:opacity-50",
  // Secondary actions.
  outline: "rounded border border-zinc-800 hover:bg-zinc-900 disabled:opacity-50",
  // Low-emphasis text action.
  ghost: "text-zinc-400 hover:text-zinc-100 disabled:opacity-50",
  // Low-emphasis destructive text action.
  danger: "text-zinc-400 hover:text-red-400 disabled:opacity-50",
} as const;

const SIZES = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button({
  variant = "outline",
  size = "sm",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof SIZES;
}) {
  // Text-only variants (ghost/danger) don't take the padded box sizing.
  const sizing = variant === "ghost" || variant === "danger" ? "text-xs" : SIZES[size];
  return <button type={type} className={`${VARIANTS[variant]} ${sizing} ${className}`.trim()} {...props} />;
}
