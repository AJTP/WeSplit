import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm font-medium text-accent-text">404</p>
      <h1 className="text-2xl font-semibold text-ink">Esta página no existe</h1>
      <Link to="/" className="text-sm text-accent-text hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
