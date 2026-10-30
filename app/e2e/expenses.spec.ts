import { expect, test } from "./fixtures";
import { createEqualExpense, createGroup } from "./api";

test("añadir un gasto con reparto igual y verlo en el detalle", async ({ page, user }) => {
  const group = await createGroup(user.api, "Piso Madrid", ["Luis"]);

  await page.goto(`/groups/${group.id}/expenses/new`);
  await page.getByLabel("Descripción").fill("Cena");
  await page.getByLabel("Importe (€)").fill("30");
  await page.getByRole("button", { name: "Añadir gasto" }).click();

  await expect(page).toHaveURL(new RegExp(`/groups/${group.id}/expenses/[0-9a-f-]+$`));
  await expect(page.getByRole("heading", { name: "Cena" })).toBeVisible();
  await expect(page.getByText("Lo pagó Ana Pérez.")).toBeVisible();
  await expect(page.getByText(/30,00/).first()).toBeVisible();
  await expect(page.getByText(/15,00/)).toHaveCount(2);
});

test("un reparto por importes que no suma el total no se envía", async ({ page, user }) => {
  const group = await createGroup(user.api, "Taxi", ["Luis"]);

  await page.goto(`/groups/${group.id}/expenses/new`);
  await page.getByLabel("Descripción").fill("Taxi al aeropuerto");
  await page.getByLabel("Importe (€)").fill("30");
  await page.getByText("Importes", { exact: true }).click();
  await page.getByLabel("Importe de Ana Pérez (€)").fill("20");
  await page.getByLabel("Importe de Luis (€)").fill("5");
  await page.getByRole("button", { name: "Añadir gasto" }).click();

  await expect(page.getByText(/El reparto suma/).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/groups/${group.id}/expenses/new$`));
});

test("eliminar un gasto lo quita de la lista", async ({ page, user }) => {
  const group = await createGroup(user.api, "Compra", ["Luis"]);
  const payer = group.members.find((member) => member.alias === "Ana Pérez");
  if (!payer) throw new Error("Falta el alias del creador");
  await createEqualExpense(user.api, group.id, {
    description: "Supermercado",
    amount: 12,
    payerId: payer.id,
    participantIds: group.members.map((member) => member.id),
  });

  await page.goto(`/groups/${group.id}/expenses`);
  await page.getByRole("link", { name: /Supermercado/ }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar gasto" }).click();

  await expect(page.getByText("Todavía no hay gastos con estos filtros.")).toBeVisible();
});
