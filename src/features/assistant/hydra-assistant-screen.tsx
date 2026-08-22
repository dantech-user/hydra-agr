import {
  BarChart3,
  Beef as Cow,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Database,
  Droplets,
  FileDown,
  LoaderCircle,
  Nfc,
  RadioTower,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { showAppToast } from "../../components/modal-system";
import { ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";
import { downloadPropertyReportPdf } from "../../services/property-report";
import { supabase } from "../../services/supabase";

type Props = { account: HydraAccount; onBack: () => void };
type AssistantMessage = { id: string; role: "user" | "assistant"; text: string; mode?: "ai" | "local" | "action" };
type AssistantContext = {
  property: { name: string; municipality: string; state: string; area: string; areaUnit: string; mainActivity: string; otherActivities: string[] };
  herd: { total: number; identified: number; nfcCoverage: number; withoutWeight: number; attention: number; species: Record<string, number>; recentAnimals: Array<{ identification: string; name?: string; species: string; status: string; weight?: number; identified: boolean }> };
  water: { sources: number; attentionSources: number; records30Days: number; amount30Days: number; previous30Days: number; variationPercent?: number; latestRecord?: string };
  activities: { total: number; pending: number; overdue: number; completed: number; completionRate: number; next: Array<{ title: string; category: string; date: string; done: boolean }> };
  monitoring: { total: number; last30Days: number; withOccurrence: number };
  dataQuality: { score: number; missingProperty: number; missingNfc: number; missingWeight: number; issues: string[] };
  priorities: string[];
  nfcReadCount: number;
};

const quickQuestions = [
  { label: "O que precisa de atenção hoje?", detail: "Prioridades automáticas", icon: TriangleAlert },
  { label: "Resuma minha propriedade", detail: "Visão geral dos dados", icon: Sparkles },
  { label: "O que falta cadastrar?", detail: "Qualidade dos registros", icon: Database },
  { label: "Como está meu rebanho?", detail: "NFC, peso e observações", icon: Cow },
  { label: "Analise a água dos últimos 30 dias", detail: "Registros e tendência", icon: Droplets },
  { label: "Quais atividades estão atrasadas?", detail: "Pendências e próximas ações", icon: ClipboardCheck },
];

function dateOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function contextFromAccount(account: HydraAccount): AssistantContext {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const water30 = account.waterRecords.filter((record) => {
    const date = dateOnly(record.date);
    return Boolean(date && date >= thirtyDaysAgo);
  });
  const waterPrevious30 = account.waterRecords.filter((record) => {
    const date = dateOnly(record.date);
    return Boolean(date && date >= sixtyDaysAgo && date < thirtyDaysAgo);
  });
  const amount30Days = water30.reduce((sum, record) => sum + record.amount, 0);
  const previous30Days = waterPrevious30.reduce((sum, record) => sum + record.amount, 0);
  const variationPercent = previous30Days > 0 ? Math.round(((amount30Days - previous30Days) / previous30Days) * 100) : undefined;
  const latestWater = account.waterRecords.map((record) => record.date).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const pending = account.activities.filter((activity) => !activity.done);
  const completed = account.activities.filter((activity) => activity.done);
  const overdue = pending.filter((activity) => {
    const date = dateOnly(activity.date);
    return Boolean(date && date < today);
  });
  const completionRate = account.activities.length ? Math.round((completed.length / account.activities.length) * 100) : 100;

  const species = account.animals.reduce<Record<string, number>>((result, animal) => {
    result[animal.species] = (result[animal.species] ?? 0) + 1;
    return result;
  }, {});
  const identified = account.animals.filter((animal) => Boolean(animal.electronicId)).length;
  const missingNfc = Math.max(0, account.animals.length - identified);
  const missingWeight = account.animals.filter((animal) => !animal.weight).length;
  const nfcCoverage = account.animals.length ? Math.round((identified / account.animals.length) * 100) : 0;

  const monitoring30 = account.monitoring.filter((record) => {
    const date = dateOnly(record.date);
    return Boolean(date && date >= thirtyDaysAgo);
  });

  const missingPropertyFields = [
    account.property.name,
    account.property.municipality,
    account.property.area,
    account.property.mainActivity,
  ].filter((value) => !String(value ?? "").trim()).length;
  const issues: string[] = [];
  if (missingPropertyFields) issues.push(`${missingPropertyFields} dado(s) principal(is) da propriedade incompleto(s)`);
  if (missingNfc) issues.push(`${missingNfc} animal(is) sem NFC/RFID`);
  if (missingWeight) issues.push(`${missingWeight} animal(is) sem peso registrado`);
  if (account.waterRecords.length === 0) issues.push("nenhum registro de água cadastrado");
  if (account.sectors.length === 0) issues.push("nenhum setor cadastrado");
  const deductions = missingPropertyFields * 10 + Math.min(25, missingNfc * 3) + Math.min(20, missingWeight * 2) + (account.waterRecords.length ? 0 : 10) + (account.sectors.length ? 0 : 5);
  const dataQualityScore = Math.max(0, Math.min(100, 100 - deductions));

  const priorities: string[] = [];
  if (overdue.length) priorities.push(`${overdue.length} atividade(s) atrasada(s)`);
  if (account.waterSources.filter((source) => source.status !== "ativa").length) priorities.push(`${account.waterSources.filter((source) => source.status !== "ativa").length} fonte(s) de água em atenção`);
  if (account.animals.filter((animal) => animal.status.toLocaleLowerCase("pt-BR").includes("observ")).length) priorities.push(`${account.animals.filter((animal) => animal.status.toLocaleLowerCase("pt-BR").includes("observ")).length} animal(is) em observação`);
  if (missingNfc) priorities.push(`${missingNfc} animal(is) sem identificação NFC/RFID`);
  if (missingWeight) priorities.push(`${missingWeight} animal(is) sem peso`);

  return {
    property: {
      name: account.property.name,
      municipality: account.property.municipality,
      state: account.property.state,
      area: account.property.area,
      areaUnit: account.property.areaUnit,
      mainActivity: account.property.mainActivity,
      otherActivities: account.property.otherActivities,
    },
    herd: {
      total: account.animals.length,
      identified,
      nfcCoverage,
      withoutWeight: missingWeight,
      attention: account.animals.filter((animal) => animal.status.toLocaleLowerCase("pt-BR").includes("observ")).length,
      species,
      recentAnimals: account.animals.slice(0, 12).map((animal) => ({
        identification: animal.identification,
        name: animal.name,
        species: animal.species,
        status: animal.status,
        weight: animal.weight,
        identified: Boolean(animal.electronicId),
      })),
    },
    water: {
      sources: account.waterSources.length,
      attentionSources: account.waterSources.filter((source) => source.status !== "ativa").length,
      records30Days: water30.length,
      amount30Days,
      previous30Days,
      variationPercent,
      latestRecord: latestWater,
    },
    activities: {
      total: account.activities.length,
      pending: pending.length,
      overdue: overdue.length,
      completed: completed.length,
      completionRate,
      next: pending.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8).map((activity) => ({
        title: activity.title,
        category: activity.category,
        date: activity.date,
        done: activity.done,
      })),
    },
    monitoring: {
      total: account.monitoring.length,
      last30Days: monitoring30.length,
      withOccurrence: account.monitoring.filter((record) => Boolean(record.occurrence?.trim())).length,
    },
    dataQuality: { score: dataQualityScore, missingProperty: missingPropertyFields, missingNfc, missingWeight, issues },
    priorities: priorities.slice(0, 5),
    nfcReadCount: account.nfcReadCount,
  };
}

function localAnswer(question: string, context: AssistantContext) {
  const normalized = question.toLocaleLowerCase("pt-BR");
  const lines: string[] = [];

  if (/doen|doente|rem[eé]dio|medic|vacina|tratamento|dose|ração|racao|alimenta[cç][aã]o.*quant|quanto.*comer/.test(normalized)) {
    return "Posso organizar os registros e mostrar quais animais precisam de acompanhamento, mas não faço diagnóstico nem indico medicamentos, doses ou quantidades de alimentação. Para decisões de saúde ou nutrição, confirme com um profissional responsável.";
  }

  if (/falta cadastrar|dados incomplet|qualidade|cadastro/.test(normalized)) {
    lines.push(`A qualidade atual dos registros está em ${context.dataQuality.score}%.`);
    if (context.dataQuality.issues.length) lines.push(`Para melhorar: ${context.dataQuality.issues.slice(0, 3).join("; ")}.`);
    else lines.push("Os principais dados de gestão estão preenchidos.");
  } else if (/resum|visão geral|visao geral|propriedade/.test(normalized)) {
    lines.push(`${context.property.name || "A propriedade"} tem ${context.herd.total} animal(is), ${context.herd.nfcCoverage}% com NFC/RFID e ${context.activities.pending} atividade(s) pendente(s).`);
    lines.push(`Nos últimos 30 dias foram registrados ${context.water.amount30Days.toLocaleString("pt-BR")} L de água em ${context.water.records30Days} lançamento(s), além de ${context.monitoring.last30Days} monitoramento(s).`);
    if (context.priorities.length) lines.push(`Prioridades atuais: ${context.priorities.slice(0, 3).join("; ")}.`);
  } else if (/rebanho|animal|gado|peso|nfc|brinco/.test(normalized)) {
    lines.push(`O rebanho tem ${context.herd.total} animal(is), com ${context.herd.identified} identificado(s) por NFC/RFID (${context.herd.nfcCoverage}% de cobertura).`);
    if (context.herd.withoutWeight > 0) lines.push(`${context.herd.withoutWeight} animal(is) estão sem peso registrado.`);
    if (context.herd.attention > 0) lines.push(`${context.herd.attention} animal(is) estão marcados como em observação.`);
    if (context.herd.total > context.herd.identified) lines.push(`Faltam ${context.herd.total - context.herd.identified} animal(is) para completar a identificação eletrônica.`);
  } else if (/água|agua|consumo|fonte|reserv/.test(normalized)) {
    lines.push(`Nos últimos 30 dias há ${context.water.records30Days} registro(s) de água, somando ${context.water.amount30Days.toLocaleString("pt-BR")} L.`);
    if (typeof context.water.variationPercent === "number") lines.push(`Comparando com os 30 dias anteriores, a variação dos registros foi de ${context.water.variationPercent > 0 ? "+" : ""}${context.water.variationPercent}%. Isso descreve os dados registrados, não necessariamente o consumo real total da propriedade.`);
    if (context.water.attentionSources > 0) lines.push(`${context.water.attentionSources} fonte(s) não estão marcadas como ativas.`);
    if (context.water.records30Days === 0) lines.push("Não há registros recentes de água.");
  } else if (/atividade|tarefa|pendente|atrasad|hoje|prioridade|aten[cç][aã]o/.test(normalized)) {
    lines.push(`Há ${context.activities.pending} atividade(s) pendente(s), sendo ${context.activities.overdue} atrasada(s). A taxa de conclusão dos registros atuais é ${context.activities.completionRate}%.`);
    if (context.activities.next.length > 0) lines.push(`A próxima atividade cadastrada é “${context.activities.next[0].title}”.`);
    if (context.priorities.length) lines.push(`Outros pontos para conferir: ${context.priorities.slice(0, 3).join("; ")}.`);
  } else if (/monitor|ocorr[eê]ncia|setor/.test(normalized)) {
    lines.push(`Existem ${context.monitoring.total} monitoramento(s) no histórico e ${context.monitoring.last30Days} nos últimos 30 dias.`);
    if (context.monitoring.withOccurrence > 0) lines.push(`${context.monitoring.withOccurrence} registro(s) possuem ocorrência anotada.`);
  } else {
    lines.push(`${context.property.name || "A propriedade"} tem ${context.herd.total} animal(is), ${context.activities.pending} atividade(s) pendente(s) e ${context.water.records30Days} registro(s) de água nos últimos 30 dias.`);
    if (context.priorities.length) lines.push(`O principal ponto para revisar agora é: ${context.priorities[0]}.`);
    else lines.push("Não aparece nenhuma pendência automática importante nos registros atuais.");
  }
  return lines.join(" ");
}

export function HydraAssistantScreen({ account, onBack }: Props) {
  const context = useMemo(() => contextFromAccount(account), [account]);
  const storageKey = `hydra.assistant.chat.${account.id}`;
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as AssistantMessage[] : [];
      if (Array.isArray(parsed) && parsed.length) return parsed.slice(-24);
    } catch { /* armazenamento indisponível */ }
    return [{ id: "welcome", role: "assistant", text: `Posso analisar os registros de ${account.property.name || "sua propriedade"}, encontrar pendências e gerar um resumo. Escolha uma análise abaixo ou escreva a sua.`, mode: "local" }];
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-24))); } catch { /* armazenamento indisponível */ }
  }, [messages, storageKey]);

  function clearConversation() {
    const welcome: AssistantMessage = { id: `welcome-${Date.now()}`, role: "assistant", text: "Conversa limpa. Posso fazer uma nova análise usando os dados atuais da propriedade.", mode: "action" };
    setMessages([welcome]);
    showAppToast("Conversa limpa");
  }

  async function copyLastAnswer() {
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (!last) return;
    try {
      await navigator.clipboard.writeText(last.text);
      showAppToast("Resposta copiada");
    } catch {
      showAppToast("Não foi possível copiar a resposta.", "error");
    }
  }

  function runActionCommand(text: string) {
    const normalized = text.toLocaleLowerCase("pt-BR");
    if (/gerar.*relat|baixar.*relat|relat[oó]rio.*pdf|gerar.*pdf/.test(normalized)) {
      downloadPropertyReportPdf(account);
      setMessages((current) => [...current, { id: `action-${Date.now()}`, role: "assistant", text: "Relatório da propriedade gerado com os dados atuais do Hydra Agro.", mode: "action" }]);
      return true;
    }
    if (/limpar.*conversa|apagar.*conversa/.test(normalized)) {
      clearConversation();
      return true;
    }
    return false;
  }

  async function ask(value: string) {
    const text = value.trim().slice(0, 600);
    if (!text || busy) return;
    setQuestion("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    if (runActionCommand(text)) return;

    setBusy(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      const canUseHostedApi = window.location.protocol === "https:" || window.location.hostname === "localhost";
      if (token && canUseHostedApi) {
        const response = await fetch("/api/hydra-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: text, context }),
        });
        if (response.ok) {
          const data = await response.json() as { answer?: string };
          if (data.answer?.trim()) {
            setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: data.answer!.trim(), mode: "ai" }]);
            return;
          }
        }
      }
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: localAnswer(text, context), mode: "local" }]);
    } catch {
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: localAnswer(text, context), mode: "local" }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const qualityTone = context.dataQuality.score >= 80 ? "good" : context.dataQuality.score >= 55 ? "medium" : "attention";

  return (
    <div className="screen page-enter assistant-screen assistant-v2">
      <ScreenHeader eyebrow="ASSISTENTE" title="Hydra" subtitle="Analisa os dados cadastrados e ajuda a organizar a propriedade." onBack={onBack} />

      <section className="assistant-hero assistant-v2-hero">
        <div className="assistant-v2-hero-top">
          <span className="assistant-v2-orb"><Sparkles size={23} /></span>
          <div className="assistant-hero-copy">
            <span className="assistant-hero-kicker">RAIO-X DA PROPRIEDADE</span>
            <h2>{account.property.name || "Sua propriedade"}</h2>
            <p>{context.priorities.length ? `${context.priorities.length} ponto(s) merecem atenção nos dados atuais.` : "Os registros não mostram nenhuma pendência automática importante agora."}</p>
          </div>
          <span className={`assistant-quality-score ${qualityTone}`}><strong>{context.dataQuality.score}</strong><small>dados</small></span>
        </div>

        <div className="assistant-hero-metrics">
          <div><Cow size={17} /><span><strong>{context.herd.total}</strong><small>animais</small></span></div>
          <div><Nfc size={17} /><span><strong>{context.herd.nfcCoverage}%</strong><small>com NFC</small></span></div>
          <div><ClipboardCheck size={17} /><span><strong>{context.activities.overdue}</strong><small>atrasadas</small></span></div>
          <div><Droplets size={17} /><span><strong>{context.water.records30Days}</strong><small>água / 30d</small></span></div>
        </div>
      </section>

      <section className="assistant-insight-grid">
        <button className="assistant-insight-card priority" onClick={() => void ask("O que precisa de atenção hoje?")}>
          <span><TriangleAlert size={18} /></span>
          <div><small>PRIORIDADES</small><strong>{context.priorities.length || 0}</strong><p>{context.priorities[0] || "Nada urgente nos registros"}</p></div>
          <ChevronRight size={17} />
        </button>
        <button className="assistant-insight-card" onClick={() => void ask("O que falta cadastrar?")}>
          <span><Database size={18} /></span>
          <div><small>QUALIDADE DOS DADOS</small><strong>{context.dataQuality.score}%</strong><p>{context.dataQuality.issues[0] || "Principais cadastros completos"}</p></div>
          <ChevronRight size={17} />
        </button>
        <button className="assistant-insight-card" onClick={() => void ask("Analise a água dos últimos 30 dias")}>
          <span><BarChart3 size={18} /></span>
          <div><small>ÁGUA · 30 DIAS</small><strong>{context.water.amount30Days.toLocaleString("pt-BR")} L</strong><p>{typeof context.water.variationPercent === "number" ? `${context.water.variationPercent > 0 ? "+" : ""}${context.water.variationPercent}% vs. período anterior` : "Sem período anterior para comparar"}</p></div>
          <ChevronRight size={17} />
        </button>
      </section>

      <section className="assistant-section-block">
        <div className="assistant-section-title"><div><span>ANÁLISES RÁPIDAS</span><strong>Pergunte ao Hydra</strong></div><button className="assistant-report-shortcut" onClick={() => downloadPropertyReportPdf(account)}><FileDown size={15} /> PDF</button></div>
        <div className="assistant-quick-grid assistant-v2-quick-grid">
          {quickQuestions.map(({ label, detail, icon: Icon }) => (
            <button key={label} onClick={() => void ask(label)} disabled={busy}>
              <span className="assistant-quick-icon"><Icon size={17} /></span>
              <span className="assistant-quick-copy"><strong>{label}</strong><small>{detail}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="assistant-conversation assistant-v2-conversation">
        <header className="assistant-conversation-head">
          <div><span className="assistant-online-dot" /><span><strong>Conversa</strong><small>Respostas baseadas nos registros da conta</small></span></div>
          <div className="assistant-chat-tools">
            <button onClick={() => void copyLastAnswer()} aria-label="Copiar última resposta"><Copy size={15} /></button>
            <button onClick={clearConversation} aria-label="Limpar conversa"><Trash2 size={15} /></button>
          </div>
        </header>

        <div className="assistant-chat" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`assistant-message ${message.role}`}>
              {message.role === "assistant" && <span className="assistant-avatar"><Bot size={17} /></span>}
              <div className="assistant-bubble">
                <p>{message.text}</p>
                {message.role === "assistant" && <small>{message.mode === "ai" ? "Hydra IA · online" : message.mode === "action" ? "Ação do Hydra" : "Análise local dos dados"}</small>}
              </div>
            </article>
          ))}
          {busy && <article className="assistant-message assistant"><span className="assistant-avatar is-thinking"><LoaderCircle size={17} className="spin" /></span><div className="assistant-bubble assistant-thinking"><span /><span /><span /></div></article>}
          <div ref={chatEndRef} />
        </div>

        <form className="assistant-composer" onSubmit={submit}>
          <div className="assistant-composer-field"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre rebanho, água, atividades ou digite “gerar relatório”…" maxLength={600} rows={2} /><small>{question.length}/600</small></div>
          <button type="submit" disabled={busy || !question.trim()} aria-label="Enviar pergunta"><Send size={19} /></button>
        </form>
      </section>

      <div className="assistant-data-strip"><span><Nfc size={15} /> {context.herd.identified}/{context.herd.total} com NFC</span><span><Droplets size={15} /> {context.water.amount30Days.toLocaleString("pt-BR")} L / 30d</span><span><CheckCircle2 size={15} /> {context.activities.completionRate}% concluídas</span><span><RadioTower size={15} /> {context.monitoring.withOccurrence} ocorrências</span></div>
      <div className="assistant-boundaries"><ShieldCheck size={18} /><p><strong>Sobre as respostas</strong><small>O Hydra ajuda a consultar e organizar os registros. Não faz diagnóstico e não indica medicamentos, doses ou tratamento.</small></p></div>
    </div>
  );
}
