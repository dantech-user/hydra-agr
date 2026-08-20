import { Beef as Cow, Bot, ChevronRight, ClipboardCheck, Droplets, LoaderCircle, RadioTower, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";
import { supabase } from "../../services/supabase";

type Props = { account: HydraAccount; onBack: () => void };
type AssistantMessage = { id: string; role: "user" | "assistant"; text: string; mode?: "ai" | "local" };
type AssistantContext = {
  property: { name: string; municipality: string; state: string; area: string; areaUnit: string; mainActivity: string; otherActivities: string[] };
  herd: { total: number; identified: number; withoutWeight: number; attention: number; species: Record<string, number>; recentAnimals: Array<{ identification: string; name?: string; species: string; status: string; weight?: number; identified: boolean }> };
  water: { sources: number; attentionSources: number; records30Days: number; amount30Days: number; latestRecord?: string };
  activities: { total: number; pending: number; overdue: number; next: Array<{ title: string; category: string; date: string; done: boolean }> };
  monitoring: { total: number; last30Days: number; withOccurrence: number };
  nfcReadCount: number;
};

const quickQuestions = [
  { label: "O que precisa de atenção hoje?", icon: ClipboardCheck },
  { label: "Como está meu rebanho?", icon: Cow },
  { label: "Como estão os registros de água?", icon: Droplets },
  { label: "Quais atividades estão pendentes?", icon: RadioTower },
];

function dateOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function contextFromAccount(account: HydraAccount): AssistantContext {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const water30 = account.waterRecords.filter((record) => { const date = dateOnly(record.date); return Boolean(date && date >= thirtyDaysAgo); });
  const latestWater = account.waterRecords.map((record) => record.date).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const pending = account.activities.filter((activity) => !activity.done);
  const overdue = pending.filter((activity) => { const date = dateOnly(activity.date); return Boolean(date && date < today); });
  const species = account.animals.reduce<Record<string, number>>((result, animal) => { result[animal.species] = (result[animal.species] ?? 0) + 1; return result; }, {});
  const monitoring30 = account.monitoring.filter((record) => { const date = dateOnly(record.date); return Boolean(date && date >= thirtyDaysAgo); });
  return {
    property: { name: account.property.name, municipality: account.property.municipality, state: account.property.state, area: account.property.area, areaUnit: account.property.areaUnit, mainActivity: account.property.mainActivity, otherActivities: account.property.otherActivities },
    herd: {
      total: account.animals.length,
      identified: account.animals.filter((animal) => Boolean(animal.electronicId)).length,
      withoutWeight: account.animals.filter((animal) => !animal.weight).length,
      attention: account.animals.filter((animal) => animal.status.toLocaleLowerCase("pt-BR").includes("observ")).length,
      species,
      recentAnimals: account.animals.slice(0, 12).map((animal) => ({ identification: animal.identification, name: animal.name, species: animal.species, status: animal.status, weight: animal.weight, identified: Boolean(animal.electronicId) })),
    },
    water: { sources: account.waterSources.length, attentionSources: account.waterSources.filter((source) => source.status !== "ativa").length, records30Days: water30.length, amount30Days: water30.reduce((sum, record) => sum + record.amount, 0), latestRecord: latestWater },
    activities: { total: account.activities.length, pending: pending.length, overdue: overdue.length, next: pending.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8).map((activity) => ({ title: activity.title, category: activity.category, date: activity.date, done: activity.done })) },
    monitoring: { total: account.monitoring.length, last30Days: monitoring30.length, withOccurrence: account.monitoring.filter((record) => Boolean(record.occurrence?.trim())).length },
    nfcReadCount: account.nfcReadCount,
  };
}

