import { setupServer } from "msw/node";

// API simulada para tests de integración. Cada test define sus propios handlers.
export const server = setupServer();
