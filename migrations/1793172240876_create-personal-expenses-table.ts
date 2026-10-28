import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("personal_expenses", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // CASCADE: el gasto individual de una cuenta borrada se va con ella; no
    // afecta a saldos de terceros (a diferencia de los gastos de grupo).
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    category_id: {
      type: "uuid",
      references: "categories",
      onDelete: "SET NULL",
    },
    description: { type: "varchar(255)", notNull: true },
    amount: { type: "numeric(14, 2)", notNull: true },
    expense_date: { type: "date", notNull: true },
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
    deleted_at: { type: "timestamptz" },
  });

  pgm.addConstraint("personal_expenses", "personal_expenses_amount_positive", {
    check: "amount > 0",
  });

  // Parcial: todas las lecturas filtran deleted_at IS NULL.
  pgm.createIndex("personal_expenses", ["user_id", { name: "expense_date", sort: "DESC" }], {
    name: "personal_expenses_user_date_idx",
    where: "deleted_at IS NULL",
  });

  pgm.createIndex("personal_expenses", "category_id", {
    name: "personal_expenses_category_idx",
    where: "category_id IS NOT NULL",
  });

  pgm.createTrigger("personal_expenses", "personal_expenses_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("personal_expenses");
};
