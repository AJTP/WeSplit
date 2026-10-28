import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable("groups", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "varchar(120)", notNull: true },
    description: { type: "varchar(500)" },
    // Un enlace por grupo, generado al crearlo y permanente. Va en claro (no
    // hasheado como los refresh tokens) porque hay que poder volver a
    // mostrarlo cada vez que alguien lo pide.
    invitation_token: { type: "varchar(64)", notNull: true, unique: true },
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
  });

  pgm.addConstraint("groups", "groups_name_not_blank", {
    check: "btrim(name) <> ''",
  });
  pgm.addConstraint("groups", "groups_invitation_token_not_blank", {
    check: "btrim(invitation_token) <> ''",
  });

  pgm.createTrigger("groups", "groups_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });

  // Única definición de pertenencia al grupo: se es del grupo si se tiene
  // aquí un alias reclamado. Un alias sin user_id participa en los repartos
  // pero no da acceso a nadie.
  pgm.createTable("group_members", {
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
    alias: { type: "varchar(120)", notNull: true },
    // Solo significa algo cuando el alias está reclamado. En uno libre se
    // queda en 'member' y no estorba.
    role: { type: "varchar(20)", notNull: true, default: "member" },
    // ON DELETE SET NULL: si la cuenta se borra, el alias se queda sin dueño
    // y el grupo sigue funcionando con él y con sus gastos.
    user_id: {
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
  });

  pgm.addConstraint("group_members", "group_members_alias_trimmed", {
    check: "alias = btrim(alias) AND alias <> ''",
  });
  pgm.addConstraint("group_members", "group_members_role_valid", {
    check: "role IN ('admin', 'member')",
  });

  // Redundante como unicidad (id ya es PK), pero imprescindible para que
  // group_expenses y payments puedan apuntar a (id, group_id) con una FK
  // compuesta y la base de datos garantice que el miembro es de ESE grupo.
  pgm.addConstraint("group_members", "group_members_id_group_unique", {
    unique: ["id", "group_id"],
  });

  // Un usuario, como mucho un alias por grupo. OJO: esto NO impide reclamar
  // un alias que ya tiene dueño; eso lo garantiza el UPDATE condicional
  // (... WHERE id = $1 AND group_id = $2 AND user_id IS NULL).
  pgm.createIndex("group_members", ["group_id", "user_id"], {
    name: "group_members_group_user_unique",
    unique: true,
    where: "user_id IS NOT NULL",
  });

  // Alias único dentro del grupo sin distinguir mayúsculas, para que al
  // reclamar no haya dos "Antonio" entre los que elegir.
  pgm.createIndex("group_members", ["group_id", "lower(alias)"], {
    name: "group_members_group_alias_unique",
    unique: true,
  });

  // Listar los grupos de un usuario y alimentar su dashboard.
  pgm.createIndex("group_members", "user_id", {
    name: "group_members_user_id_idx",
    where: "user_id IS NOT NULL",
  });

  pgm.createTrigger("group_members", "group_members_set_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    level: "ROW",
    function: "set_updated_at",
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable("group_members");
  pgm.dropTable("groups");
};
