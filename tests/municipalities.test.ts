import { describe, expect, it } from "vitest";
import { isSupportedMunicipality, supportedMunicipalities } from "../src/lib/municipalities";

describe("cobertura regional", () => {
  it("inclui Brejões e todos os seus municípios limítrofes", () => {
    expect([...supportedMunicipalities]).toEqual([
      "Amargosa",
      "Brejões",
      "Milagres",
      "Nova Itarana",
      "Santa Inês",
      "Ubaíra",
    ]);
  });

  it("faz validação sem depender de caixa ou espaços", () => {
    expect(isSupportedMunicipality("  brejões ")).toBe(true);
    expect(isSupportedMunicipality("SANTA INÊS")).toBe(true);
    expect(isSupportedMunicipality("Salvador")).toBe(false);
  });
});
