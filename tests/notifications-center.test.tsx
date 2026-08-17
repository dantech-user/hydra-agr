import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationsScreen } from "../src/features/notifications/notifications-screen";
import { createEmptyAccount, type AppNotification, type UpdateAccount } from "../src/lib/hydra-types";

function setup() {
  const account = createEmptyAccount({ id: "notice-user", email: "notice@hydra.test" });
  const notification: AppNotification = {
    id: "notice-1",
    title: "Manutenção programada",
    body: "O painel receberá uma atualização durante a madrugada.",
    kind: "admin",
    source: "announcement",
    createdAt: "2026-08-16T12:00:00.000Z",
    read: false,
    level: "attention",
  };
  account.notifications = [notification];
  const updateAccount = vi.fn<UpdateAccount>(async () => undefined);
  const setNotificationRead = vi.fn(async () => ({ ok: true, message: "Aviso marcado como lido." }));
  const markAllNotificationsRead = vi.fn(async () => ({ ok: true, message: "Todos lidos." }));
  const refreshNotifications = vi.fn(async () => ({ ok: true, message: "Atualizado." }));
  render(<NotificationsScreen
    account={account}
    updateAccount={updateAccount}
    onBack={() => undefined}
    setNotificationRead={setNotificationRead}
    markAllNotificationsRead={markAllNotificationsRead}
    refreshNotifications={refreshNotifications}
  />);
  return { account, notification, updateAccount, setNotificationRead, markAllNotificationsRead };
}

describe("central de notificações", () => {
  it("salva as quatro preferências no estado persistente", async () => {
    const { account, updateAccount } = setup();
    fireEvent.click(screen.getByRole("switch", { name: "Notificações gerais" }));
    fireEvent.click(screen.getByRole("switch", { name: "Alertas da propriedade" }));
    fireEvent.click(screen.getByRole("switch", { name: "Avisos administrativos" }));
    fireEvent.click(screen.getByRole("switch", { name: "Alertas de consumo de água" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));

    await waitFor(() => expect(updateAccount).toHaveBeenCalledTimes(1));
    const [updater, options] = updateAccount.mock.calls[0];
    const next = updater(account);
    expect(next.settings).toMatchObject({
      pushNotifications: false,
      propertyAlerts: false,
      adminNotices: false,
      waterAlerts: false,
    });
    expect(options).toEqual({ requireRemote: true });
  });

  it("abre o aviso e persiste o estado lido", async () => {
    const { notification, setNotificationRead } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Manutenção programada/ }));
    expect(screen.getByRole("dialog", { name: "Manutenção programada" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como lido" }));
    await waitFor(() => expect(setNotificationRead).toHaveBeenCalledWith(notification, true));
  });

  it("marca todos os avisos como lidos", async () => {
    const { markAllNotificationsRead } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Marcar todos/ }));
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
  });
});
