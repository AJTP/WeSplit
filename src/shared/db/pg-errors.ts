import type { AppException } from "../exceptions/app-exception.js";

// Lo que node-postgres añade a los errores que vienen del servidor.
export interface PostgresError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

export const SQLSTATE = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
} as const;

export function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && typeof (error as PostgresError).code === "string";
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  return (
    isPostgresError(error) &&
    error.code === SQLSTATE.UNIQUE_VIOLATION &&
    (constraint === undefined || error.constraint === constraint)
  );
}

export function isForeignKeyViolation(error: unknown, constraint?: string): boolean {
  return (
    isPostgresError(error) &&
    error.code === SQLSTATE.FOREIGN_KEY_VIOLATION &&
    (constraint === undefined || error.constraint === constraint)
  );
}

// Traduce, por NOMBRE DE CONSTRAINT, los fallos de integridad que son
// realmente reglas de negocio (p. ej. un alias duplicado). Deliberadamente no
// hay un mapa global de SQLSTATE -> HTTP en el error handler: el código dice
// qué TIPO de regla se rompió, pero solo el nombre de la constraint dice QUÉ
// regla de negocio es. Lo que no esté en `mapping` se relanza tal cual: es un
// bug nuestro (p. ej. un CHECK que el usuario nunca podría provocar porque ya
// lo valida Zod) y debe salir como 500 con su traza, no disfrazado de 4xx.
export async function mapConstraintErrors<T>(
  run: () => Promise<T>,
  mapping: Record<string, (error: PostgresError) => AppException>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const mapper =
      isPostgresError(error) && error.constraint ? mapping[error.constraint] : undefined;
    if (mapper) {
      throw mapper(error as PostgresError);
    }
    throw error;
  }
}
