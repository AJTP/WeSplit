import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("categories", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // NULL -> categoría predefinida del sistema, común a todos los usuarios.
    user_id: {
      type: "uuid",
      references: "users",
      onDelete: "CASCADE",
    },
    name: { type: "varchar(80)", notNull: true },
    color: { type: "varchar(7)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Se guarda ya recortado para que el índice único de abajo no deje pasar
  // un "  Comida" conviviendo con "Comida".
  pgm.addConstraint("categories", "categories_name_trimmed", {
    check: "name = btrim(name) AND name <> ''",
  });

  pgm.addConstraint("categories", "categories_color_format", {
    check: "color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'",
  });

  // El nombre de las predefinidas es único entre ellas...
  pgm.createIndex("categories", ["lower(name)"], {
    name: "categories_predefined_name_unique",
    unique: true,
    where: "user_id IS NULL",
  });

  // ...y el de las personalizadas, único dentro de cada usuario. Nada impide
  // que un usuario llame a una suya igual que una predefinida.
  pgm.createIndex("categories", ["user_id", "lower(name)"], {
    name: "categories_user_name_unique",
    unique: true,
    where: "user_id IS NOT NULL",
  });

  pgm.createTrigger("categories", "categories_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
};

export const down = (pgm: MigrationBuilder): void => {
  // El trigger y los índices se van con la tabla.
  pgm.dropTable("categories");
};
