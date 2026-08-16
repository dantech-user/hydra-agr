import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Modal } from "../src/components/ui";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("componente global de modal", () => {
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
});
