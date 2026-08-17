import { useMemo, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Award,
  BellRing,
  Beef as Cow,
  Check,
  ClipboardCheck,
  Crown,
  Droplets,
  FileDown,
  Gauge,
  Instagram,
  LockKeyhole,
  Nfc,
  Plus,
  Scale,
  Sparkles,
  Sprout,
  Target,
} from "lucide-react";
import { EmptyState, Field, LoadingButton, Modal, ScreenHeader, SectionHeader } from "../../components/ui";
import { showAppToast } from "../../components/modal-system";
import { makeId, type AnimalHistoryEntry, type HydraAccount, type UpdateAccount } from "../../lib/hydra-types";
import { hydraSupport } from "../../lib/support";

type Props = {
  account: HydraAccount;
  updateAccount: UpdateAccount;
  onBack: () => void;
};

const day = 24 * 60 * 60 * 1000;

function localDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

function formatDate(value?: string) {
  if (!value) return "Sem prazo definido";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatNumber(value: number, suffix = "") {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function ProgressRow({ label, value, goal, unit }: { label: string; value: number; goal?: number; unit?: string }) {
  const percentage = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return <div className="plus-goal-row"><div><strong>{label}</strong><small>{goal ? `${formatNumber(value, unit)} de ${formatNumber(goal, unit)}` : "Meta ainda não definida"}</small></div><span>{goal ? `${percentage}%` : "—"}</span><i><b style={{ width: `${percentage}%` }} /></i></div>;
}

export function PlusScreen({ account, updateAccount, onBack }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState<"history" | "goals" | null>(null);
  const [history, setHistory] = useState({ animalId: "", type: "Pesagem", date: new Date().toISOString().slice(0, 10), description: "", weight: "", reminderAt: "" });
  const [goals, setGoals] = useState({
    monthlyWater: account.settings.premiumGoals.monthlyWater?.toString() || "",
    monthlyActivities: account.settings.premiumGoals.monthlyActivities?.toString() || "",
    identifiedAnimals: account.settings.premiumGoals.identifiedAnimals?.toString() || "",
  });
  const isPlus = account.profile.plan === "Hydra Agro+";

  const analytics = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const currentStart = new Date(now.getTime() - (period - 1) * day);
    currentStart.setHours(0, 0, 0, 0);
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - (period - 1) * day);
    previousStart.setHours(0, 0, 0, 0);
    const currentWater = account.waterRecords.filter((record) => {
      const date = localDate(record.date);
      return date >= currentStart && date <= now;
    });
    const previousWater = account.waterRecords.filter((record) => {
      const date = localDate(record.date);
      return date >= previousStart && date <= previousEnd;
    });
    const currentTotal = sum(currentWater.map((record) => record.amount));
    const previousTotal = sum(previousWater.map((record) => record.amount));

    const bucketCount = Math.min(12, period);
    const bucketDays = Math.ceil(period / bucketCount);
    const series = Array.from({ length: bucketCount }, (_, index) => {
      const start = new Date(currentStart.getTime() + index * bucketDays * day);
      const end = new Date(Math.min(now.getTime(), start.getTime() + bucketDays * day - 1));
      const value = sum(currentWater.filter((record) => {
        const date = localDate(record.date);
        return date >= start && date <= end;
      }).map((record) => record.amount));
      return { label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), value };
    });

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthWater = sum(account.waterRecords.filter((record) => localDate(record.date) >= monthStart).map((record) => record.amount));
    const thisMonthActivities = account.activities.filter((activity) => localDate(activity.date) >= monthStart).length;
    const thisMonthMonitoring = account.monitoring.filter((record) => localDate(record.date) >= monthStart).length;
    const historyEntries = account.animals
      .flatMap((animal) => (animal.history ?? []).map((entry) => ({ ...entry, animal })))
      .sort((left, right) => right.date.localeCompare(left.date));
    const weightEntries = historyEntries
      .filter((entry) => entry.weight)
      .sort((left, right) => left.date.localeCompare(right.date));
    const vaccinationEntries = account.animals.flatMap((animal) => (animal.history ?? []).filter((entry) => entry.type.toLocaleLowerCase("pt-BR").includes("vacina")).map((entry) => ({ ...entry, animal })));
    const reminders = account.animals.flatMap((animal) => (animal.history ?? []).filter((entry) => entry.reminderAt && new Date(entry.reminderAt).getTime() >= Date.now() && !entry.done).map((entry) => ({ ...entry, animal }))).sort((a, b) => String(a.reminderAt).localeCompare(String(b.reminderAt)));
    return { currentWater, previousWater, currentTotal, previousTotal, series, thisMonthWater, thisMonthActivities, thisMonthMonitoring, historyEntries, weightEntries, vaccinationEntries, reminders };
  }, [account, period]);

  function requestActivation() {
    const text = "Olá! Quero ativar o Hydra Agro+ por R$ 6/mês. Podem me orientar sobre o Pix e a confirmação manual?";
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setNotice("Mensagem copiada. Envie-a ao perfil oficial para receber as instruções.");
    window.open(hydraSupport.instagramUrl, "_blank", "noopener,noreferrer");
  }

  async function saveHistory(event: FormEvent) {
    event.preventDefault();
    if (!history.animalId || !history.description.trim()) { setModalError("Escolha o animal e descreva o registro."); return; }
    const weight = history.weight ? Number(history.weight.replace(",", ".")) : undefined;
    if (history.type === "Pesagem" && (!weight || weight <= 0)) { setModalError("Informe um peso válido."); return; }
    const entry: AnimalHistoryEntry = {
      id: makeId("history"),
      date: new Date(`${history.date}T12:00:00`).toISOString(),
      type: history.type,
      description: history.description.trim(),
      weight: weight && weight > 0 ? weight : undefined,
      reminderAt: history.reminderAt ? new Date(`${history.reminderAt}T09:00:00`).toISOString() : undefined,
      done: false,
    };
    setSaving("history");
    setModalError("");
    try {
      await updateAccount((current) => ({
        ...current,
        animals: current.animals.map((animal) => animal.id === history.animalId
          ? { ...animal, weight: entry.weight ?? animal.weight, history: [...(animal.history ?? []), entry] }
          : animal),
      }), { requireRemote: true });
      setHistory({ animalId: "", type: "Pesagem", date: new Date().toISOString().slice(0, 10), description: "", weight: "", reminderAt: "" });
      setHistoryOpen(false);
      showAppToast("Registro salvo no histórico do animal");
    } catch (caught) {
      setModalError(caught instanceof Error ? caught.message : "Não foi possível salvar o registro.");
    } finally {
      setSaving(null);
    }
  }

  async function saveGoals(event: FormEvent) {
    event.preventDefault();
    const numberOrUndefined = (value: string) => {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };
    setSaving("goals");
    setModalError("");
    try {
      await updateAccount((current) => ({ ...current, settings: { ...current.settings, premiumGoals: {
        monthlyWater: numberOrUndefined(goals.monthlyWater),
        monthlyActivities: numberOrUndefined(goals.monthlyActivities),
        identifiedAnimals: numberOrUndefined(goals.identifiedAnimals),
      } } }), { requireRemote: true });
      setGoalsOpen(false);
      showAppToast("Metas atualizadas com segurança");
    } catch (caught) {
      setModalError(caught instanceof Error ? caught.message : "Não foi possível atualizar as metas.");
    } finally {
      setSaving(null);
    }
  }

  function printReport() {
    if (Capacitor.isNativePlatform()) {
      setNotice("A geração em PDF está disponível na versão web. No Android, os dados continuam visíveis neste painel.");
      return;
    }
    document.body.classList.add("printing-plus");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-plus"), 400);
  }

  if (!isPlus) {
    return (
      <div className="screen page-enter extra-screen plus-screen plus-sales-screen">
        <ScreenHeader eyebrow="PLANO OFICIAL" title="Hydra Agro+" subtitle="Mais análise e histórico para quem quer acompanhar a propriedade de perto." onBack={onBack} />
        <section className="plus-price-hero"><span><Crown size={34} /></span><small>ASSINATURA MENSAL</small><h2><b>R$</b> 6</h2><p>por mês</p><em>Ativação manual confirmada pela administração</em></section>
        {notice && <div className="plus-notice" role="status">{notice}</div>}
        <section className="plus-comparison">
          <article><span>GRATUITO</span><h3>O essencial continua útil</h3>{["Cadastro e gestão básica de animais", "Fontes e registros básicos de água", "Atividades, setores e monitoramento", "Comunidade, perfil e dados da propriedade"].map((item) => <div key={item}><Check size={16} /> {item}</div>)}</article>
          <article className="premium"><span><Crown size={15} /> HYDRA AGRO+</span><h3>Análise, histórico e visão ampliada</h3>{["Painel avançado com dados reais", "Comparações e metas hídricas", "Histórico animal, peso, vacinação e lembretes", "Indicadores da propriedade e relatórios", "Conquistas e preparação para NFC premium"].map((item) => <div key={item}><Sparkles size={16} /> {item}</div>)}</article>
        </section>
        <section className="manual-payment-card"><Instagram size={27} /><div><span>ATIVAÇÃO SEGURA</span><h3>Pagamento manual, sem checkout falso</h3><p>Você receberá pelo perfil oficial as instruções do Pix. Após a confirmação do pagamento, o Hydra Agro+ será ativado diretamente na sua conta pela administração. O aplicativo não cobra sozinho e não simula pagamento.</p><button className="primary-button full" onClick={requestActivation}><Instagram size={18} /> Continuar pelo Instagram</button><small>{hydraSupport.instagramHandle}</small></div></section>
      </div>
    );
  }

  const maxSeries = Math.max(...analytics.series.map((item) => item.value), 1);
  const delta = analytics.previousTotal > 0 ? ((analytics.currentTotal - analytics.previousTotal) / analytics.previousTotal) * 100 : undefined;
  const identified = account.animals.filter((animal) => animal.electronicId).length;
  const averageWeight = account.animals.filter((animal) => animal.weight).length
    ? sum(account.animals.filter((animal) => animal.weight).map((animal) => animal.weight!)) / account.animals.filter((animal) => animal.weight).length
    : 0;
  const badges = [
    { title: "Primeira leitura", text: "Registrou água no Hydra Agro", unlocked: account.waterRecords.length > 0, icon: <Droplets size={20} /> },
    { title: "Rebanho digital", text: "Cadastrou pelo menos um animal", unlocked: account.animals.length > 0, icon: <Cow size={20} /> },
    { title: "Identificação em campo", text: "Vinculou uma identificação eletrônica", unlocked: identified > 0, icon: <Nfc size={20} /> },
    { title: "Rotina registrada", text: "Concluiu cinco atividades", unlocked: account.activities.filter((item) => item.done).length >= 5, icon: <ClipboardCheck size={20} /> },
  ];

  return (
    <div className="screen page-enter extra-screen plus-screen plus-dashboard">
      <ScreenHeader eyebrow="RECURSOS PREMIUM" title="Painel Hydra Agro+" subtitle="Indicadores calculados somente com os registros da sua conta." onBack={onBack} action={<span className="plus-crown-action"><Crown size={21} /></span>} />
      <section className="plus-status-card"><Crown size={25} /><div><small>PLANO ATIVO</small><strong>Hydra Agro+</strong><span>Ativado em {formatDate(account.subscription.premiumStartedAt)} · {account.subscription.premiumExpiresAt ? `válido até ${formatDate(account.subscription.premiumExpiresAt)}` : "sem prazo definido"}</span></div></section>
      {notice && <div className="plus-notice" role="status">{notice}</div>}

      <section className="plus-kpi-grid">
        <article><Droplets size={20} /><span>Água no mês</span><strong>{formatNumber(analytics.thisMonthWater, " L")}</strong></article>
        <article><Cow size={20} /><span>Animais ativos</span><strong>{account.animals.filter((animal) => animal.status === "Ativo").length}</strong></article>
        <article><ClipboardCheck size={20} /><span>Atividades no mês</span><strong>{analytics.thisMonthActivities}</strong></article>
        <article><Gauge size={20} /><span>Monitoramentos</span><strong>{analytics.thisMonthMonitoring}</strong></article>
      </section>

      <section className="plus-section-card">
        <SectionHeader title="Inteligência hídrica" action={<div className="plus-period-tabs">{([7, 30, 90] as const).map((value) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value}d</button>)}</div>} />
        {analytics.currentWater.length === 0 ? <EmptyState icon={<Droplets size={25} />} title="Sem dados neste período" text="Registre leituras de água para liberar o gráfico e a comparação sem números inventados." /> : <>
          <div className="plus-water-summary"><div><span>Total do período</span><strong>{formatNumber(analytics.currentTotal, " L")}</strong></div><div><span>Período anterior</span><strong>{analytics.previousWater.length ? formatNumber(analytics.previousTotal, " L") : "Sem dados"}</strong></div><em className={delta !== undefined && delta > 0 ? "up" : "down"}>{delta === undefined ? "Comparação indisponível" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}</em></div>
          <div className="plus-bar-chart" aria-label="Evolução das leituras de água">{analytics.series.map((item) => <div key={item.label}><span title={`${item.value} L`} style={{ height: `${Math.max(item.value ? 10 : 2, (item.value / maxSeries) * 100)}%` }} /><small>{item.label}</small></div>)}</div>
        </>}
      </section>

      <section className="plus-section-card">
        <SectionHeader title="Histórico do rebanho" action={<button className="small-button" onClick={() => { setModalError(""); setHistoryOpen(true); }} disabled={account.animals.length === 0}><Plus size={16} /> Registro</button>} />
        {account.animals.length === 0 ? <EmptyState icon={<Cow size={25} />} title="Nenhum animal cadastrado" text="Cadastre um animal na aba Rebanho antes de criar pesagens, vacinas ou lembretes." /> : <>
          <div className="plus-herd-stats"><div><Scale size={19} /><span><strong>{averageWeight ? formatNumber(averageWeight, " kg") : "—"}</strong><small>peso médio atual</small></span></div><div><BellRing size={19} /><span><strong>{analytics.reminders.length}</strong><small>lembretes futuros</small></span></div><div><ClipboardCheck size={19} /><span><strong>{analytics.vaccinationEntries.length}</strong><small>vacinações registradas</small></span></div></div>
          {analytics.reminders.length > 0 ? <div className="plus-reminder-list">{analytics.reminders.slice(0, 4).map((entry) => <div key={entry.id}><BellRing size={17} /><span><strong>{entry.animal.name || entry.animal.identification}</strong><small>{entry.description} · {formatDate(entry.reminderAt)}</small></span></div>)}</div> : <p className="plus-inline-empty">Nenhum lembrete futuro. Use “Registro” para programar o próximo manejo.</p>}
          {analytics.weightEntries.length > 0 ? <div className="plus-weight-panel"><div className="plus-subheading"><strong>Evolução de peso</strong><small>Últimas pesagens registradas</small></div><div className="plus-weight-chart">{analytics.weightEntries.slice(-12).map((entry) => <div key={entry.id}><span style={{ height: `${Math.max(10, (Number(entry.weight) / Math.max(...analytics.weightEntries.slice(-12).map((item) => Number(item.weight)), 1)) * 100)}%` }} title={`${entry.animal.name || entry.animal.identification}: ${entry.weight} kg`} /><small>{entry.weight} kg</small></div>)}</div></div> : <p className="plus-inline-empty">A evolução de peso aparecerá depois da primeira pesagem.</p>}
          {analytics.historyEntries.length > 0 && <div className="plus-history-panel"><div className="plus-subheading"><strong>Histórico completo</strong><small>{analytics.historyEntries.length} registro{analytics.historyEntries.length === 1 ? "" : "s"}</small></div><div className="plus-history-list">{analytics.historyEntries.map((entry) => <article key={`${entry.animal.id}-${entry.id}`}><span>{entry.type}</span><div><strong>{entry.animal.name || entry.animal.identification}</strong><p>{entry.description}</p><small>{formatDate(entry.date)}{entry.weight ? ` · ${entry.weight} kg` : ""}</small></div></article>)}</div></div>}
        </>}
      </section>

      <section className="plus-section-card">
        <SectionHeader title="Metas da propriedade" action={<button className="text-button" onClick={() => { setModalError(""); setGoals({ monthlyWater: account.settings.premiumGoals.monthlyWater?.toString() || "", monthlyActivities: account.settings.premiumGoals.monthlyActivities?.toString() || "", identifiedAnimals: account.settings.premiumGoals.identifiedAnimals?.toString() || "" }); setGoalsOpen(true); }}>Editar metas</button>} />
        <div className="plus-goals"><ProgressRow label="Água registrada no mês" value={analytics.thisMonthWater} goal={account.settings.premiumGoals.monthlyWater} unit=" L" /><ProgressRow label="Atividades no mês" value={analytics.thisMonthActivities} goal={account.settings.premiumGoals.monthlyActivities} /><ProgressRow label="Animais identificados" value={identified} goal={account.settings.premiumGoals.identifiedAnimals} /></div>
      </section>

      <section className="plus-section-card">
        <SectionHeader title="Conquistas reais" />
        <div className="plus-badges">{badges.map((badge) => <article key={badge.title} className={badge.unlocked ? "unlocked" : "locked"}><span>{badge.unlocked ? <Award size={21} /> : badge.icon}</span><div><strong>{badge.title}</strong><small>{badge.text}</small></div><em>{badge.unlocked ? "Conquistada" : "Pendente"}</em></article>)}</div>
      </section>

      <section className="plus-section-card plus-print-report">
        <SectionHeader title="Relatório da propriedade" />
        <div className="report-head"><Sprout size={25} /><div><strong>{account.property.name || "Propriedade sem nome"}</strong><small>{account.property.municipality}, {account.property.state}</small></div></div>
        <div className="report-grid"><div><span>Água no mês</span><strong>{formatNumber(analytics.thisMonthWater, " L")}</strong></div><div><span>Animais</span><strong>{account.animals.length}</strong></div><div><span>Atividades no mês</span><strong>{analytics.thisMonthActivities}</strong></div><div><span>Monitoramentos no mês</span><strong>{analytics.thisMonthMonitoring}</strong></div></div>
        <p>Gerado em {new Date().toLocaleDateString("pt-BR")} com dados reais da conta {account.email}.</p>
        <button className="secondary-button full report-print-button" onClick={printReport}><FileDown size={18} /> {Capacitor.isNativePlatform() ? "Ver disponibilidade do PDF" : "Gerar relatório em PDF"}</button>
      </section>

      <section className="plus-future-card"><span><LockKeyhole size={22} /></span><div><small>EVOLUÇÃO FUTURA</small><strong>NFC/RFID avançado</strong><p>Arquitetura reservada para automações e relatórios de leitura. Só será ativada quando houver integração real compatível; nenhuma leitura é simulada.</p></div><Nfc size={29} /></section>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} eyebrow="REBANHO PREMIUM" title="Novo registro animal" tall dismissible={saving !== "history"}>
        <form className="modal-form" onSubmit={saveHistory}>
          <Field label="Animal"><select value={history.animalId} onChange={(event) => setHistory({ ...history, animalId: event.target.value })}><option value="">Selecione</option>{account.animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name || animal.identification} · {animal.identification}</option>)}</select></Field>
          <div className="field-combo"><Field label="Tipo"><select value={history.type} onChange={(event) => setHistory({ ...history, type: event.target.value })}>{["Pesagem", "Vacinação", "Manejo", "Lembrete", "Observação"].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Data"><input type="date" value={history.date} onChange={(event) => setHistory({ ...history, date: event.target.value })} /></Field></div>
          {history.type === "Pesagem" && <Field label="Peso (kg)"><input inputMode="decimal" value={history.weight} onChange={(event) => setHistory({ ...history, weight: event.target.value })} placeholder="0" /></Field>}
          <Field label="Descrição"><textarea value={history.description} onChange={(event) => setHistory({ ...history, description: event.target.value })} placeholder="Ex.: Aplicada vacina contra clostridioses" /></Field>
          <Field label="Lembrar em (opcional)" hint="Use para a próxima dose, pesagem ou manejo."><input type="date" value={history.reminderAt} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setHistory({ ...history, reminderAt: event.target.value })} /></Field>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}<div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setHistoryOpen(false)} disabled={saving === "history"}>Cancelar</button><LoadingButton className="primary-button" type="submit" loading={saving === "history"} loadingLabel="Salvando registro...">Confirmar registro</LoadingButton></div>
        </form>
      </Modal>

      <Modal open={goalsOpen} onClose={() => setGoalsOpen(false)} eyebrow="PLANEJAMENTO" title="Metas mensais" dismissible={saving !== "goals"}>
        <form className="modal-form" onSubmit={saveGoals}>
          <Field label="Água registrada (L)" hint="Meta de acompanhamento, não limite de consumo."><input inputMode="decimal" value={goals.monthlyWater} onChange={(event) => setGoals({ ...goals, monthlyWater: event.target.value })} placeholder="Opcional" /></Field>
          <Field label="Atividades registradas"><input inputMode="numeric" value={goals.monthlyActivities} onChange={(event) => setGoals({ ...goals, monthlyActivities: event.target.value })} placeholder="Opcional" /></Field>
          <Field label="Animais identificados"><input inputMode="numeric" value={goals.identifiedAnimals} onChange={(event) => setGoals({ ...goals, identifiedAnimals: event.target.value })} placeholder="Opcional" /></Field>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}<div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setGoalsOpen(false)} disabled={saving === "goals"}>Cancelar</button><LoadingButton className="primary-button" type="submit" loading={saving === "goals"} loadingLabel="Salvando metas..."><Target size={18} /> Confirmar metas</LoadingButton></div>
        </form>
      </Modal>
    </div>
  );
}
