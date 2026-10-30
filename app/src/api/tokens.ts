import type { TokenPair } from "./types";

// accessToken solo en memoria (caduca en 1h). refreshToken en localStorage: la
// API lo devuelve en el body y no usa cookies. Trade-off aceptado: si hay XSS
// podría robarse; a cambio la sesión sobrevive a recargar la página.
export const REFRESH_TOKEN_KEY = "wesplit.refreshToken";

let accessToken: string | null = null;
const listeners = new Set<() => void>();

function readStorage(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
}

function writeStorage(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(REFRESH_TOKEN_KEY);
    else localStorage.setItem(REFRESH_TOKEN_KEY, value);
  } catch {
    // sin almacenamiento la sesión solo dura lo que la pestaña en memoria
  }
}

export const tokens = {
  getAccessToken: () => accessToken,
  getRefreshToken: readStorage,

  save(pair: TokenPair) {
    accessToken = pair.accessToken;
    writeStorage(pair.refreshToken);
  },

  // Avisa a quien escuche (AuthProvider) de que la sesión terminó.
  clear() {
    accessToken = null;
    writeStorage(null);
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
