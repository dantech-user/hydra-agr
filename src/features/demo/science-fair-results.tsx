import { BarChart3, CheckCircle2, ClipboardCopy, Plus, Timer, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { showAppToast } from "../../components/modal-system";

type FairTest = {
  id: string;
  participant: string;
  date: string;
  manualSeconds: number;
  nfcSeconds: number;
  success: boolean;
  note?: string;
};

type Draft = {
  participant: string;
  manualSeconds: string;
  nfcSeconds: string;
  success: boolean;
  note: string;
};

const emptyDraft: Draft = { participant: "", manualSeconds: "", nfcSeconds: "", success: true, note: "" };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readTests(key: string): FairTest[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as FairTest[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.manualSeconds === "number" && typeof item.nfcSeconds === "number") : [];
  } catch {
    return [];
  }
}

export function ScienceFairResults({ userId }: { userId: string }) {
  const storageKey = `hydra-agro.science-fair-tests.${userId || "local"}`;
  const [tests, setTests] = useState<FairTest[]>(() => readTests(storageKey));
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    setTests(readTests(storageKey));
  }, [storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(tests)); } catch { /* armazenamento indisponível */ }
  }, [storageKey, tests]);

  const metrics = useMemo(() => {
    if (tests.length === 0) return { avgManual: 0, avgNfc: 0, saved: 0, improvement: 0, successRate: 0 };
    const avgManual = tests.reduce((sum, item) => sum + item.manualSeconds, 0) / tests.length;
    const avgNfc = tests.reduce((sum, item) => sum + item.nfcSeconds, 0) / tests.length;
    const saved = avgManual - avgNfc;
    const improvement = avgManual > 0 ? (saved / avgManual) * 100 : 0;
    const successRate = (tests.filter((item) => item.success).length / tests.length) * 100;
    return { avgManual, avgNfc, saved, improvement, successRate };
  }, [tests]);

  function addTest(event: FormEvent) {
    event.preventDefault();
    const manualSeconds = Number(draft.manualSeconds.replace(",", "."));
    const nfcSeconds = Number(draft.nfcSeconds.replace(",", "."));
    if (!Number.isFinite(manualSeconds) || manualSeconds <= 0 || !Number.isFinite(nfcSeconds) || nfcSeconds <= 0) {
      setError("Informe tempos válidos maiores que zero.");
      return;
    }
    const participant = draft.participant.trim() || `Teste ${String(tests.length + 1).padStart(2, "0")}`;
    const item: FairTest = {
      id: makeId(),
      participant: participant.slice(0, 32),
      date: new Date().toISOString(),
      manualSeconds,
      nfcSeconds,
      success: draft.success,
      note: draft.note.trim().slice(0, 120) || undefined,
    };
    setTests((current) => [item, ...current]);
    setDraft(emptyDraft);
    setError("");
    setFormOpen(false);
    showAppToast("Teste real adicionado aos resultados");
  }

  function removeTest(id: string) {
    setTests((current) => current.filter((item) => item.id !== id));
  }

  async function copySummary() {
    if (tests.length === 0) return;
    const text = [
      "Resultados dos testes do Hydra Agro",
      `Participantes/testes: ${tests.length}`,
      `Tempo médio sem NFC: ${metrics.avgManual.toFixed(1)} s`,
      `Tempo médio com NFC: ${metrics.avgNfc.toFixed(1)} s`,
      `Redução média de tempo: ${Math.max(0, metrics.improvement).toFixed(1)}%`,
      `Taxa de sucesso: ${metrics.successRate.toFixed(0)}%`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showAppToast("Resumo dos resultados copiado");
    } catch {
      showAppToast("Não foi possível copiar o resumo.", "error");
    }
  }

  return (
    <section className="fair-results-card">
      <header className="fair-results-header">
        <div><span>RESULTADOS DO PROJETO</span><strong>Validação com testes reais</strong><small>Nenhum número é criado automaticamente: só entram medições registradas por vocês.</small></div>
        <BarChart3 size={22} />
      </header>

      {tests.length === 0 ? (
        <div className="fair-results-empty">
          <Timer size={24} />
          <div><strong>Ainda sem resultados</strong><small>Cronometre a mesma tarefa sem NFC e depois com NFC. Registre os dois tempos aqui.</small></div>
        </div>
      ) : (
        <>
          <div className="fair-results-metrics">
            <div><Timer size={16} /><span>Sem NFC</span><strong>{metrics.avgManual.toFixed(1)} s</strong></div>
            <div><Timer size={16} /><span>Com NFC</span><strong>{metrics.avgNfc.toFixed(1)} s</strong></div>
            <div><BarChart3 size={16} /><span>Tempo reduzido</span><strong>{Math.max(0, metrics.improvement).toFixed(0)}%</strong></div>
            <div><CheckCircle2 size={16} /><span>Taxa de sucesso</span><strong>{metrics.successRate.toFixed(0)}%</strong></div>
          </div>

          <div className="fair-results-compare" aria-label="Comparação visual do tempo médio">
            <div><span>Sem NFC</span><i><b style={{ width: "100%" }} /></i><strong>{metrics.avgManual.toFixed(1)}s</strong></div>
            <div><span>Com NFC</span><i><b style={{ width: `${Math.max(8, Math.min(100, metrics.avgManual > 0 ? (metrics.avgNfc / metrics.avgManual) * 100 : 0))}%` }} /></i><strong>{metrics.avgNfc.toFixed(1)}s</strong></div>
          </div>

          <div className="fair-results-list">
            {tests.slice(0, 5).map((item) => (
              <div key={item.id} className="fair-result-row">
                <span className={item.success ? "success" : "attention"}>{item.success ? <CheckCircle2 size={16} /> : <Users size={16} />}</span>
                <div><strong>{item.participant}</strong><small>{item.manualSeconds}s sem NFC → {item.nfcSeconds}s com NFC{item.note ? ` · ${item.note}` : ""}</small></div>
                <button onClick={() => removeTest(item.id)} aria-label={`Excluir ${item.participant}`}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {formOpen && (
        <form className="fair-test-form" onSubmit={addTest}>
          <div className="fair-test-grid">
            <label><span>Identificação do teste</span><input value={draft.participant} onChange={(event) => setDraft({ ...draft, participant: event.target.value })} placeholder={`Teste ${String(tests.length + 1).padStart(2, "0")}`} /></label>
            <label><span>Sem NFC (segundos)</span><input inputMode="decimal" value={draft.manualSeconds} onChange={(event) => { setDraft({ ...draft, manualSeconds: event.target.value }); setError(""); }} placeholder="Ex.: 28" /></label>
            <label><span>Com NFC (segundos)</span><input inputMode="decimal" value={draft.nfcSeconds} onChange={(event) => { setDraft({ ...draft, nfcSeconds: event.target.value }); setError(""); }} placeholder="Ex.: 6" /></label>
            <label><span>Observação</span><input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Opcional" /></label>
          </div>
          <label className="fair-success-toggle"><input type="checkbox" checked={draft.success} onChange={(event) => setDraft({ ...draft, success: event.target.checked })} /><span><strong>Tarefa concluída com sucesso</strong><small>Marque apenas se a pessoa conseguiu terminar o teste.</small></span></label>
          {error && <p className="fair-test-error">{error}</p>}
          <div className="fair-test-actions"><button type="button" onClick={() => { setFormOpen(false); setError(""); }}>Cancelar</button><button type="submit"><Plus size={16} /> Salvar teste</button></div>
        </form>
      )}

      <div className="fair-results-actions">
        <button onClick={() => setFormOpen((value) => !value)}><Plus size={16} /> Registrar teste</button>
        {tests.length > 0 && <button onClick={() => void copySummary()}><ClipboardCopy size={16} /> Copiar resumo</button>}
      </div>
      <p className="fair-results-footnote">Os resultados ficam salvos neste aparelho. Use sempre medições reais para apresentar à banca.</p>
    </section>
  );
}