function localAnswer(question: string, context: AssistantContext) {
  const normalized = question.toLocaleLowerCase("pt-BR");
  const lines: string[] = [];
  if (/doen|doente|rem[eé]dio|medic|vacina|tratamento|dose|ração|racao|alimenta[cç][aã]o.*quant|quanto.*comer/.test(normalized)) {
    return "Posso organizar os registros e mostrar quais animais precisam de acompanhamento, mas não faço diagnóstico nem indico medicamentos, doses ou quantidades de alimentação. Para decisões de saúde ou nutrição, confirme com um profissional responsável.";
  }
  if (/rebanho|animal|gado|peso|nfc|brinco/.test(normalized)) {
    lines.push(`O rebanho tem ${context.herd.total} animal(is), com ${context.herd.identified} identificado(s) por NFC/RFID.`);
    if (context.herd.withoutWeight > 0) lines.push(`${context.herd.withoutWeight} animal(is) estão sem peso registrado.`);
    if (context.herd.attention > 0) lines.push(`${context.herd.attention} animal(is) estão marcados como em observação.`);
    if (context.herd.total > context.herd.identified) lines.push(`Faltam ${context.herd.total - context.herd.identified} animal(is) para completar a identificação eletrônica.`);
  } else if (/água|agua|consumo|fonte|reserv/.test(normalized)) {
    lines.push(`Nos últimos 30 dias há ${context.water.records30Days} registro(s) de água, somando ${context.water.amount30Days.toLocaleString("pt-BR")} L.`);
    if (context.water.attentionSources > 0) lines.push(`${context.water.attentionSources} fonte(s) não estão marcadas como ativas.`);
    if (context.water.records30Days === 0) lines.push("Não há registros recentes de água.");
  } else if (/atividade|tarefa|pendente|hoje|prioridade|aten[cç][aã]o/.test(normalized)) {
    lines.push(`Há ${context.activities.pending} atividade(s) pendente(s), sendo ${context.activities.overdue} atrasada(s).`);
    if (context.activities.next.length > 0) lines.push(`A próxima atividade cadastrada é ${context.activities.next[0].title}.`);
    if (context.herd.total > context.herd.identified) lines.push(`Também faltam ${context.herd.total - context.herd.identified} animal(is) para identificação NFC/RFID.`);
    if (context.water.attentionSources > 0) lines.push(`Há ${context.water.attentionSources} fonte(s) de água que precisam ser conferidas.`);
  } else if (/monitor|ocorr[eê]ncia|setor/.test(normalized)) {
    lines.push(`Existem ${context.monitoring.total} monitoramento(s) no histórico e ${context.monitoring.last30Days} nos últimos 30 dias.`);
    if (context.monitoring.withOccurrence > 0) lines.push(`${context.monitoring.withOccurrence} registro(s) possuem ocorrência anotada.`);
  } else {
    lines.push(`${context.property.name || "A propriedade"} tem ${context.herd.total} animal(is), ${context.activities.pending} atividade(s) pendente(s) e ${context.water.records30Days} registro(s) de água nos últimos 30 dias.`);
    if (context.activities.overdue > 0) lines.push(`Há ${context.activities.overdue} atividade(s) atrasada(s) para revisar.`);
    else if (context.herd.total > context.herd.identified) lines.push(`Faltam ${context.herd.total - context.herd.identified} animal(is) para identificação NFC/RFID.`);
    else lines.push("Não aparece nenhuma pendência automática importante nos registros atuais.");
  }
  return lines.join(" ");
}

