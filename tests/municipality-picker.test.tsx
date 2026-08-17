import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MunicipalityPicker } from "../src/components/municipality-picker";

function Harness({ initialValue = "" }: { initialValue?: string }) {
  const [municipality, setMunicipality] = useState(initialValue);
  return <MunicipalityPicker value={municipality} onChange={setMunicipality} />;
}

describe("seletor regional de municípios", () => {
  it("seleciona Brejões sem usar o seletor nativo do navegador", () => {
    const { container } = render(<Harness />);

    expect(container.querySelector("select")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: /escolher município/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /pesquisar cidade/i }), { target: { value: "bre" } });
    fireEvent.click(screen.getByRole("option", { name: /brejões/i }));

    expect(screen.getByRole("combobox", { name: /escolher município/i })).toHaveTextContent("Brejões");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("pesquisa sem exigir acentos", () => {
    render(<Harness initialValue="Brejões" />);

    fireEvent.click(screen.getByRole("combobox", { name: /escolher município/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /pesquisar cidade/i }), { target: { value: "ubaira" } });

    expect(screen.getByRole("option", { name: /ubaíra/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /brejões/i })).not.toBeInTheDocument();
  });
});
