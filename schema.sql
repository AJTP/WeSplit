-- =============================================================================
-- WeSplit — Modelo de base de datos (PostgreSQL)
-- =============================================================================
--
-- Documento de referencia del esquema completo. NO se aplica automáticamente:
-- la fuente de verdad de la base de datos viva son las migraciones de
-- `migrations/` (node-pg-migrate). Este fichero sirve para leer el modelo
-- entero de una vez, revisarlo y generar a partir de él las migraciones.
--
-- Las decisiones de diseño y su porqué están en FEATURES.md, sección
-- "Modelo de datos". Aquí solo se comentan los detalles que no se ven en el
-- DDL a simple vista.
--
-- Convenciones heredadas del proyecto:
--   - Claves primarias uuid con gen_random_uuid().
--   - Nombres en snake_case y tablas en plural.
--   - Marcas de tiempo timestamptz con default now().
--   - Importes en numeric (exacto), nunca float. Todos en euros: la
--     aplicación es monomoneda, así que no se guarda la divisa en ningún sitio.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensiones y utilidades
-- -----------------------------------------------------------------------------

-- gen_random_uuid() está en el core desde PostgreSQL 13; en versiones
-- anteriores la aporta pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Mantiene updated_at sin depender de que la aplicación se acuerde.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. Usuarios e identidades  (YA EXISTENTE — migración inicial)
-- =============================================================================

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(120) NOT NULL,
  email       varchar(255) NOT NULL UNIQUE,
  avatar_url  varchar(500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Cuenta registrada. Identidad real de una persona.';

-- Una fila por cada proveedor de identidad vinculado a la cuenta.
CREATE TABLE identities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider          varchar(50) NOT NULL,
  provider_user_id  varchar(255) NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identities_provider_provider_user_id_unique
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX identities_user_id_idx ON identities (user_id);

-- Refresh tokens opacos (no JWT) para poder revocarlos y rotarlos.
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  varchar(64) NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

-- =============================================================================
-- 2. Categorías
-- =============================================================================

-- user_id NULL  -> categoría predefinida, común a todos los usuarios.
-- user_id NOT NULL -> categoría personalizada, visible solo para su dueño.
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  name        varchar(80) NOT NULL,
  color       varchar(7),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Se guarda ya recortado, para que el índice único de más abajo no deje
  -- pasar un "  Comida" que conviva con "Comida".
  CONSTRAINT categories_name_trimmed CHECK (name = btrim(name) AND name <> ''),
  CONSTRAINT categories_color_format
    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

COMMENT ON TABLE categories IS
  'Categorías de gasto. user_id NULL = predefinida del sistema.';

-- El nombre de las predefinidas es único entre ellas...
CREATE UNIQUE INDEX categories_predefined_name_unique
  ON categories (lower(name)) WHERE user_id IS NULL;

-- ...y el de las personalizadas es único dentro de cada usuario. Nada impide
-- que un usuario llame a una suya igual que una predefinida.
CREATE UNIQUE INDEX categories_user_name_unique
  ON categories (user_id, lower(name)) WHERE user_id IS NOT NULL;

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. Grupos y miembros
-- =============================================================================

CREATE TABLE groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                varchar(120) NOT NULL,
  description         varchar(500),
  -- Enlace de invitación: uno por grupo, generado al crearlo y para siempre.
  -- Va en claro, no hasheado como los refresh tokens, porque hay que poder
  -- volver a mostrarlo cada vez que alguien pide el enlace. Lo genera la
  -- aplicación con un aleatorio criptográfico y seguro para URL.
  invitation_token    varchar(64) NOT NULL UNIQUE,
  created_by_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT groups_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT groups_invitation_token_not_blank
    CHECK (btrim(invitation_token) <> '')
);

