import { Beef as Cow, CheckCircle2, CloudOff, Droplets, FileDown, History, LayoutDashboard, RefreshCw, RadioTower, ScanLine, TriangleAlert, Wifi } from "lucide-react";
import { useMemo } from "react";
import { ScreenHeader } from "../../components/ui";
import type { SyncStatus } from "../../hooks/use-hydra-store";
import type { AppRoute, HydraAccount } from "../../lib/hydra-types";
import { downloadPropertyReportPdf } from "../../services/property-report";

type Props = { account: HydraAccount; syncStatus: SyncStatus; lastError?: string; onBack: () => void; navigate: (route: AppRoute) => void; retrySync: () => Promise<void> };

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function TodayScreen({ account, syncStatus, lastError, onBack, navigate, retrySync }: Props) {
  const summary = useMemo(() => {
    const now = new Date();
    const today = dayKey(now);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const pending = account.activities.filter((activity) => !activity.done);
    const overdue = pending.filter((activity) => { const timestamp = new Date(activity.date).getTime(); return Number.isFinite(timestamp) && timestamp < startToday; });
    const todayActivities = pending.filter((activity) => dayKey(activity.date) === today);
    const withoutNfc = account.animals.filter((animal) => !animal.electronicId);
    const withoutWeight = account.animals.filter((animal) => !animal.weight);
    const waterAttention = account.waterSources.filter((source) => source.status !== "ativa");
    const occurrences = account.monitoring.filter((record) => Boolean(record.occurrence?.trim()));
    const todayRecords = account.waterRecords.filter((record) => dayKey(record.date) === today).length + account.activities.filter((activity) => dayKey(activity.date) === today).length + account.monitoring.filter((record) => dayKey(record.date) === today).length + account.animals.reduce((sum, animal) => sum + (animal.history ?? []).filter((entry) => dayKey(entry.date) === today).length, 0);
    const identified = account.animals.length - withoutNfc.length;
    const nfcCoverage = account.animals.length ? Math.round((identified / account.animals.length) * 100) : 0;
    const priorities: Array<{ title: string; detail: string; route: AppRoute; tone: "attention" | "info" }> = [];
    if (overdue.length) priorities.push({ title: `${overdue.length} atividade(s) atrasada(s)`, detail: "Revise as atividades que passaram da data.", route: "activities", tone: "attention" });
    if (waterAttention.length) priorities.push({ title: `${waterAttention.length} fonte(s) de água em atenção`, detail: "Confira o status das fontes cadastradas.", route: "water", tone: "attention" });
    if (withoutNfc.length) priorities.push({ title: `${withoutNfc.length} animal(is) sem NFC/RFID`, detail: "Ainda não possuem identificação eletrônica vinculada.", route: "nfc", tone: "info" });
    if (withoutWeight.length) priorities.push({ title: `${withoutWeight.length} animal(is) sem peso`, detail: "Não há pesagem atual cadastrada para esses animais.", route: "herd", tone: "info" });
    if (occurrences.length) priorities.push({ title: `${occurrences.length} ocorrência(s) registrada(s)`, detail: "Confira os registros de ocorrência existentes.", route: "operations", tone: "attention" });
    return { pending, overdue, todayActivities, withoutNfc, withoutWeight, waterAttention, occurrences, todayRecords, identified, nfcCoverage, priorities };
  }, [account]);

  const syncCopy = syncStatus === "saved"
    ? { title: "Sincronizado", detail: "Os dados deste aparelho estão em dia com o servidor.", icon: Wifi, tone: "ok" }
    : syncStatus === "saving"
      ? { title: "Sincronizando", detail: "Enviando alterações pendentes.", icon: RefreshCw, tone: "saving" }
      : syncStatus === "offline"
        ? { title: "Sem conexão", detail: "As alterações de gestão ficam salvas neste aparelho até a conexão voltar.", icon: CloudOff, tone: "offline" }
        : { title: "Falha na sincronização", detail: lastError || "Os dados locais continuam disponíveis. Tente novamente.", icon: TriangleAlert, tone: "error" };
  const SyncIcon = syncCopy.icon;

  return (
    <div className="screen page-enter today-screen">
      <ScreenHeader eyebrow="RESUMO" title="Central Hoje" subtitle="Pendências, registros e sincronização da propriedade." onBack={onBack} />

      <section className="today-hero">
        <span className="today-hero-icon"><LayoutDashboard size={24} /></span>
        <div><small>Propriedade</small><strong>{account.property.name || "Minha propriedade"}</strong><p>{summary.priorities.length ? `${summary.priorities.length} ponto(s) para conferir.` : "Nenhuma pendência automática encontrada."}</p></div>
        <button onClick={() => downloadPropertyReportPdf(account)}><FileDown size={17} /> PDF</button>
      </section>

      <div className="today-metrics">
        <article><ClipboardMetric icon={<CheckCircle2 size={18} />} value={summary.pending.length} label="pendentes" /></article>
        <article><ClipboardMetric icon={<TriangleAlert size={18} />} value={summary.overdue.length + summary.waterAttention.length} label="atenções" /></article>
        <article><ClipboardMetric icon={<RadioTower size={18} />} value={summary.todayRecords} label="registros hoje" /></article>
        <article><ClipboardMetric icon={<ScanLine size={18} />} value={`${summary.nfcCoverage}%`} label="com NFC" /></article>
      </div>

      <section className={`today-sync-card ${syncCopy.tone}`}><span><SyncIcon size={20} className={syncStatus === "saving" ? "spin" : ""} /></span><div><strong>{syncCopy.title}</strong><small>{syncCopy.detail}</small></div>{(syncStatus === "offline" || syncStatus === "error") && <button onClick={() => void retrySync()}><RefreshCw size={15} /> Tentar</button>}</section>
      <p className="today-offline-note">Rebanho, água, atividades e monitoramentos podem ficar pendentes no aparelho. Fotos e comunidade precisam de conexão.</p>

      <div className="today-section-title"><div><small>Prioridades</small><strong>O que conferir</strong></div><button onClick={() => navigate("assistant")}>Abrir assistente</button></div>
      <section className="today-priority-list">{summary.priorities.length ? summary.priorities.slice(0, 5).map((item) => <button key={`${item.route}-${item.title}`} className={item.tone} onClick={() => navigate(item.route)}><span>{item.tone === "attention" ? <TriangleAlert size={18} /> : item.route === "nfc" ? <ScanLine size={18} /> : item.route === "herd" ? <Cow size={18} /> : <Droplets size={18} />}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></button>) : <div className="today-calm"><CheckCircle2 size={21} /><div><strong>Sem pendências automáticas</strong><small>Continue atualizando os registros da propriedade.</small></div></div>}</section>

      <div className="today-section-title"><div><small>Agenda</small><strong>Atividades de hoje</strong></div><button onClick={() => navigate("activities")}>Ver todas</button></div>
      {summary.todayActivities.length ? <section className="today-activity-list">{summary.todayActivities.slice(0, 5).map((activity) => <button key={activity.id} onClick={() => navigate("activities")}><span>{activity.category}</span><strong>{activity.title}</strong><small>{new Date(activity.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></button>)}</section> : <div className="today-empty">Nenhuma atividade pendente marcada para hoje.</div>}

      <button className="today-history-link" onClick={() => navigate("history")}><History size={19} /><span><strong>Histórico da propriedade</strong><small>Ver registros em ordem de data</small></span></button>

      <section className="today-report-card"><span><FileDown size={22} /></span><div><strong>Relatório da propriedade</strong><small>PDF com os dados cadastrados de rebanho, água, atividades e monitoramentos.</small></div><button onClick={() => downloadPropertyReportPdf(account)}>Gerar PDF</button></section>
    </div>
  );
}

function ClipboardMetric({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) { return <>{icon}<strong>{value}</strong><small>{label}</small></>; }
