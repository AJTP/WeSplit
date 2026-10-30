import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[0_12px_30px_-14px_var(--color-accent)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_var(--color-accent)]",
  secondary: "border border-line bg-surface-2 text-ink hover:border-ink/25 hover:bg-surface",
  danger:
    "border border-negative/30 bg-negative/10 text-negative hover:bg-negative hover:text-white",
  ghost: "text-accent-text hover:bg-accent/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
