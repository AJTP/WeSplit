// Rellena la base de desarrollo con datos de ejemplo para probar la app a mano.
//
// Uso:
//   pnpm db:seed              siembra una base vacía (se niega si ya hay usuarios)
//   pnpm db:seed -- --reset   vacía todas las tablas y vuelve a sembrar
//
// Después: `pnpm dev-session` y abre la URL que imprime (usuario dev@wesplit.local).
import crypto from "node:crypto";
import "dotenv/config";
import pg from "pg";

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5435/app_dev";
const databaseUrl = process.env.HOST_DATABASE_URL ?? DEFAULT_DATABASE_URL;
const reset = process.argv.includes("--reset");

// Mismas tablas que test/setup.ts.
const APP_TABLES = [
  "group_expense_shares",
  "group_expenses",
  "payments",
  "group_members",
  "groups",
  "personal_expenses",
  "categories",
  "identities",
  "refresh_tokens",
  "users",
];

const PREDEFINED_CATEGORIES = [
  "Comida",
  "Supermercado",
  "Transporte",
  "Alojamiento",
  "Ocio",
  "Compras",
  "Salud",
  "Servicios",
  "Viajes",
  "Otros",
];

type Db = pg.Client;

// Fecha YYYY-MM-DD de hace `days` días (hoy si es 0).
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Reparto igual en céntimos; el sobrante va al primero (igual que la app).
function equalShares(totalCents: number, memberIds: string[]): Map<string, number> {
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;
  return new Map(memberIds.map((id, index) => [id, base + (index === 0 ? remainder : 0)]));
}

const euros = (cents: number) => (cents / 100).toFixed(2);

async function insertUser(db: Db, name: string, email: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
    [name, email],
  );
  return rows[0]!.id;
}

async function insertGroup(db: Db, name: string, description: string, creatorId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO groups (name, description, invitation_token, created_by_user_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, description, token, creatorId],
  );
  return rows[0]!.id;
}

async function insertMember(
  db: Db,
  groupId: string,
  alias: string,
  role: "admin" | "member",
  userId: string | null,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO group_members (group_id, alias, role, user_id) VALUES ($1, $2, $3, $4) RETURNING id",
    [groupId, alias, role, userId],
  );
  return rows[0]!.id;
}

// Predefinidas o propias de `ownerId`.
async function categoryId(db: Db, name: string, ownerId?: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "SELECT id FROM categories WHERE name = $1 AND (user_id IS NULL OR user_id = $2) ORDER BY user_id NULLS LAST LIMIT 1",
    [name, ownerId ?? null],
  );
  if (!rows[0]) throw new Error(`Falta la categoría ${name}`);
  return rows[0].id;
}

interface GroupExpenseInput {
  groupId: string;
  payerId: string;
  createdBy: string;
  category: string;
  description: string;
  amountCents: number;
  daysAgo: number;
  shares: Map<string, number>;
}

async function insertGroupExpense(db: Db, input: GroupExpenseInput): Promise<void> {
  const sum = [...input.shares.values()].reduce((total, cents) => total + cents, 0);
  if (sum !== input.amountCents) {
    throw new Error(
      `Reparto mal calculado en "${input.description}": ${sum} ≠ ${input.amountCents}`,
    );
  }
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO group_expenses
       (group_id, paid_by_member_id, category_id, created_by_user_id, description, amount, expense_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      input.groupId,
      input.payerId,
      await categoryId(db, input.category),
      input.createdBy,
      input.description,
      euros(input.amountCents),
      daysAgo(input.daysAgo),
    ],
  );
  const expenseId = rows[0]!.id;
  for (const [memberId, cents] of input.shares) {
    await db.query(
      "INSERT INTO group_expense_shares (group_expense_id, member_id, amount) VALUES ($1, $2, $3)",
      [expenseId, memberId, euros(cents)],
    );
  }
}

