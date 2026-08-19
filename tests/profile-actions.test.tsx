import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileScreen } from "../src/features/profile/profile-screen";
import { createEmptyAccount, type UpdateAccount } from "../src/lib/hydra-types";

function setup() {
  const account = createEmptyAccount({ id: "profile-user", email: "produtor@hydra.test" });
  account.profile.name = "Produtor Teste";
  account.property.name = "Fazenda Teste";
  const updateAccountMock = vi.fn<UpdateAccount>(async () => undefined);
  const updateAccount = updateAccountMock;
  const navigate = vi.fn();
  const logout = vi.fn(async () => undefined);
  const changeCredentials = vi.fn(async () => ({ ok: true, message: "Atualizado" }));

  render(<ProfileScreen
    account={account}
    links={[]}
    updateAccount={updateAccount}
    navigate={navigate}
    logout={logout}
    saveAvatar={async () => false}
    savePropertyCover={async () => false}
    changeCredentials={changeCredentials}
  />);

  return { account, updateAccount, updateAccountMock, logout, changeCredentials };
}

describe("ações de preferências e segurança", () => {
  it.each([
    ["Segurança", "E-mail e senha"],
    ["Notificações do aplicativo", "Notificações do aplicativo"],
    ["Apoie o Hydra Agro", "Apoie o Hydra Agro"],
    ["Termos de uso", "Termos de uso"],
    ["Política de privacidade", "Política de privacidade"],
    ["Sobre o Hydra Agro", "Sobre o Hydra Agro"],
  ])("abre %s no modal correto", (buttonName, dialogName) => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${buttonName}`) }));
    expect(screen.getByRole("dialog", { name: dialogName })).toBeInTheDocument();
  });

  it("salva as preferências de notificações no estado da conta", async () => {
    const { account, updateAccountMock } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Notificações do aplicativo/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Avisos do aplicativo" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));

    await waitFor(() => expect(updateAccountMock).toHaveBeenCalledTimes(1));
    const updater = updateAccountMock.mock.calls[0][0];
    expect(updater(account).settings.pushNotifications).toBe(false);
    expect(updateAccountMock.mock.calls[0][1]).toEqual({ requireRemote: true });
  });

  it("altera a senha usando a autenticação existente", async () => {
    const { changeCredentials } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Segurança/ }));
    fireEvent.change(screen.getByLabelText(/^Nova senha/), { target: { value: "senha-segura-123" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "senha-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar com segurança" }));

    await waitFor(() => expect(changeCredentials).toHaveBeenCalledWith({ password: "senha-segura-123" }));
  });

  it("mostra conteúdo completo nos termos", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Termos de uso" }));
    expect(screen.getByRole("heading", { name: "1. Finalidade da plataforma" })).toBeInTheDocument();
    expect(screen.getByText(/não substitui orientação veterinária/i)).toBeInTheDocument();
  });

  it("abre a confirmação e conclui a saída da conta", async () => {
    const { logout } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
    expect(screen.getByRole("dialog", { name: "Finalizar sessão" })).toBeInTheDocument();
    expect(screen.getByText("Deseja realmente finalizar sua sessão?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it("cancela a saída sem encerrar a sessão", () => {
    const { logout } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Sair desta conta" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(logout).not.toHaveBeenCalled();
  });
});