export function HydraAssistantScreen({ account, onBack }: Props) {
  const context = useMemo(() => contextFromAccount(account), [account]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([{ id: "welcome", role: "assistant", text: `Posso consultar os registros de ${account.property.name || "sua propriedade"}. Escolha uma pergunta abaixo ou escreva a sua.`, mode: "local" }]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  async function ask(value: string) {
    const text = value.trim().slice(0, 600);
    if (!text || busy) return;
    setQuestion("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setBusy(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      const canUseHostedApi = window.location.protocol === "https:" || window.location.hostname === "localhost";
      if (token && canUseHostedApi) {
        const response = await fetch("/api/hydra-assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: text, context }) });
        if (response.ok) {
          const data = await response.json() as { answer?: string };
          if (data.answer?.trim()) { setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: data.answer!.trim(), mode: "ai" }]); return; }
        }
      }
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: localAnswer(text, context), mode: "local" }]);
    } catch {
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: localAnswer(text, context), mode: "local" }]);
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(question); }

  return (
    <div className="screen page-enter assistant-screen">
      <ScreenHeader eyebrow="ASSISTENTE" title="Hydra" subtitle="Consulta os registros cadastrados da propriedade." onBack={onBack} />

      <section className="assistant-hero">
        <div className="assistant-hero-top"><div className="assistant-hero-copy"><span className="assistant-hero-kicker">Resumo dos registros</span><h2>{account.property.name || "Sua propriedade"}</h2><p>Use o assistente para conferir pendências e informações já cadastradas.</p></div></div>
        <div className="assistant-hero-metrics">
          <div><Cow size={17} /><span><strong>{context.herd.total}</strong><small>animais</small></span></div>
          <div><ClipboardCheck size={17} /><span><strong>{context.activities.pending}</strong><small>pendentes</small></span></div>
          <div><Droplets size={17} /><span><strong>{context.water.records30Days}</strong><small>água / 30d</small></span></div>
          <div><RadioTower size={17} /><span><strong>{context.monitoring.last30Days}</strong><small>monitoramentos</small></span></div>
        </div>
      </section>

      <section className="assistant-section-block">
        <div className="assistant-section-title"><div><span>Atalhos</span><strong>Perguntas comuns</strong></div></div>
        <div className="assistant-quick-grid">{quickQuestions.map(({ label, icon: Icon }) => <button key={label} onClick={() => void ask(label)} disabled={busy}><span className="assistant-quick-icon"><Icon size={17} /></span><span className="assistant-quick-copy"><strong>{label}</strong></span><ChevronRight size={16} /></button>)}</div>
      </section>

      <section className="assistant-conversation">
        <header className="assistant-conversation-head"><div><span><strong>Conversa</strong><small>Respostas baseadas nos registros do app</small></span></div><span className="assistant-context-badge">dados da conta</span></header>
        <div className="assistant-chat" aria-live="polite">
          {messages.map((message) => <article key={message.id} className={`assistant-message ${message.role}`}>{message.role === "assistant" && <span className="assistant-avatar"><Bot size={17} /></span>}<div className="assistant-bubble"><p>{message.text}</p>{message.role === "assistant" && <small>{message.mode === "ai" ? "Resposta online" : "Resposta local"}</small>}</div></article>)}
          {busy && <article className="assistant-message assistant"><span className="assistant-avatar is-thinking"><LoaderCircle size={17} className="spin" /></span><div className="assistant-bubble assistant-thinking"><span /><span /><span /></div></article>}
          <div ref={chatEndRef} />
        </div>
        <form className="assistant-composer" onSubmit={submit}><div className="assistant-composer-field"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escreva uma pergunta…" maxLength={600} rows={2} /><small>{question.length}/600</small></div><button type="submit" disabled={busy || !question.trim()} aria-label="Enviar pergunta"><Send size={19} /></button></form>
      </section>

      <div className="assistant-data-strip"><span><Cow size={15} /> {context.herd.identified}/{context.herd.total} com NFC</span><span><Droplets size={15} /> {context.water.amount30Days.toLocaleString("pt-BR")} L / 30d</span><span><ClipboardCheck size={15} /> {context.activities.overdue} atrasadas</span><span><RadioTower size={15} /> {context.monitoring.withOccurrence} ocorrências</span></div>
      <div className="assistant-boundaries"><ShieldCheck size={18} /><p><strong>Sobre as respostas</strong><small>O assistente ajuda a consultar e organizar os registros. Não faz diagnóstico e não indica medicamentos, doses ou tratamento.</small></p></div>
    </div>
  );
}
