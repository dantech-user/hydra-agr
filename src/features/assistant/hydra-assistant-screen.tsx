import { Beef as Cow, Bot, ClipboardCheck, Droplets, LoaderCircle, RadioTower, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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
  { label: "O que precisa de atenção hoje?", icon: Sparkles },
  { label: "Analise meu rebanho", icon: Cow },
  { label: "Como está a água?", icon: Droplets },
  { label: "Quais atividades estão pendentes?", icon: ClipboardCheck },
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
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Posso analisar os dados cadastrados de ${account.property.name || "sua propriedade"} e ajudar a definir prioridades. O que você quer verificar?`,
      mode: "local",
    },
  ]);

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
      <ScreenHeader eyebrow="GESTÃO INTELIGENTE" title="Assistente Hydra" subtitle="Sugestões baseadas nos dados da propriedade." onBack={onBack} />

      <section className="assistant-overview">
        <span className="assistant-overview-icon"><Sparkles size={25} /></span>
        <div><strong>Visão rápida da propriedade</strong><small>{context.herd.total} animais · {context.activities.pending} tarefas pendentes · {context.water.records30Days} registros de água em 30 dias</small></div>
        <span className="assistant-live-dot">DADOS REAIS</span>
      </section>

      <div className="assistant-quick-grid">
        {quickQuestions.map(({ label, icon: Icon }) => <button key={label} onClick={() => void ask(label)} disabled={busy}><Icon size={17} /><span>{label}</span></button>)}
      </div>

      <section className="assistant-chat" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`assistant-message ${message.role}`}>
            {message.role === "assistant" && <span className="assistant-avatar"><Bot size={17} /></span>}
            <div>
              <p>{message.text}</p>
              {message.role === "assistant" && <small>{message.mode === "ai" ? "IA Hydra · análise contextual" : "Análise local · dados do aparelho"}</small>}
            </div>
          </article>
        ))}
        {busy && <article className="assistant-message assistant"><span className="assistant-avatar"><LoaderCircle size={17} className="spin" /></span><div><p>Analisando os registros da propriedade…</p></div></article>}
      </section>

      <form className="assistant-composer" onSubmit={submit}>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre rebanho, água, atividades ou monitoramento…" maxLength={600} rows={2} />
        <button type="submit" disabled={busy || !question.trim()} aria-label="Enviar pergunta"><Send size={19} /></button>
      </form>

      <div className="assistant-boundaries">
        <ShieldCheck size={17} />
        <p><strong>Assistente de gestão</strong><small>Ele usa os registros do Hydra Agro para organização e priorização. Não substitui veterinário, agrônomo ou outro profissional e não fornece diagnóstico, medicação ou dosagem.</small></p>
      </div>

      <div className="assistant-data-strip">
        <span><Cow size={15} /> {context.herd.identified}/{context.herd.total} NFC</span>
        <span><Droplets size={15} /> {context.water.amount30Days.toLocaleString("pt-BR")} L / 30d</span>
        <span><ClipboardCheck size={15} /> {context.activities.pending} pendentes</span>
        <span><RadioTower size={15} /> {context.monitoring.last30Days} monitoramentos</span>
      </div>
    </div>
  );
}
