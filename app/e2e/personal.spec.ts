import { expect, test } from "./fixtures";

test("crear un gasto personal y filtrarlo por categoría", async ({ page, user }) => {
  const categories = await user.api.get<{ data: { id: string; name: string }[] }>(
    "/categories?limit=100",
  );
  const food = categories.data.find((category) => category.name === "Comida");
  if (!food) throw new Error("Falta la categoría predefinida Comida");

  await user.api.post("/expenses", {
    description: "Taxi",
    amount: 9,
    expense_date: new Date().toISOString().slice(0, 10),
  });

  await page.goto("/expenses/new");
  await page.getByLabel("Descripción").fill("Café");
  await page.getByLabel("Importe (€)").fill("2,50");
  await page.getByLabel("Categoría (opcional)").selectOption({ label: "Comida" });
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByText("Café")).toBeVisible();
  await expect(page.getByText("Taxi")).toBeVisible();

  await page.getByLabel("Categoría", { exact: true }).selectOption({ label: "Comida" });
  await expect(page.getByText("Café")).toBeVisible();
  await expect(page.getByText("Taxi")).toHaveCount(0);
});
