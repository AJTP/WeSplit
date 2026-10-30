import { expect, test } from "./fixtures";
import { createGroup } from "./api";

test("añadir, renombrar y eliminar miembros", async ({ page, user }) => {
  const group = await createGroup(user.api, "Casa", ["Marta"]);

  await page.goto(`/groups/${group.id}/members`);

  // Añadir
  await page.getByLabel("Alias", { exact: true }).fill("Pablo");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(page.getByText("Pablo", { exact: true })).toBeVisible();

  // Renombrar
  await page.getByRole("button", { name: "Renombrar Marta" }).click();
  await page.getByLabel("Nuevo alias").fill("Marta G.");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Marta G.", { exact: true })).toBeVisible();

  // Eliminar (admin)
  await page.getByRole("button", { name: "Eliminar Pablo" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Pablo", { exact: true })).toHaveCount(0);
});

test("reclamar un alias libre cambia tu alias en el grupo", async ({ page, user }) => {
  const group = await createGroup(user.api, "Equipo", ["Marta G."]);

  await page.goto(`/groups/${group.id}/members`);
  await page.getByRole("button", { name: "Usar el alias Marta G." }).click();

  await expect(page.getByText("Tú", { exact: true })).toBeVisible();
  await expect(page.getByText("Libre", { exact: true })).toBeVisible();
});
