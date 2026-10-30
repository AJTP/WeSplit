import { expect, test } from "./fixtures";
import { createEqualExpense, createGroup } from "./api";

test("el pago sugerido salda la deuda", async ({ page, user }) => {
  const group = await createGroup(user.api, "Cena", ["Luis"]);
  const payer = group.members.find((member) => member.alias === "Ana Pérez");
  if (!payer) throw new Error("Falta el alias del creador");
  await createEqualExpense(user.api, group.id, {
    description: "Cena del viernes",
    amount: 30,
    payerId: payer.id,
    participantIds: group.members.map((member) => member.id),
  });

  await page.goto(`/groups/${group.id}/balances`);
  await expect(page.getByText(/Luis debe/)).toBeVisible();
  await page.getByRole("button", { name: "Registrar pago" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Importe (€)")).toHaveValue("15");
  await dialog.getByRole("button", { name: "Registrar pago" }).click();

  await expect(page.getByText("No hay deudas pendientes en el grupo.")).toBeVisible();
});
