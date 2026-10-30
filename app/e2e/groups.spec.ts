import { expect, test } from "./fixtures";

test("crear un grupo con alias iniciales", async ({ page, user: _user }) => {
  await page.goto("/groups/new");

  await page.getByLabel("Nombre del grupo").fill("Viaje a Lisboa");
  await page.getByLabel(/Otros alias/).fill("Marta\nJavi");
  await page.getByRole("button", { name: "Crear grupo" }).click();

  await expect(page.getByRole("heading", { name: "Viaje a Lisboa" })).toBeVisible();
  await expect(page.getByText("3 miembros · Tu alias: Ana Pérez")).toBeVisible();
});

test("el resumen del grupo está en la lista de grupos", async ({ page, user }) => {
  const group = await user.api.post<{ id: string }>("/groups", { name: "Piso compartido" });

  await page.goto("/groups");

  await expect(page.getByRole("link", { name: /Piso compartido/ })).toHaveAttribute(
    "href",
    `/groups/${group.id}`,
  );
});

test("los ajustes muestran el enlace de invitación y permiten renombrar", async ({
  page,
  user,
}) => {
  const group = await user.api.post<{ id: string }>("/groups", { name: "Cena de Navidad" });

  await page.goto(`/groups/${group.id}/settings`);
  await expect(page.locator("code").filter({ hasText: "/invite/" })).toBeVisible();

  await page.getByLabel("Nombre", { exact: true }).fill("Cena de Nochevieja");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.goto(`/groups/${group.id}`);
  await expect(page.getByRole("heading", { name: "Cena de Nochevieja" })).toBeVisible();
});
