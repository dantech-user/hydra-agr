import { useMemo, useState } from "react";
import { Beef, Droplets, HeartPulse, Leaf, Sprout } from "lucide-react";
import type { HydraAccount } from "../../lib/hydra-types";
import "./herd-care-guide.css";

type Guide = { food: string[]; environment: string[]; welfare: string[]; sustainable: string[] };

const guides: Record<string, Guide> = {
  Bovino: {
    food: ["Manter água limpa sempre disponível.", "Basear a alimentação em pastagem ou forragem de boa qualidade e suplementar apenas quando houver orientação adequada.", "Evitar mudanças bruscas de dieta e alimento mofado, fermentado ou deteriorado."],
    environment: ["Garantir sombra, área seca para descanso e espaço compatível com o lote.", "Manter cochos e bebedouros limpos, acessíveis e sem partes cortantes.", "Evitar lama permanente e superlotação."],
    welfare: ["Observar diariamente apetite, locomoção e comportamento.", "Registrar alterações na ficha do animal.", "Animais com sinais preocupantes devem receber avaliação profissional."],
    sustainable: ["Corrigir vazamentos nos bebedouros rapidamente.", "Evitar transbordamentos.", "Armazenar ração protegida da umidade e de pragas para reduzir perdas."],
  },
  Ave: {
    food: ["Fornecer alimento adequado à fase de criação e água fresca.", "Manter comedouros protegidos de chuva e contaminação.", "Não usar alimento com cheiro, cor ou aspecto alterado."],
    environment: ["Priorizar ventilação, cama seca e proteção contra chuva e calor excessivo.", "Evitar excesso de aves no mesmo espaço.", "Higienizar comedouros e bebedouros com frequência."],
    welfare: ["Observar consumo, atividade e condição das penas.", "Reduzir estresse térmico com sombra e ventilação.", "Quando necessário, buscar avaliação profissional."],
    sustainable: ["Regular altura e vazão dos bebedouros para diminuir desperdício.", "Manter a ração em recipientes fechados.", "Planejar a limpeza para usar apenas a água necessária."],
  },
  "Suíno": {
    food: ["Usar alimentação apropriada para idade e fase produtiva.", "Garantir água limpa e de fácil acesso.", "Evitar restos deteriorados, mofados ou contaminados."],
    environment: ["Manter piso seguro, área limpa, ventilação e proteção contra calor excessivo.", "Separar áreas de descanso das áreas mais úmidas quando possível.", "Evitar superlotação."],
    welfare: ["Observar apetite, pele, postura e comportamento do grupo.", "Registrar mudanças importantes sem tentar diagnosticar pelo aplicativo.", "Encaminhar sinais preocupantes para avaliação profissional."],
    sustainable: ["Verificar vazamentos em bebedouros.", "Evitar excesso de ração nos comedouros.", "Organizar manejo e limpeza para reduzir desperdício de água."],
  },
  Ovino: {
    food: ["Priorizar forragem de qualidade e água limpa.", "Suplementação deve considerar a fase e a condição do animal.", "Evitar mudança repentina na alimentação."],
    environment: ["Disponibilizar abrigo seco, sombra e boa drenagem.", "Manter cercas seguras e áreas sem materiais que possam causar ferimentos.", "Controlar excesso de umidade nos locais de descanso."],
    welfare: ["Observar apetite, marcha, pelagem e comportamento.", "Registrar ocorrências no histórico.", "Solicitar avaliação profissional quando necessário."],
    sustainable: ["Proteger alimento da chuva.", "Monitorar vazamentos.", "Usar cochos que diminuam perdas de alimento."],
  },
  Caprino: {
    food: ["Oferecer forragem adequada e água limpa.", "Evitar alimento estragado ou mudanças bruscas.", "Suplementos e minerais devem seguir orientação apropriada."],
    environment: ["Preferir local seco, ventilado, protegido de chuva e com sombra.", "Manter cercas bem conservadas.", "Evitar acúmulo de lama perto de água e comida."],
    welfare: ["Observar comportamento, apetite e locomoção.", "Registrar alterações rapidamente.", "Animais com sinais preocupantes devem receber avaliação profissional."],
    sustainable: ["Reduzir perdas de forragem nos cochos.", "Armazenar alimento em local seco.", "Conferir bebedouros diariamente."],
  },
  Equino: {
    food: ["Água limpa deve permanecer disponível.", "Forragem é parte central da alimentação; concentrados exigem manejo cuidadoso.", "Mudanças de dieta devem ser graduais."],
    environment: ["Garantir sombra, abrigo, piso seguro e espaço para movimentação.", "Remover objetos cortantes e manter cercas adequadas.", "Cochos e bebedouros precisam permanecer limpos."],
    welfare: ["Observar apetite, postura, marcha e comportamento.", "Registrar qualquer mudança importante.", "Procure profissional quando houver sinais de doença ou lesão."],
    sustainable: ["Corrigir bebedouros com vazamento.", "Evitar desperdício de feno e ração.", "Planejar limpeza com uso racional de água."],
  },
};

export function HerdCareGuide({ account }: { account: HydraAccount }) {
  const availableSpecies = useMemo(() => {
    const fromHerd = Array.from(new Set(account.animals.map((animal) => animal.species))).filter((name) => guides[name]);
    return fromHerd.length ? fromHerd : Object.keys(guides);
  }, [account.animals]);
  const [species, setSpecies] = useState(availableSpecies[0] || "Bovino");
  const guide = guides[species] || guides.Bovino;

  return <div className="herd-care-guide">
    <div className="herd-care-intro"><span><Sprout size={21} /></span><div><strong>Alimentação e manejo</strong><small>Dicas gerais de criação organizadas por espécie.</small></div></div>
    <div className="herd-care-species">{availableSpecies.map((name) => <button key={name} className={species === name ? "active" : ""} onClick={() => setSpecies(name)}>{name}</button>)}</div>
    <div className="herd-care-grid">
      <CareCard icon={<Beef size={20} />} title="Alimentação" items={guide.food} />
      <CareCard icon={<Sprout size={20} />} title="Ambiente de criação" items={guide.environment} />
      <CareCard icon={<HeartPulse size={20} />} title="Bem-estar" items={guide.welfare} />
      <CareCard icon={<Droplets size={20} />} title="Uso sustentável" items={guide.sustainable} />
    </div>
    <div className="herd-care-warning"><Leaf size={18} /><p>As orientações são gerais. Alimentação específica, suplementação, tratamento e decisões de saúde devem considerar espécie, idade, peso e finalidade da criação, com orientação de médico-veterinário ou profissional qualificado quando necessário.</p></div>
  </div>;
}

function CareCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return <article className="herd-care-card"><span>{icon}</span><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
