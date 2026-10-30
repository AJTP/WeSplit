import { ApiError } from "../api/errors";

// Traducción de los mensajes en inglés del backend a los casos que la UI
// muestra. Si no coincide ninguno, se usa el mensaje del backend tal cual.
const knownMessages: [pattern: string, text: string][] = [
  ["already linked to another user", "Esa cuenta de Google ya está vinculada a otro usuario."],
  ["Cannot unlink the only identity", "No puedes desvincular tu único método de acceso."],
  ["alias with that name already exists", "Ya existe un alias con ese nombre en el grupo."],
  ["has already been claimed", "Ese alias ya lo ha reclamado otra persona."],
  ["already have an alias in group", "Ya tienes un alias en este grupo."],
  ["has expenses or payments", "Este miembro tiene gastos o pagos y no se puede eliminar."],
  ["must keep at least one admin", "El grupo necesita al menos un administrador."],
  ["already have a category with that name", "Ya tienes una categoría con ese nombre."],
  ["not a predefined category", "Esa categoría no se puede usar en gastos de grupo."],
  ["not part of group", "Algún miembro seleccionado no pertenece al grupo."],
  ["sum of the shares", "El reparto no suma el importe del gasto."],
  ["can rename it", "No puedes cambiar ese alias."],
  ["must be an admin", "Solo un administrador puede hacer esto."],
  ["not a member of group", "Ya no formas parte de este grupo."],
  ["already a member", "Ya formas parte de este grupo."],
];

export function errorMessage(error: unknown): string {
  if (error instanceof TypeError) return "No hay conexión con el servidor. Revisa tu red.";
  if (!(error instanceof ApiError)) return "Ha ocurrido un error inesperado.";

  const known = knownMessages.find(([pattern]) => error.message.includes(pattern));
  if (known) return known[1];

  switch (error.status) {
    case 400:
      return "Revisa los datos del formulario.";
    case 401:
      return "Tu sesión ha caducado. Vuelve a entrar.";
    case 403:
      return "No tienes permiso para hacer esto.";
    case 404:
      return "No encontramos lo que buscabas.";
    case 409:
    case 422:
      return error.message;
    case 429:
      return "Demasiados intentos. Espera un minuto y vuelve a probar.";
    default:
      return "Algo ha ido mal en el servidor. Inténtalo de nuevo.";
  }
}
