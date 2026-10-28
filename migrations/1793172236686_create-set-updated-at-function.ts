import type { MigrationBuilder } from "node-pg-migrate";

// Mantiene updated_at al día sin depender de que cada repositorio se acuerde
// de escribirla. La usan los triggers de categories, groups, group_members,
// personal_expenses, group_expenses y payments: por eso vive en su propia
// migración y no dentro de la de ninguna de ellas (su `down` no debe romper
// los triggers de las demás).
export const up = (pgm: MigrationBuilder): void => {
  pgm.createFunction(
    "set_updated_at",
    [],
    { returns: "trigger", language: "plpgsql", replace: true },
    `
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    `,
  );
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropFunction("set_updated_at", []);
};
