import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Modal } from "../src/components/ui";
import { useModalNavigation } from "../src/components/modal-system";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("componente global de modal", () => {
  it("fecha pelo X sem cancelar a própria animação de saída", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return <Modal open={open} title="Termos de uso" onClose={() => setOpen(false)}>Conteúdo dos termos</Modal>;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Termos de uso" })).not.toBeInTheDocument(), { timeout: 1000 });
    expect(document.body.style.overflow).toBe("");
  });

  it("mantém o scroll bloqueado enquanto existir um modal empilhado", () => {
    const view = render(<>
      <Modal open title="Detalhes" onClose={() => undefined}>Conteúdo</Modal>
      <Modal open title="Confirmação" onClose={() => undefined}>Confirmar</Modal>
    </>);

    expect(document.body.style.overflow).toBe("hidden");
    view.rerender(<>
      <Modal open title="Detalhes" onClose={() => undefined}>Conteúdo</Modal>
      <Modal open={false} title="Confirmação" onClose={() => undefined}>Confirmar</Modal>
    </>);
    expect(document.body.style.overflow).toBe("hidden");

    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("mantém a navegação oculta até o último modal empilhado sair", () => {
    function NavigationState() {
      return <output>{useModalNavigation() ? "oculta" : "visível"}</output>;
    }
    function Stack({ first, second }: { first: boolean; second: boolean }) {
      return <><NavigationState />{first && <Modal open title="Detalhes" onClose={() => undefined}>Um</Modal>}{second && <Modal open title="Confirmação" onClose={() => undefined}>Dois</Modal>}</>;
    }

    const view = render(<Stack first second />);
    expect(screen.getByText("oculta")).toBeInTheDocument();
    view.rerender(<Stack first second={false} />);
    expect(screen.getByText("oculta")).toBeInTheDocument();
    view.rerender(<Stack first={false} second={false} />);
    expect(screen.getByText("visível")).toBeInTheDocument();
  });
});
