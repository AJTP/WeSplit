# WeSplit · frontend

SPA en React 19 + Vite + TypeScript para usar la API de WeSplit como usuario corriente.
Inicio de sesión solo con Google.

## Puesta en marcha

1. Backend en marcha en `http://localhost:3000` (ver el README de la raíz).
2. Copia la configuración y rellena el client ID de Google:

   ```bash
   cp .env.example .env.local
   ```

   `VITE_GOOGLE_CLIENT_ID` debe ser el mismo que `GOOGLE_CLIENT_ID` del backend. En la consola de
   Google, añade `http://localhost:5173` como origen JavaScript autorizado.

3. Instala y arranca:

   ```bash
   pnpm install
   pnpm dev
   ```

Las peticiones a `/api/*` se reenvían al backend quitando el prefijo `/api` (ver `vite.config.ts`).

## Scripts

| Script       | Qué hace                                                          |
| ------------ | ----------------------------------------------------------------- |
| `pnpm dev`   | Servidor de desarrollo                                            |
| `pnpm build` | Comprueba tipos y genera `dist/`                                  |
| `pnpm test`  | Tests unitarios y de integración (Vitest + Testing Library + MSW) |
| `pnpm lint`  | ESLint y Prettier                                                 |

## Sesión de desarrollo sin Google

```bash
pnpm dev-session            # desde la raíz: crea un usuario de prueba y un refresh token
```

Abre la URL que imprime (`http://localhost:5173/dev/login#rt=…`). La ruta solo existe en desarrollo.
Por defecto escribe en `localhost:5435/app_dev`; para otra base usa `HOST_DATABASE_URL`.

## Tests E2E (Playwright)

Requiere el Postgres de desarrollo en `localhost:5435`. `pnpm e2e` crea la base `app_e2e`
(si no existe), aplica las migraciones y levanta el backend (puerto 3100) y el frontend (5174).

```bash
pnpm e2e          # suite completa
pnpm e2e:ui       # modo interactivo
pnpm e2e:report   # último informe HTML
```

Cada test crea su usuario y su refresh token, y vacía la base antes de empezar. Los tests van en serie.

## Estructura

- `src/api/`: cliente HTTP (renovación de token, errores) y un módulo por recurso de la API.
- `src/auth/`: sesión, login con Google y protección de rutas.
- `src/features/`: pantallas agrupadas por dominio (groups, expenses, personal, categories, invitations, account).
- `src/lib/`: dinero en céntimos, reparto, fechas y traducción de errores.

## Notas

- El `refreshToken` se guarda en `localStorage`; el `accessToken` solo en memoria.
- Los importes se calculan en céntimos y el reparto lo hace el frontend; la API valida que la suma cuadre.