CREATE TRIGGER groups_set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Los miembros son los alias entre los que se reparten los gastos. Pueden
-- existir sin ningún usuario detrás: así se puede repartir desde el minuto uno.
--
-- Esta tabla es además la única definición de pertenencia al grupo: un usuario
-- pertenece al grupo si, y solo si, tiene aquí un alias reclamado. No hay una
-- tabla de acceso aparte porque, con las reglas de permisos del proyecto, un
-- usuario sin alias no puede hacer nada dentro del grupo; quien tiene el
-- enlace entra y elige alias en un solo paso.
CREATE TABLE group_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  alias       varchar(120) NOT NULL,
  -- Solo significa algo cuando el alias está reclamado. En uno libre se queda
  -- en 'member' y no estorba, aunque permite dejar un alias preparado como
  -- administrador antes de que su dueño lo reclame.
  role        varchar(20) NOT NULL DEFAULT 'member',
  -- NULL mientras nadie lo haya reclamado. Si la cuenta se borra, el alias
  -- se queda sin dueño y el grupo sigue funcionando con él.
  --
  -- No se guarda la fecha de reclamación a propósito: ON DELETE SET NULL solo
  -- puede anular esta columna, así que una claimed_at acabaría apuntando a un
  -- alias ya sin dueño. Si hiciera falta auditar las reclamaciones, su sitio
  -- es una tabla de histórico aparte.
  user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_members_alias_trimmed CHECK (alias = btrim(alias) AND alias <> ''),
  CONSTRAINT group_members_role_valid CHECK (role IN ('admin', 'member')),
  -- Redundante como unicidad (id ya es PK), pero necesaria para que otras
  -- tablas puedan apuntar a (id, group_id) con una FK compuesta.
  CONSTRAINT group_members_id_group_unique UNIQUE (id, group_id)
);

COMMENT ON TABLE group_members IS
  'Alias del grupo y única definición de pertenencia. user_id NULL = alias sin '
  'reclamar, que participa en los repartos pero no da acceso a nadie.';

-- Un usuario, como mucho un alias por grupo.
--
-- OJO: este índice NO impide que alguien reclame un alias que ya tiene dueño.
-- Esa regla se garantiza haciendo la reclamación con un UPDATE condicional,
-- que es atómico y no necesita bloqueos:
--
--   UPDATE group_members SET user_id = $usuario
--    WHERE id = $miembro AND group_id = $grupo AND user_id IS NULL;
--
-- Si devuelve 0 filas, el alias ya estaba reclamado y se responde conflicto.
CREATE UNIQUE INDEX group_members_group_user_unique
  ON group_members (group_id, user_id) WHERE user_id IS NOT NULL;

-- Alias único dentro del grupo, sin distinguir mayúsculas, para que al
-- reclamar no haya dos "Antonio" entre los que elegir.
CREATE UNIQUE INDEX group_members_group_alias_unique
  ON group_members (group_id, lower(alias));

-- Para listar los grupos de un usuario y para el dashboard: todos sus alias,
-- en todos sus grupos.
CREATE INDEX group_members_user_id_idx
  ON group_members (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER group_members_set_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 4. Gastos individuales
-- =============================================================================

-- Gasto propio de un usuario, sin grupo y sin reparto.
CREATE TABLE personal_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id   uuid REFERENCES categories (id) ON DELETE SET NULL,
  description   varchar(255) NOT NULL,
  amount        numeric(14, 2) NOT NULL,
  expense_date  date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT personal_expenses_amount_positive CHECK (amount > 0)
);

CREATE INDEX personal_expenses_user_date_idx
  ON personal_expenses (user_id, expense_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX personal_expenses_category_idx
  ON personal_expenses (category_id) WHERE category_id IS NOT NULL;

CREATE TRIGGER personal_expenses_set_updated_at
  BEFORE UPDATE ON personal_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 5. Gastos de grupo y su reparto
-- =============================================================================

-- Un gasto pagado por un miembro y repartido entre varios. El importe total
-- vive aquí; el reparto, en group_expense_shares.
CREATE TABLE group_expenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  paid_by_member_id   uuid NOT NULL,
  category_id         uuid REFERENCES categories (id) ON DELETE SET NULL,
  -- Quién lo registró, que no tiene por qué ser quien lo pagó. Se queda en
  -- NULL si esa cuenta se borra: el gasto no se puede perder, afecta a saldos.
  created_by_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  description         varchar(255) NOT NULL,
  amount              numeric(14, 2) NOT NULL,
  expense_date        date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT group_expenses_amount_positive CHECK (amount > 0),
  -- FK compuesta: el pagador tiene que ser miembro de ESTE grupo, no de otro.
  --
  -- DEFERRABLE INITIALLY IMMEDIATE: en el día a día se comprueba al instante,
  -- así que un pagador de otro grupo, o borrar un miembro que tiene gastos,
  -- fallan en el acto y con un error claro.
  --
  -- Se deja diferible por un caso concreto: al borrar un grupo, la cascada
  -- vacía group_members y group_expenses en la misma sentencia y sin un orden
  -- garantizado, así que la comprobación inmediata lo haría fallar. Esa
  -- operación, y solo esa, difiere las comprobaciones a mano:
  --
  --   BEGIN;
  --   SET CONSTRAINTS ALL DEFERRED;
  --   DELETE FROM groups WHERE id = $1;
  --   COMMIT;
  CONSTRAINT group_expenses_payer_in_group
    FOREIGN KEY (paid_by_member_id, group_id)
    REFERENCES group_members (id, group_id)
    DEFERRABLE INITIALLY IMMEDIATE
);

