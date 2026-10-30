// Error de la API: status HTTP + message del backend. Nunca se usa `error`
// (nombre de la clase), porque no es estable: ver riesgos en el plan.
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  // Errores de validación (400) llegan como `details`: lista de issues con
  // `path` (zod) o `instancePath` (ajv). Se agrupan por el primer segmento.
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!Array.isArray(this.details)) return errors;
    for (const issue of this.details) {
      if (typeof issue !== "object" || issue === null) continue;
      const { path, instancePath, message } = issue as {
        path?: unknown;
        instancePath?: unknown;
        message?: unknown;
      };
      const segments = Array.isArray(path)
        ? path.map(String)
        : typeof instancePath === "string"
          ? instancePath.split("/").filter(Boolean)
          : [];
      const field = segments[0];
      if (field && typeof message === "string" && !errors[field]) errors[field] = message;
    }
    return errors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
