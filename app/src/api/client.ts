import { ApiError } from "./errors";
import { tokens } from "./tokens";
import type { ErrorBody, TokenPair } from "./types";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  // false para endpoints públicos o de login, que no llevan Bearer.
  auth?: boolean;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ""}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined; // p. ej. un 502 HTML de un proxy
  }
}

async function send<T>(method: Method, path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth !== false) {
    const token = tokens.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) return undefined as T;

  const data = await parseBody(response);
  if (!response.ok) {
    const body = data as Partial<ErrorBody> | undefined;
    throw new ApiError(response.status, body?.message ?? response.statusText, body?.details);
  }
  return data as T;
}

// Una sola renovación en vuelo: el refresh rota el token, así que dos
// renovaciones simultáneas invalidarían la primera.
let inflightRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  inflightRefresh ??= (async () => {
    const refreshToken = tokens.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const pair = await send<TokenPair>("POST", "/auth/refresh", {
        body: { refresh_token: refreshToken },
        auth: false,
      });
      tokens.save(pair);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

// Llamada autenticada: si el access token caducó, renueva una vez y reintenta.
// Si la renovación falla, la sesión termina y AuthProvider manda a /login.
export async function api<T = void>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await send<T>(method, path, options);
  } catch (error) {
    const isAuthCall = options.auth === false;
    if (!(error instanceof ApiError) || error.status !== 401 || isAuthCall) throw error;

    if (await refreshSession()) return send<T>(method, path, options);
    tokens.clear();
    throw error;
  }
}

export const get = <T>(path: string, query?: RequestOptions["query"]) =>
  api<T>("GET", path, { query });
export const post = <T>(path: string, body?: unknown, auth = true) =>
  api<T>("POST", path, { body, auth });
export const patch = <T>(path: string, body: unknown) => api<T>("PATCH", path, { body });
export const del = (path: string) => api<void>("DELETE", path);
