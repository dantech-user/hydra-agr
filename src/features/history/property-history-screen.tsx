import { Beef as Cow, CalendarDays, ClipboardCheck, Droplets, RadioTower, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import { ScreenHeader } from "../../components/ui";
import type { AppRoute, HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  onBack: () => void;
  navigate: (route: AppRoute) => void;
};

type HistoryKind = "herd" | "water" | "activities" | "monitor";

type HistoryItem = {
  id: string;
  date: Date;
  kind: HistoryKind;
  title: string;
  detail: string;
  route: AppRoute;
};

const filters: Array<{ id: "all" | HistoryKind; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "herd", label: "Rebanho" },
  { id: "water", label: "Água" },
  { id: "activities", label: "Atividades" },
  { id: "monitor", label: "Monitoramento" },
];

function parseDate(value?: string) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: target.getFullYear() === today.getFullYear() ? undefined : "numeric" }).format(target);
}

function HistoryIcon({ kind }: { kind: HistoryKind }) {
  if (kind === "water") return <Droplets size={17} />;
  if (kind === "activities") return <ClipboardCheck size={17} />;
  if (kind === "monitor") return <RadioTower size={17} />;
  return <Cow size={17} />;
}

export function PropertyHistoryScreen({ account, onBack, navigate }: Props) {
  const [filter, setFilter] = useState<"all" | HistoryKind>("all");

  const items = useMemo(() => {
    const result: HistoryItem[] = [];

    account.waterRecords.forEach((record) => {
      const date = parseDate(record.date);
      if (!date) return;
      const source = account.waterSources.find((item) => item.id === record.sourceId);
      result.push({
        id: `water-${record.id}`,
        date,
        kind: "water",
        title: "Registro de água",
        detail: `${record.amount.toLocaleString("pt-BR")} L${source?.name ? ` · ${source.name}` : record.purpose ? ` · ${record.purpose}` : ""}`,
        route: "water",
      });
    });

    account.activities.forEach((activity) => {
      const date = parseDate(activity.date);
      if (!date) return;
      result.push({
        id: `activity-${activity.id}`,
        date,
        kind: "activities",
        title: activity.done ? "Atividade concluída" : "Atividade programada",
        detail: `${activity.title}${activity.category ? ` · ${activity.category}` : ""}`,
        route: "activities",
      });
    });

    account.monitoring.forEach((record) => {
      const date = parseDate(record.date);
      if (!date) return;
      const sector = account.sectors.find((item) => item.id === record.sectorId);
      result.push({
        id: `monitor-${record.id}`,
        date,
        kind: "monitor",
        title: record.occurrence?.trim() ? "Ocorrência registrada" : "Monitoramento registrado",
        detail: `${sector?.name || "Setor não informado"} · ${record.type}`,
        route: "monitor",
      });
    });

    account.animals.forEach((animal) => {
      (animal.history ?? []).forEach((entry) => {
        const date = parseDate(entry.date);
        if (!date) return;
        result.push({
          id: `animal-${animal.id}-${entry.id}`,
          date,
          kind: "herd",
          title: entry.type || "Registro do animal",
          detail: `${animal.name || animal.identification} · ${entry.description}`,
          route: "herd",
        });
      });
    });

    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [account]);

  const visibleItems = filter === "all" ? items : items.filter((item) => item.kind === filter);
  const groups = visibleItems.reduce<Array<{ key: string; label: string; items: HistoryItem[] }>>((result, item) => {
    const key = dayKey(item.date);
    const current = result[result.length - 1];
    if (current?.key === key) current.items.push(item);
    else result.push({ key, label: dayLabel(item.date), items: [item] });
    return result;
  }, []);

  return (
    <div className="screen page-enter property-history-screen">
      <ScreenHeader eyebrow="REGISTROS" title="Histórico da propriedade" subtitle="Água, atividades, rebanho e monitoramentos em ordem de data." onBack={onBack} />

      <div className="property-history-summary">
        <span><CalendarDays size={18} /></span>
        <div><strong>{items.length} registros encontrados</strong><small>O histórico é montado a partir dos dados já cadastrados no app.</small></div>
        <em><ScanLine size={14} /> {account.nfcReadCount} NFC</em>
      </div>

      <div className="property-history-filters" role="tablist" aria-label="Filtrar histórico">
        {filters.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </div>

      {groups.length === 0 ? (
        <div className="property-history-empty">Nenhum registro encontrado nesse filtro.</div>
      ) : (
        <div className="property-history-groups">
          {groups.map((group) => (
            <section key={group.key} className="property-history-group">
              <h2>{group.label}</h2>
              <div className="property-history-list">
                {group.items.map((item) => (
                  <button key={item.id} onClick={() => navigate(item.route)}>
                    <span className={`property-history-icon ${item.kind}`}><HistoryIcon kind={item.kind} /></span>
                    <span className="property-history-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <time>{item.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) === "12:00" ? "" : item.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
