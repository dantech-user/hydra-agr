import { BadgeCheck, Beef as Cow, ExternalLink, ShieldCheck, Weight } from "lucide-react";
import type { Animal } from "../../lib/hydra-types";

export type PublicAnimalSnapshot = {
  identification: string;
  name?: string;
  species: string;
  breed?: string;
  weight?: number;
  status?: string;
};

const PUBLIC_KEYS = ["pa", "i", "n", "s", "b", "w", "st"] as const;

export function buildPublicAnimalUrl(animal: Animal) {
  const url = new URL(window.location.origin);
  url.searchParams.set("pa", "1");
  url.searchParams.set("i", animal.identification.slice(0, 40));
  if (animal.name) url.searchParams.set("n", animal.name.slice(0, 32));
  url.searchParams.set("s", animal.species.slice(0, 24));
  if (animal.breed) url.searchParams.set("b", animal.breed.slice(0, 28));
  if (animal.weight && Number.isFinite(animal.weight)) url.searchParams.set("w", String(animal.weight));
  if (animal.status) url.searchParams.set("st", animal.status.slice(0, 20));
  return url.toString();
}

export function readPublicAnimalSnapshot(href = window.location.href): PublicAnimalSnapshot | null {
  try {
    const url = new URL(href);
    if (url.searchParams.get("pa") !== "1") return null;
    const identification = url.searchParams.get("i")?.trim() ?? "";
    const species = url.searchParams.get("s")?.trim() ?? "";
    if (!identification || !species) return null;
    const parsedWeight = Number(url.searchParams.get("w"));
    return {
      identification: identification.slice(0, 40),
      name: url.searchParams.get("n")?.trim().slice(0, 32) || undefined,
      species: species.slice(0, 24),
      breed: url.searchParams.get("b")?.trim().slice(0, 28) || undefined,
      weight: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
      status: url.searchParams.get("st")?.trim().slice(0, 20) || undefined,
    };
  } catch {
    return null;
  }
}

export function clearPublicAnimalParams() {
  const url = new URL(window.location.href);
  PUBLIC_KEYS.forEach((key) => url.searchParams.delete(key));
  return `${url.pathname}${url.search}${url.hash}` || "/";
}

export function PublicAnimalScreen({ animal, onOpenApp }: { animal: PublicAnimalSnapshot; onOpenApp: () => void }) {
  return (
    <main className="public-animal-page">
      <section className="public-animal-shell">
        <header className="public-animal-brand">
          <span className="public-animal-logo"><Cow size={27} /></span>
          <div><strong>Hydra Agro</strong><small>Identificação animal</small></div>
          <span className="public-animal-safe"><ShieldCheck size={16} /> público</span>
        </header>

        <div className="public-animal-hero">
          <span className="public-animal-icon"><Cow size={42} /></span>
          <span className="public-animal-kicker"><BadgeCheck size={15} /> FICHA COMPARTILHADA</span>
          <h1>{animal.name || "Animal identificado"}</h1>
          <p>{animal.identification}</p>
        </div>

        <div className="public-animal-data">
          <div><span>Espécie</span><strong>{animal.species}</strong></div>
          <div><span>Raça</span><strong>{animal.breed || "Não informada"}</strong></div>
          <div><span>Peso atual</span><strong>{animal.weight ? `${animal.weight} kg` : "Não informado"}</strong></div>
          <div><span>Situação</span><strong>{animal.status || "Cadastrado"}</strong></div>
        </div>

        {animal.weight && <div className="public-animal-highlight"><Weight size={20} /><div><span>Último peso compartilhado</span><strong>{animal.weight} kg</strong></div></div>}

        <div className="public-animal-privacy">
          <ShieldCheck size={20} />
          <p><strong>Ficha pública limitada</strong><small>Este link mostra somente dados básicos escolhidos para identificação. Dados da conta, propriedade, equipe e observações privadas não são compartilhados.</small></p>
        </div>

        <button className="public-animal-open" onClick={onOpenApp}><ExternalLink size={18} /> Abrir Hydra Agro</button>
        <p className="public-animal-footer">Tecnologia que nasce do campo</p>
      </section>
    </main>
  );
}
