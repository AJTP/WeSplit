import type { ReactNode } from "react";
import { errorMessage } from "../lib/errors";
import { Button } from "./Button";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-16 text-sm font-medium text-muted"
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"
      />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 border-dashed px-6 py-14 text-center animate-rise">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-2xl text-accent-text"
      >
        ✦
      </span>
      <p className="display text-xl text-ink">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl border border-negative/30 bg-negative/10 p-5 text-sm font-medium text-negative"
    >
      <p>{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
