import { expect, signIn, test } from "./fixtures";

test("un invitado elige un alias libre y entra al grupo", async ({ browser, user, stranger }) => {
  // El creador tiene el grupo con dos alias libres.
  const group = await user.api.post<{ id: string; name: string }>("/groups", {
    name: "Pádel los martes",
    aliases: ["Marta", "Javi"],
  });
  const invitation = await user.api.get<{ token: string }>(`/groups/${group.id}/invitation`);

  // El invitado usa su propio navegador, sin sesión hasta que entra.
  const guestContext = await browser.newContext();
  await signIn(guestContext, stranger.browserRefreshToken);
  const guest = await guestContext.newPage();

  await guest.goto(`/invite/${invitation.token}`);
  await expect(guest.getByText("Te han invitado a")).toBeVisible();
  await guest.getByRole("radio", { name: "Marta" }).check();
  await guest.getByRole("button", { name: "Unirme con este alias" }).click();

  await expect(guest).toHaveURL(new RegExp(`/groups/${group.id}$`));
  await expect(guest.getByText("3 miembros · Tu alias: Marta")).toBeVisible();
  await guestContext.close();
});

test("un enlace de invitación inexistente muestra un aviso", async ({ page, user: _user }) => {
  await page.goto("/invite/token-que-no-existe");

  await expect(page.getByText("Este enlace de invitación no existe")).toBeVisible();
});
