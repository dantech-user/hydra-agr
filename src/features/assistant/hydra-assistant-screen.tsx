import { Beef as Cow, Bot, CheckCircle2, ChevronRight, ClipboardCheck, Database, Droplets, LoaderCircle, RadioTower, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";
import { supabase } from "../../services/supabase";

type Props = {
  account: HydraAccount;
  onBack: () => void;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  mode?: "ai" | "local";
};

type AssistantContext = {
  property: {
    name: string;
    municipality: string;
    state: string;
    area: string;
    areaUnit: string;
    mainActivity: string;
    otherActivities: string[];
  };
  herd: {
    total: number;
    identified: number;
    withoutWeight: number;
    attention: number;
    species: Record<string, number>;
    recentAnimals: Array<{ identification: string; name?: string; species: string; status: string; weight?: number; identified: boolean }>;
  };
  water: {
    sources: number;
    attentionSources: number;
    records30Days: number;
    amount30Days: number;
    latestRecord?: string;
  };
  activities: {
    total: number;
    pending: number;
    overdue: number;
    next: Array<{ title: string; category: string; date: string; done: boolean }>;
  };
  monitoring: {
    total: number;
    last30Days: number;
    withOccurrence: number;
  };
  nfcReadCount: number;
};

const quickQuestions = [
  { label: "O que precisa de atenção hoje?", icon: Sparkles, caption: "Prioridades do dia" },
  { label: "Analise meu rebanho", icon: Cow, caption: "Pesos e identificação" },
  { label: "Como está a água?", icon: Droplets, caption: "Últimos 30 dias" },
  { label: "Quais atividades estão pendentes?", icon: ClipboardCheck, caption: "Tarefas e atrasos" },
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

  const water30 = account.waterRecords.filter((record) => {
    const date = dateOnly(record.date);
    return Boolean(date && date >= thirtyDaysAgo);
  });
  const latestWater = account.waterRecords
    .map((record) => record.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  const pending = account.activities.filter((activity) => !activity.done);
  const overdue = pending.filter((activity) => {
    const date = dateOnly(activity.date);
    return Boolean(date && date < today);
  });
  const species = account.animals.reduce<Record<string, number>>((result, animal) => {
    result[animal.species] = (result[animal.species] ?? 0) + 1;
    return result;
  }, {});
  const monitoring30 = account.monitoring.filter((record) => {
    const date = dateOnly(record.date);
    return Boolean(date && date >= thirtyDaysAgo);
  });

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
      identified: account.animals.filter((animal) => Boolean(animal.electronicId)).length,
      withoutWeight: account.animals.filter((animal) => !animal.weight).length,
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
      amount30Days: water30.reduce((sum, record) => sum + record.amount, 0),
      latestRecord: latestWater,
    },
    activities: {
      total: account.activities.length,
      pending: pending.length,
      overdue: overdue.length,
      next: pending.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8).map((activity) => ({ title: activity.title, category: activity.category, date: activity.date, done: activity.done })),
    },
    monitoring: {
      total: account.monitoring.length,
      last30Days: monitoring30.length,
      withOccurrence: account.monitoring.filter((record) => Boolean(record.occurrence?.trim())).length,
    },
    nfcReadCount: account.nfcReadCount,
  };
}

