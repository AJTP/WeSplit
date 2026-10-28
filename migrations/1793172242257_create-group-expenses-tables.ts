import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("group_expenses", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    group_id: {
      type: "uuid",
      notNull: true,
      references: "groups",
      onDelete: "CASCADE",
    },
    // Sin `references` aquí: la integridad la da la FK compuesta de abajo,
    // que además comprueba que el pagador es miembro de ESTE grupo.
    paid_by_member_id: { type: "uuid", notNull: true },
    category_id: {
      type: "uuid",
      references: "categories",
      onDelete: "SET NULL",
    },
    // Quien lo registró, que no tiene por qué ser quien lo pagó. SET NULL:
    // el gasto no se puede perder, afecta a saldos de terceros.
    created_by_user_id: {
      type: "uuid",
      references: "users",
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

  pgm.addConstraint("group_expenses", "group_expenses_amount_positive", {
    check: "amount > 0",
  });

  // FK compuesta: el pagador tiene que ser miembro de ESTE grupo, no de otro.
  //
  // DEFERRABLE INITIALLY IMMEDIATE: en el día a día se comprueba al instante,
  // con un error claro. Se deja diferible solo por el borrado de grupo, donde
  // la cascada vacía group_members y group_expenses en la misma sentencia sin
  // orden garantizado:
  //   BEGIN; SET CONSTRAINTS ALL DEFERRED; DELETE FROM groups WHERE id=$1; COMMIT;
  pgm.addConstraint("group_expenses", "group_expenses_payer_in_group", {
    foreignKeys: {
      columns: ["paid_by_member_id", "group_id"],
      references: "group_members (id, group_id)",
    },
    deferrable: true,
    deferred: false,
  });

  pgm.createIndex("group_expenses", ["group_id", { name: "expense_date", sort: "DESC" }], {
    name: "group_expenses_group_date_idx",
    where: "deleted_at IS NULL",
  });
  pgm.createIndex("group_expenses", "paid_by_member_id", {
    name: "group_expenses_payer_idx",
  });
  pgm.createIndex("group_expenses", "category_id", {
    name: "group_expenses_category_idx",
    where: "category_id IS NOT NULL",
  });

  pgm.createTrigger("group_expenses", "group_expenses_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // Cuánto le toca a cada participante, siempre como cantidad exacta: el
  // reparto (partes iguales, porcentajes...) lo calcula el frontend.
  pgm.createTable(
    "group_expense_shares",
    {
      group_expense_id: {
        type: "uuid",
        notNull: true,
        references: "group_expenses",
        onDelete: "CASCADE",
      },
      // Sin `references` aquí tampoco: se declara aparte más abajo porque
      // tiene que ser DEFERRABLE, y una FK en línea no admite ese modificador.
      member_id: { type: "uuid", notNull: true },
      amount: { type: "numeric(14, 2)", notNull: true },
    },
    // La PK compuesta garantiza que un miembro aparece una sola vez por gasto.
    { constraints: { primaryKey: ["group_expense_id", "member_id"] } },
  );

  pgm.addConstraint("group_expense_shares", "group_expense_shares_amount_not_negative", {
    check: "amount >= 0",
  });

  // Diferible por el mismo motivo que la FK del pagador. Sin ON DELETE:
  // borrar un miembro que aparece en un reparto debe fallar (nadie se puede
  // llevar por delante un gasto que otros ya han visto reflejado).
  //
  // Nota: esta FK NO incluye group_id (a diferencia de la del pagador), así
  // que no impide por sí sola que un participante sea de otro grupo. Esa
  // comprobación la hace el servicio antes de insertar.
  pgm.addConstraint("group_expense_shares", "group_expense_shares_member_id_fkey", {
    foreignKeys: { columns: "member_id", references: "group_members" },
    deferrable: true,
    deferred: false,
  });

  // Para calcular saldos y para la comprobación de la FK al borrar un miembro.
  pgm.createIndex("group_expense_shares", "member_id", {
    name: "group_expense_shares_member_idx",
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("group_expense_shares");
  pgm.dropTable("group_expenses");
};