COMMENT ON COLUMN group_expenses.amount IS
  'Total del gasto. Debe coincidir con la suma de sus group_expense_shares.';

CREATE INDEX group_expenses_group_date_idx
  ON group_expenses (group_id, expense_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX group_expenses_payer_idx ON group_expenses (paid_by_member_id);

CREATE INDEX group_expenses_category_idx
  ON group_expenses (category_id) WHERE category_id IS NOT NULL;

CREATE TRIGGER group_expenses_set_updated_at
  BEFORE UPDATE ON group_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cuánto le toca pagar a cada participante del gasto, siempre como cantidad
-- exacta: el reparto (partes iguales, porcentajes...) lo calcula el frontend.
-- La PK compuesta garantiza que un miembro aparece una sola vez por gasto.
CREATE TABLE group_expense_shares (
  group_expense_id  uuid NOT NULL REFERENCES group_expenses (id) ON DELETE CASCADE,
  -- Diferible por el mismo motivo que la FK del pagador.
  member_id         uuid NOT NULL REFERENCES group_members (id)
                      DEFERRABLE INITIALLY IMMEDIATE,
  amount            numeric(14, 2) NOT NULL,
  PRIMARY KEY (group_expense_id, member_id),
  CONSTRAINT group_expense_shares_amount_not_negative CHECK (amount >= 0)
);

COMMENT ON TABLE group_expense_shares IS
  'Reparto del gasto. La suma de amount debe ser igual a group_expenses.amount; '
  'se valida en el servicio, dentro de la misma transacción que el gasto.';

-- Para calcular el saldo de un miembro y para la comprobación de la FK
-- al borrar un miembro.
CREATE INDEX group_expense_shares_member_idx ON group_expense_shares (member_id);

-- =============================================================================
-- 6. Pagos entre miembros
-- =============================================================================

-- Dinero que un miembro entrega a otro para saldar lo que le debe. No es un
-- gasto: no se reparte, solo mueve el saldo entre dos miembros.
CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  from_member_id      uuid NOT NULL,
  to_member_id        uuid NOT NULL,
  amount              numeric(14, 2) NOT NULL,
  paid_on             date NOT NULL,
  note                varchar(255),
  created_by_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT payments_amount_positive CHECK (amount > 0),
  CONSTRAINT payments_distinct_members CHECK (from_member_id <> to_member_id),
  CONSTRAINT payments_from_member_in_group
    FOREIGN KEY (from_member_id, group_id)
    REFERENCES group_members (id, group_id)
    DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT payments_to_member_in_group
    FOREIGN KEY (to_member_id, group_id)
    REFERENCES group_members (id, group_id)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX payments_group_date_idx
  ON payments (group_id, paid_on DESC) WHERE deleted_at IS NULL;

CREATE INDEX payments_from_member_idx ON payments (from_member_id);
CREATE INDEX payments_to_member_idx ON payments (to_member_id);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 7. Semilla orientativa de categorías predefinidas
-- =============================================================================

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
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- Consultas de referencia
-- =============================================================================
--
-- Saldo de cada miembro de un grupo. Positivo = el grupo le debe a él;
-- negativo = él le debe al grupo. La suma de todos los saldos es siempre 0.
--
-- No se crea una vista a propósito: la consulta vive en el repositorio, igual
-- que el resto del SQL del proyecto.
--
--   SELECT
--     m.id    AS member_id,
--     m.alias,
--     m.user_id,
--       COALESCE((SELECT sum(e.amount)
--                   FROM group_expenses e
--                  WHERE e.paid_by_member_id = m.id
--                    AND e.deleted_at IS NULL), 0)
--     - COALESCE((SELECT sum(s.amount)
--                   FROM group_expense_shares s
--                   JOIN group_expenses e ON e.id = s.group_expense_id
--                  WHERE s.member_id = m.id
--                    AND e.deleted_at IS NULL), 0)
--     + COALESCE((SELECT sum(p.amount)
--                   FROM payments p
--                  WHERE p.from_member_id = m.id
--                    AND p.deleted_at IS NULL), 0)
--     - COALESCE((SELECT sum(p.amount)
--                   FROM payments p
--                  WHERE p.to_member_id = m.id
--                    AND p.deleted_at IS NULL), 0)
--       AS balance
--   FROM group_members m
--   WHERE m.group_id = $1
--   ORDER BY m.alias;
--
-- La simplificación de deudas se calcula en memoria a partir de estos saldos
-- y no se persiste.
-- =============================================================================
