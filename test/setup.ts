import { build } from "../src/app.js";
import type { FastifyInstance } from "fastify";

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await build();
  await app.ready();
  return app;
}

// Todas las tablas de la aplicación, hijas antes que padres para que el orden
// sea legible aunque el TRUNCATE no lo necesite (ver nota de abajo). Nunca
// incluir "pgmigrations": vaciarla haría que el próximo migrate:up reaplicase
// todo y reventara.
const APP_TABLES = [
  "group_expense_shares",
  "group_expenses",
  "payments",
  "group_members",
  "groups",
  "personal_expenses",
  "categories",
  "identities",
  "refresh_tokens",
  "users",
];

// Las predefinidas se repiten aquí a propósito: la migración que las siembra
// es una foto del pasado y no debe acoplarse a una constante de src/.
const PREDEFINED_CATEGORIES = [
  "Comida",
  "Supermercado",
  "Transporte",
  "Alojamiento",
  "Ocio",
  "Compras",
  "Salud",
  "Servicios",
  "Viajes",
  "Otros",
];

export async function truncateAll(app: FastifyInstance): Promise<void> {
  // Un solo TRUNCATE con todas las tablas: así Postgres no comprueba las FK
  // entre ellas y no hace falta ni orden ni SET CONSTRAINTS ALL DEFERRED.
  //
  // Importante: NO vale truncar solo "users" con CASCADE. TRUNCATE no borra
  // filas selectivamente, trunca tabla entera, así que en cuanto existe
  // "categories" (que referencia a "users"), ese único TRUNCATE se llevaría
  // también las 10 categorías predefinidas. Tampoco vale un DELETE FROM
  // groups: dispararía la cascada fila a fila que las FK diferibles están
  // pensadas para evitar, y fallaría.
  await app.pg.query(`TRUNCATE TABLE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE`);

  // El TRUNCATE se lleva también las categorías predefinidas, que no son
  // datos de test sino parte del esquema funcional: se vuelven a sembrar.
  await app.pg.query(
    "INSERT INTO categories (user_id, name) SELECT NULL, name FROM unnest($1::text[]) AS name",
    [PREDEFINED_CATEGORIES],
  );
}
