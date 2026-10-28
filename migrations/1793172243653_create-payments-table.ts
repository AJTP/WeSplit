import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  // Dinero que un miembro entrega a otro para saldar. No es un gasto: no se
  // reparte, solo mueve el saldo entre dos miembros.
  pgm.createTable("payments", {
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
    from_member_id: { type: "uuid", notNull: true },
    to_member_id: { type: "uuid", notNull: true },
    amount: { type: "numeric(14, 2)", notNull: true },
    paid_on: { type: "date", notNull: true },
    note: { type: "varchar(255)" },
    created_by_user_id: {
      type: "uuid",
      references: "users",
      onDelete: "SET NULL",
    },
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

  pgm.addConstraint("payments", "payments_amount_positive", { check: "amount > 0" });
  pgm.addConstraint("payments", "payments_distinct_members", {
    check: "from_member_id <> to_member_id",
  });

  // Las dos puntas del pago tienen que ser miembros de ESTE grupo.
  pgm.addConstraint("payments", "payments_from_member_in_group", {
    foreignKeys: {
      columns: ["from_member_id", "group_id"],
      references: "group_members (id, group_id)",
    },
    deferrable: true,
    deferred: false,
  });

  pgm.addConstraint("payments", "payments_to_member_in_group", {
    foreignKeys: {
      columns: ["to_member_id", "group_id"],
      references: "group_members (id, group_id)",
    },
    deferrable: true,
    deferred: false,
  });

  pgm.createIndex("payments", ["group_id", { name: "paid_on", sort: "DESC" }], {
    name: "payments_group_date_idx",
    where: "deleted_at IS NULL",
  });
  pgm.createIndex("payments", "from_member_id", { name: "payments_from_member_idx" });
  pgm.createIndex("payments", "to_member_id", { name: "payments_to_member_idx" });

  pgm.createTrigger("payments", "payments_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("payments");
};
