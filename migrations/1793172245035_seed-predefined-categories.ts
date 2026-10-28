import type { MigrationBuilder } from "node-pg-migrate";

// Literal, no interpolado desde un array: ninguno de estos nombres lleva
// apóstrofo hoy, pero construir el VALUES por interpolación sería una
// inyección esperando a ocurrir el día que alguien añada uno que sí lo lleve.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO categories (user_id, name) VALUES
      (NULL, 'Comida'),
      (NULL, 'Supermercado'),
      (NULL, 'Transporte'),
      (NULL, 'Alojamiento'),
      (NULL, 'Ocio'),
      (NULL, 'Compras'),
      (NULL, 'Salud'),
      (NULL, 'Servicios'),
      (NULL, 'Viajes'),
      (NULL, 'Otros')
    ON CONFLICT DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM categories
    WHERE user_id IS NULL
      AND name IN (
        'Comida', 'Supermercado', 'Transporte', 'Alojamiento', 'Ocio',
        'Compras', 'Salud', 'Servicios', 'Viajes', 'Otros'
      )
  `);
};