function localAnswer(question: string, context: AssistantContext) {
  const normalized = question.toLocaleLowerCase("pt-BR");
  const lines: string[] = [];

  if (/doen|doente|rem[eé]dio|medic|vacina|tratamento|dose|ração|racao|alimenta[cç][aã]o.*quant|quanto.*comer/.test(normalized)) {
    return "Posso ajudar a organizar os registros e mostrar quais animais precisam de acompanhamento, mas não devo diagnosticar doenças nem indicar medicamentos, doses ou quantidades de alimentação. Registre os sinais observados no histórico do animal e, para uma decisão de saúde ou nutrição, confirme com um veterinário ou profissional responsável.";
  }

  if (/rebanho|animal|gado|peso|nfc|brinco/.test(normalized)) {
    lines.push(`Seu rebanho tem ${context.herd.total} animal(is), com ${context.herd.identified} identificado(s) por NFC/RFID.`);
    if (context.herd.withoutWeight > 0) lines.push(`${context.herd.withoutWeight} animal(is) ainda estão sem peso registrado; isso é uma boa pendência para organizar.`);
    if (context.herd.attention > 0) lines.push(`${context.herd.attention} animal(is) estão marcados como em observação. Vale revisar as anotações e o histórico deles.`);
    if (context.herd.total > 0 && context.herd.identified < context.herd.total) lines.push(`Faltam ${context.herd.total - context.herd.identified} animal(is) para completar a identificação eletrônica do rebanho.`);
  } else if (/água|agua|consumo|fonte|reserv/.test(normalized)) {
    lines.push(`Nos últimos 30 dias há ${context.water.records30Days} registro(s) de água, somando ${context.water.amount30Days.toLocaleString("pt-BR")} L cadastrados.`);
    if (context.water.attentionSources > 0) lines.push(`${context.water.attentionSources} fonte(s) de água não estão marcadas como ativas. Confira o status delas.`);
    if (context.water.records30Days === 0) lines.push("Não há registros recentes de água. Para comparar períodos, tente manter as leituras em uma frequência parecida.");
  } else if (/atividade|tarefa|pendente|hoje|prioridade|aten[cç][aã]o/.test(normalized)) {
    lines.push(`Há ${context.activities.pending} atividade(s) pendente(s), sendo ${context.activities.overdue} atrasada(s).`);
    if (context.activities.next.length > 0) lines.push(`Próxima prioridade cadastrada: ${context.activities.next[0].title} (${context.activities.next[0].category}).`);
    if (context.herd.total > 0 && context.herd.identified < context.herd.total) lines.push(`Também faltam ${context.herd.total - context.herd.identified} animal(is) para identificação NFC/RFID.`);
    if (context.water.attentionSources > 0) lines.push(`Confira ${context.water.attentionSources} fonte(s) de água com status de atenção/inativa.`);
  } else if (/monitor|ocorr[eê]ncia|setor/.test(normalized)) {
    lines.push(`Existem ${context.monitoring.total} monitoramento(s) no histórico e ${context.monitoring.last30Days} nos últimos 30 dias.`);
    if (context.monitoring.withOccurrence > 0) lines.push(`${context.monitoring.withOccurrence} registro(s) possuem ocorrência anotada. Vale revisar se todos já tiveram encaminhamento.`);
  } else {
    lines.push(`${context.property.name || "A propriedade"} tem ${context.herd.total} animal(is), ${context.activities.pending} atividade(s) pendente(s) e ${context.water.records30Days} registro(s) de água nos últimos 30 dias.`);
    if (context.activities.overdue > 0) lines.push(`A primeira prioridade é revisar ${context.activities.overdue} atividade(s) atrasada(s).`);
    else if (context.herd.total > context.herd.identified) lines.push(`Uma próxima melhoria é completar a identificação NFC/RFID de ${context.herd.total - context.herd.identified} animal(is).`);
    else lines.push("Pelos dados cadastrados, não aparece uma pendência crítica automática agora. Continue registrando atividades, água e monitoramentos para melhorar a análise.");
  }

  return lines.join(" ");
}

