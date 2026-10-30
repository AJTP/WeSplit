import { expect, test } from "./fixtures";
import { createUser } from "./db";

test("sin sesión, una ruta protegida lleva a /login conservando returnTo", async ({ page }) => {
  await page.goto("/groups");

  await expect(page).toHaveURL(/\/login\?returnTo=%2Fgroups$/);
  await expect(page.getByRole("heading", { name: "Entra con Google" })).toBeVisible();
});

test("con sesión, la página de inicio saluda al usuario", async ({ page, user: _user }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tus grupos" })).toBeVisible();
});

test("la ruta de desarrollo guarda la sesión y entra sin Google", async ({ page }) => {
  const seeded = await createUser("Dev Tester");

  await page.goto(`/dev/login#rt=${seeded.browserRefreshToken}`);

  await expect(page.getByRole("heading", { name: "Hola, Dev" })).toBeVisible();
});

test("cerrar sesión en este dispositivo vuelve a /login y no se restaura", async ({
  page,
  user: _user,
}) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Cerrar sesión en este dispositivo" }).click();

  await expect(page).toHaveURL(/\/login/);

  // Recargar no debe devolver la sesión: el refresh token ya está revocado.
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
});

test("la sesión sobrevive a recargar la página", async ({ page, user: _user }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
});