async function insertPayment(
  db: Db,
  groupId: string,
  from: string,
  to: string,
  amountCents: number,
  daysBack: number,
  note: string,
  createdBy: string,
): Promise<void> {
  await db.query(
    `INSERT INTO payments (group_id, from_member_id, to_member_id, amount, paid_on, note, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [groupId, from, to, euros(amountCents), daysAgo(daysBack), note, createdBy],
  );
}

async function insertPersonal(
  db: Db,
  userId: string,
  description: string,
  amountCents: number,
  daysBack: number,
  category: string | null,
): Promise<void> {
  await db.query(
    `INSERT INTO personal_expenses (user_id, category_id, description, amount, expense_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      category ? await categoryId(db, category, userId) : null,
      description,
      euros(amountCents),
      daysAgo(daysBack),
    ],
  );
}

async function seed(db: Db): Promise<void> {
  // Usuarios. El primero es el que abre `pnpm dev-session`.
  const dev = await insertUser(db, "Usuario de desarrollo", "dev@wesplit.local");
  const marta = await insertUser(db, "Marta Ruiz", "marta@wesplit.test");
  const javi = await insertUser(db, "Javi López", "javi@wesplit.test");
  const lucia = await insertUser(db, "Lucía Sanz", "lucia@wesplit.test");

  // Categoría propia del usuario de desarrollo.
  await db.query(
    "INSERT INTO categories (user_id, name, color) VALUES ($1, 'Gimnasio', '#10b981')",
    [dev],
  );

  // 1) Piso compartido: el usuario de desarrollo es admin. Hay alias sin reclamar.
  const piso = await insertGroup(db, "Piso compartido", "Gastos de la calle Mayor 12", dev);
  const pDev = await insertMember(db, piso, "Usuario de desarrollo", "admin", dev);
  const pMarta = await insertMember(db, piso, "Marta", "member", marta);
  const pJavi = await insertMember(db, piso, "Javi", "member", javi);
  const pLucia = await insertMember(db, piso, "Lucía", "member", null);
  const pInquilino = await insertMember(db, piso, "Inquilino nuevo", "member", null);
  const pisoAll = [pDev, pMarta, pJavi, pLucia, pInquilino];
  const pisoFour = [pDev, pMarta, pJavi, pLucia];

  await insertGroupExpense(db, {
    groupId: piso,
    payerId: pDev,
    createdBy: dev,
    category: "Supermercado",
    description: "Compra del supermercado",
    amountCents: 8430,
    daysAgo: 2,
    shares: equalShares(8430, pisoFour),
  });
  await insertGroupExpense(db, {
    groupId: piso,
    payerId: pJavi,
    createdBy: javi,
    category: "Servicios",
    description: "Factura de la luz",
    amountCents: 9600,
    daysAgo: 5,
    shares: equalShares(9600, [pDev, pMarta, pJavi]),
  });
  await insertGroupExpense(db, {
    groupId: piso,
    payerId: pDev,
    createdBy: dev,
    category: "Servicios",
    description: "Internet",
    amountCents: 3990,
    daysAgo: 12,
    shares: equalShares(3990, pisoAll),
  });
  await insertGroupExpense(db, {
    groupId: piso,
    payerId: pMarta,
    createdBy: marta,
    category: "Ocio",
    description: "Cena de empresa",
    amountCents: 6000,
    daysAgo: 20,
    shares: equalShares(6000, [pDev, pMarta, pJavi]),
  });
  await insertPayment(db, piso, pMarta, pDev, 2000, 1, "Parte de la luz", marta);

  // 2) Viaje a Lisboa: reparto desigual, alias sin reclamar, redondeo visible.
  const lisboa = await insertGroup(db, "Viaje a Lisboa", "Puente de diciembre", dev);
  const lDev = await insertMember(db, lisboa, "Usuario de desarrollo", "admin", dev);
  const lMarta = await insertMember(db, lisboa, "Marta", "member", marta);
  const lPablo = await insertMember(db, lisboa, "Pablo", "member", null);
  const lCarmen = await insertMember(db, lisboa, "Carmen", "member", null);
  const lAll = [lDev, lMarta, lPablo, lCarmen];

  await insertGroupExpense(db, {
    groupId: lisboa,
    payerId: lMarta,
    createdBy: marta,
    category: "Alojamiento",
    description: "Hotel 3 noches",
    amountCents: 24000,
    daysAgo: 30,
    shares: new Map([
      [lDev, 8000],
      [lMarta, 8000],
      [lPablo, 4000],
      [lCarmen, 4000],
    ]),
  });
  await insertGroupExpense(db, {
    groupId: lisboa,
    payerId: lDev,
    createdBy: dev,
    category: "Transporte",
    description: "Taxi al aeropuerto",
    amountCents: 3550,
    daysAgo: 29,
    shares: equalShares(3550, lAll),
  });
  await insertGroupExpense(db, {
    groupId: lisboa,
    payerId: lPablo,
    createdBy: dev,
    category: "Comida",
    description: "Cena del viernes",
    amountCents: 12800,
    daysAgo: 28,
    shares: equalShares(12800, lAll),
  });
  await insertGroupExpense(db, {
    groupId: lisboa,
    payerId: lCarmen,
    createdBy: dev,
    category: "Ocio",
    description: "Entradas al museo",
    amountCents: 4800,
    daysAgo: 27,
    shares: equalShares(4800, [lDev, lMarta, lCarmen]),
  });
  await insertPayment(db, lisboa, lDev, lPablo, 1000, 26, "Adelanto", dev);

  // 3) Cumple de Lucía: lo administra Marta; el usuario de desarrollo es miembro normal.
  const cumple = await insertGroup(db, "Cumple de Lucía", "Tarta y regalo", marta);
  const cMarta = await insertMember(db, cumple, "Marta", "admin", marta);
  const cDev = await insertMember(db, cumple, "Usuario de desarrollo", "member", dev);
  const cLucia = await insertMember(db, cumple, "Lucía", "member", lucia);
  await insertGroupExpense(db, {
    groupId: cumple,
    payerId: cMarta,
    createdBy: marta,
    category: "Comida",
    description: "Tarta",
    amountCents: 2200,
    daysAgo: 3,
    shares: equalShares(2200, [cMarta, cDev, cLucia]),
  });

  // Gastos personales del usuario de desarrollo, repartidos en el tiempo.
  await insertPersonal(db, dev, "Gimnasio mensual", 3500, 1, "Gimnasio");
  await insertPersonal(db, dev, "Café con leche", 240, 0, "Comida");
  await insertPersonal(db, dev, "Abono transporte", 5400, 4, "Transporte");
  await insertPersonal(db, dev, "Netflix", 1399, 6, "Ocio");
  await insertPersonal(db, dev, "Farmacia", 1875, 9, "Salud");
  await insertPersonal(db, dev, "Zapatillas", 8990, 15, "Compras");
  await insertPersonal(db, dev, "Gasolina", 6210, 18, "Transporte");
  await insertPersonal(db, dev, "Revisión del coche", 14500, 40, "Servicios");
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");

  const { rows } = await client.query<{ count: string }>("SELECT count(*) FROM users");
  if (Number(rows[0]?.count) > 0) {
    if (!reset) {
      throw new Error(
        "La base ya tiene usuarios. Para vaciarla y volver a sembrar: pnpm db:seed -- --reset",
      );
    }
    await client.query(`TRUNCATE TABLE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  }

  // El TRUNCATE también borra las predefinidas: se vuelven a sembrar si faltan.
  await client.query(
    `INSERT INTO categories (user_id, name)
     SELECT NULL, name FROM unnest($1::text[]) AS name
     WHERE NOT EXISTS (SELECT 1 FROM categories WHERE user_id IS NULL)`,
    [PREDEFINED_CATEGORIES],
  );

  await seed(client);
  await client.query("COMMIT");
  console.log("Datos de ejemplo cargados.");
  console.log("Grupos: Piso compartido, Viaje a Lisboa, Cumple de Lucía");
  console.log("Siguiente paso: pnpm dev-session  (usuario dev@wesplit.local)");
} catch (error) {
  await client.query("ROLLBACK");
  if ((error as { code?: string }).code === "42P01") {
    throw new Error(`La base no tiene tablas. Aplica las migraciones: pnpm migrate:up`, {
      cause: error,
    });
  }
  throw error;
} finally {
  await client.end();
}
