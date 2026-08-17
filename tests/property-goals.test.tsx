import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlusScreen } from "../src/features/premium/plus-screen";
import { createEmptyAccount, type UpdateAccount } from "../src/lib/hydra-types";

function plusAccount() {
  const account = createEmptyAccount({ id: "plus-user", email: "plus@hydra.test" });
  account.profile.plan = "Hydra Agro+";
  account.property.name = "Fazenda Teste";
  account.property.municipality = "Brejões";
  account.settings.premiumGoals = { monthlyWater: 5000, monthlyActivities: 3, identifiedAnimals: 2 };
  account.waterRecords = [{ id: "water-1", date: new Date().toISOString().slice(0, 10), amount: 1000, sourceId: "source-1", purpose: "Animais" }];
  account.activities = [
    { id: "activity-1", title: "Manejo", category: "Manejo", date: new Date().toISOString().slice(0, 10), done: true },
    { id: "activity-2", title: "Inspeção", category: "Inspeção", date: new Date().toISOString().slice(0, 10), done: false },
  ];
  account.animals = [{ id: "animal-1", identification: "BOV-1", species: "Bovino", status: "Ativo", electronicId: "TAG-1" }];
  account.nfcReadCount = 4;
  return account;
}

describe("metas, conquistas e relatório", () => {
  it("usa atividades concluídas e inclui NFC/RFID no relatório", () => {
    const account = plusAccount();
    render(<PlusScreen account={account} updateAccount={async () => undefined} onBack={() => undefined} />);
    expect(screen.getByText("Atividades concluídas no mês")).toBeInTheDocument();
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    expect(screen.getByText("NFC/RFID vinculadas")).toBeInTheDocument();
    expect(screen.getByText("Leituras NFC reais")).toBeInTheDocument();
    expect(screen.getByText("Identificação em campo").closest("article")).toHaveClass("unlocked");
  });

  it("valida metas inteiras antes de salvar", async () => {
    const account = plusAccount();
    const updateAccount = vi.fn<UpdateAccount>(async () => undefined);
    render(<PlusScreen account={account} updateAccount={updateAccount} onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar metas" }));
    fireEvent.change(screen.getByLabelText("Atividades concluídas no mês"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar metas" }));
    expect(await screen.findByText("A meta de atividades precisa ser um número inteiro.")).toBeInTheDocument();
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it("redefine metas sem apagar registros", async () => {
    const account = plusAccount();
    const updateAccount = vi.fn<UpdateAccount>(async () => undefined);
    render(<PlusScreen account={account} updateAccount={updateAccount} onBack={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar metas" }));
    fireEvent.click(screen.getByRole("button", { name: "Redefinir todas as metas" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar redefinição" }));
    await waitFor(() => expect(updateAccount).toHaveBeenCalledTimes(1));
    const updater = updateAccount.mock.calls[0][0];
    const next = updater(account);
    expect(next.settings.premiumGoals).toEqual({});
    expect(next.waterRecords).toHaveLength(1);
    expect(next.animals).toHaveLength(1);
  });
});
