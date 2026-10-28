import type { PoolClient } from "pg";
import type { Queryable } from "../types.js";

// Un Pool (fastify.pg) sirve: sabe dar conexiones dedicadas, que es lo que
// hace falta para abrir una transacción.
export type Transactional = Queryable & { connect(): Promise<PoolClient> };

export interface TransactionOptions {
  // Difiere las FK DEFERRABLE hasta el COMMIT. Solo lo necesita el borrado de
  // un grupo: la cascada vacía group_members y group_expenses en la misma
  // sentencia y sin orden garantizado, lo que haría fallar la comprobación
  // inmediata de group_expenses_payer_in_group.
  deferConstraints?: boolean;
}

// Los servicios reciben Queryable y nunca abren su propia transacción si ya
// están dentro de una: solo la abre el servicio "de entrada" de la operación,
// que pasa el `tx` recibido hacia abajo. withTransaction no es reentrante.
export async function withTransaction<T>(
  pg: Transactional,
  fn: (tx: Queryable) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const client = await pg.connect();
  try {
    await client.query("BEGIN");
    if (options.deferConstraints) {
      await client.query("SET CONSTRAINTS ALL DEFERRED");
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // La conexión ya estaba rota; el error original es el que importa.
    }
    throw error;
  } finally {
    client.release();
  }
}
