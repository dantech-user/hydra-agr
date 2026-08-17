import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationsScreen } from "../src/features/notifications/notifications-screen";
import { createEmptyAccount, type UpdateAccount } from "../src/lib/hydra-types";

function setup() {
  const account = createEmptyAccount({
    id: "notice-user",
    email: "notice@hydra.test",
  });

  account.notifications = ["Manutenção programada"];

  const updateAccount = vi.fn<UpdateAccount>(async () => undefined);

  render(
    <NotificationsScreen
      account={account}
      updateAccount={updateAccount}
      onBack={() => undefined}
    />,
  );

  return { account, updateAccount };
}

describe("central de notificações", () => {
  it("altera preferência de notificações do aplicativo", async () => {
    const { account, updateAccount } = setup();

    fireEvent.click(
      screen.getByRole("switch", { name: "Notificações do aplicativo" }),
    );

    await waitFor(() => expect(updateAccount).toHaveBeenCalledTimes(1));

    const updater = updateAccount.mock.calls[0][0];
    const next = updater(account);

    expect(next.settings.pushNotifications).toBe(false);
  });

  it("altera preferência de alertas de água", async () => {
    const { account, updateAccount } = setup();

    fireEvent.click(
      screen.getByRole("switch", { name: "Alertas de água" }),
    );

    await waitFor(() => expect(updateAccount).toHaveBeenCalledTimes(1));

    const updater = updateAccount.mock.calls[0][0];
    const next = updater(account);

    expect(next.settings.waterAlerts).toBe(false);
  });

  it("mostra notificações existentes", () => {
    setup();

    expect(screen.getByText("Manutenção programada")).toBeInTheDocument();
  });
});