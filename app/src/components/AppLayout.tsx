import { NavLink, Outlet, useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { Button } from "./Button";

const links = [
  { to: "/", label: "Inicio", end: true },
  { to: "/groups", label: "Grupos" },
  { to: "/expenses", label: "Personal" },
  { to: "/categories", label: "Categorías" },
  { to: "/account", label: "Cuenta" },
];

export function AppLayout() {
  const { logout, state } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout(false);
    navigate("/login", { replace: true });
  };

  const initial = state.status === "authenticated" ? state.user.name.charAt(0).toUpperCase() : "";

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <NavLink to="/" className="group flex items-center gap-2.5">
            <span className="display grid size-9 place-items-center rounded-xl bg-accent text-lg text-on-accent transition duration-500 group-hover:rotate-[-8deg]">
              W
            </span>
            <span className="display text-xl text-ink">WeSplit</span>
          </NavLink>

          <nav
            aria-label="Principal"
            className="hidden items-center gap-1 rounded-full border border-line bg-surface/70 p-1 md:flex"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-1.5 text-sm font-semibold transition duration-300 ${isActive ? "bg-ink text-canvas" : "text-muted hover:text-ink"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {state.status === "authenticated" ? (
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-glow text-sm font-black text-on-accent"
                title={state.user.name}
              >
                {initial}
              </span>
            ) : null}
            <Button
              variant="secondary"
              onClick={handleLogout}
              disabled={signingOut}
              className="!px-4 !py-2"
            >
              Salir
            </Button>
          </div>
        </div>

        <nav
          aria-label="Principal móvil"
          className="flex gap-1 overflow-x-auto px-5 pb-3 md:hidden"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${isActive ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <Outlet />
      </main>
    </div>
  );
}