export function HydraAssistantScreen({ account, onBack }: Props) {
  const context = useMemo(() => contextFromAccount(account), [account]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const firstName = account.profile.name.split(/\s+/)[0] || "Produtor";
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Olá, ${firstName}. Já organizei uma visão dos registros de ${account.property.name || "sua propriedade"}. Posso cruzar rebanho, água, atividades e monitoramentos para ajudar você a enxergar prioridades.`,
      mode: "local",
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

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

  return (
    <div className="screen page-enter assistant-screen">
      <ScreenHeader eyebrow="GESTÃO INTELIGENTE" title="Assistente Hydra" subtitle="Análises baseadas nos registros da propriedade." onBack={onBack} />

      <section className="assistant-hero">
        <div className="assistant-hero-top">
          <span className="assistant-hero-mark"><Sparkles size={26} /></span>
          <div className="assistant-hero-copy">
            <span className="assistant-hero-kicker"><CheckCircle2 size={13} /> DADOS CONECTADOS</span>
            <h2>Uma visão mais clara da sua propriedade.</h2>
            <p>O Hydra cruza seus registros para encontrar pendências, padrões e próximos passos.</p>
          </div>
        </div>
        <div className="assistant-hero-metrics">
          <div><Cow size={17} /><span><strong>{context.herd.total}</strong><small>animais</small></span></div>
          <div><ClipboardCheck size={17} /><span><strong>{context.activities.pending}</strong><small>pendências</small></span></div>
          <div><Droplets size={17} /><span><strong>{context.water.records30Days}</strong><small>leituras 30d</small></span></div>
          <div><RadioTower size={17} /><span><strong>{context.monitoring.last30Days}</strong><small>monitoramentos</small></span></div>
        </div>
      </section>

      <section className="assistant-section-block">
        <div className="assistant-section-title"><div><span>PERGUNTAS RÁPIDAS</span><strong>Por onde quer começar?</strong></div><Sparkles size={18} /></div>
        <div className="assistant-quick-grid">
          {quickQuestions.map(({ label, icon: Icon, caption }) => (
            <button key={label} onClick={() => void ask(label)} disabled={busy}>
              <span className="assistant-quick-icon"><Icon size={18} /></span>
              <span className="assistant-quick-copy"><strong>{label}</strong><small>{caption}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="assistant-conversation">
        <header className="assistant-conversation-head">
          <div><span className="assistant-online-dot" /><span><strong>Hydra</strong><small>Assistente da propriedade</small></span></div>
          <span className="assistant-context-badge"><Database size={13} /> contexto ativo</span>
        </header>

        <div className="assistant-chat" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`assistant-message ${message.role}`}>
              {message.role === "assistant" && <span className="assistant-avatar"><Bot size={17} /></span>}
              <div className="assistant-bubble">
                <p>{message.text}</p>
                {message.role === "assistant" && <small>{message.mode === "ai" ? "IA Hydra · análise contextual" : "Hydra · análise dos registros"}</small>}
              </div>
            </article>
          ))}
          {busy && <article className="assistant-message assistant"><span className="assistant-avatar is-thinking"><LoaderCircle size={17} className="spin" /></span><div className="assistant-bubble assistant-thinking"><span /><span /><span /></div></article>}
          <div ref={chatEndRef} />
        </div>

        <form className="assistant-composer" onSubmit={submit}>
          <div className="assistant-composer-field">
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte qualquer coisa sobre a propriedade…" maxLength={600} rows={2} />
            <small>{question.length}/600</small>
          </div>
          <button type="submit" disabled={busy || !question.trim()} aria-label="Enviar pergunta"><Send size={19} /></button>
        </form>
      </section>

      <div className="assistant-data-strip">
        <span><Cow size={15} /> {context.herd.identified}/{context.herd.total} com NFC</span>
        <span><Droplets size={15} /> {context.water.amount30Days.toLocaleString("pt-BR")} L / 30d</span>
        <span><ClipboardCheck size={15} /> {context.activities.overdue} atrasadas</span>
        <span><RadioTower size={15} /> {context.monitoring.withOccurrence} ocorrências</span>
      </div>

      <div className="assistant-boundaries">
        <ShieldCheck size={18} />
        <p><strong>Assistente de gestão, com limites claros</strong><small>Usa os registros do Hydra Agro para organização e priorização. Não substitui veterinário, agrônomo ou outro profissional e não fornece diagnóstico, medicação ou dosagem.</small></p>
      </div>
    </div>
  );
}
