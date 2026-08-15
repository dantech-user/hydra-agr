/**
 * Cobertura inicial do Hydra Agro. A lista inclui Brejões e todos os
 * municípios que compartilham limite com ele na malha municipal do IBGE.
 */
export const supportedMunicipalities = [
  "Amargosa",
  "Brejões",
  "Milagres",
  "Nova Itarana",
  "Santa Inês",
  "Ubaíra",
] as const;

export type SupportedMunicipality = (typeof supportedMunicipalities)[number];

export function isSupportedMunicipality(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  return supportedMunicipalities.some(
    (municipality) => municipality.toLocaleLowerCase("pt-BR") === normalized,
  );
}
