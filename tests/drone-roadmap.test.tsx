import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MonitorScreen } from "../src/features/monitor/monitor-screen";
import { createEmptyAccount, type UpdateAccount } from "../src/lib/hydra-types";

describe("Drone Pastor", () => {
  it("informa a próxima atualização sem simular conexão ou voo", () => {
    const account = createEmptyAccount({ id: "drone-user", email: "drone@hydra.test" });
    render(<MonitorScreen account={account} updateAccount={vi.fn<UpdateAccount>(async () => undefined)} saveMonitoringPhoto={async () => false} />);

    expect(screen.getByText("Integração do Drone Pastor")).toBeInTheDocument();
    expect(screen.getByText(/prevista para a próxima versão/i)).toBeInTheDocument();
    expect(screen.getByText("Nenhum dispositivo conectado.")).toBeInTheDocument();
  });
});
