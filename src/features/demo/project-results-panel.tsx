import { BarChart3, CheckCircle2, Clock3, Plus, Trash2, Trophy, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

type ProjectTest = {
  id: string;
  participant?: string;
  manualSeconds: number;
  nfcSeconds: number;
  success: boolean;
  createdAt: string;
};

type Props = {
  userId: string;
};

function storageKey(userId: string) {
  return `hydra-agro.project-tests.${userId || "demo"}`;
}

function readTests(userId: string): ProjectTest[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item &&
      typeof item.id === "string" &&
      Number.isFinite(Number(item.manualSeconds)) &&
      Number(item.manualSeconds) > 0 &&
      Number.isFinite(Number(item.nfcSeconds)) &&
      Number(item.nfcSeconds) > 0,
    ).map((item) => ({
      id: String(item.id),
      participant: typeof item.participant === "string" ? item.participant.slice(0, 40) : undefined,
      manualSeconds: Number(item.manualSeconds),
      nfcSeconds: Number(item.nfcSeconds),
      success: item.success !== false,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function saveTests(userId: string, tests: ProjectTest[]) {
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify(tests)); } catch { /* armazenamento indisponível */ }
}

function seconds(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1).replace(".", ",")} s`;
}

export function ProjectResultsPanel({ userId }: Props) {
  const [tests, setTests] = useState<ProjectTest[]>(() => readTests(userId));
  const [formOpen, setFormOpen] = useState(false);
  const [participant, setParticipant] = useState("");
  const [manual, setManual] = useState("");
  const [nfc, setNfc] = useState("");
  const [success, setSuccess] = useState(true);
  const [error, setError] = useState("");

  const metrics = useMemo(() => {
    if (tests.length === 0) return { avgManual: 0, avgNfc: 0, savedPercent: 0, successRate: 0, totalSaved: 0 };
    const avgManual = tests.reduce((sum, item) => sum + item.manualSeconds, 0) / tests.length;
    const avgNfc = tests.reduce((sum, item) => sum + item.nfcSeconds, 0) / tests.length;
    const savedPercent = avgManual > 0 ? Math.max(0, ((avgManual - avgNfc) / avgManual) * 100) : 0;
    const successRate = (tests.filter((item) => item.success).length / tests.length) * 100;
    const totalSaved = tests.reduce((sum, item) => sum + Math.max(0, item.manualSeconds - item.nfcSeconds), 0);
    return { avgManual, avgNfc, savedPercent, successRate, totalSaved };
  }, [tests]);

  function persist(next: ProjectTest[]) {
    setTests(next);
    saveTests(userId, next);
  }

  function addTest(event: FormEvent) {
    event.preventDefault();
    const manualSeconds = Number(manual.replace(",", "."));
    const nfcSeconds = Number(nfc.replace(",", "."));
    if (!Number.isFinite(manualSeconds) || manualSeconds <= 0 || !Number.isFinite(nfcSeconds) || nfcSeconds <= 0) {
      setError("Informe os dois tempos em segundos usando valores maiores que zero.");
      return;
    }
    if (manualSeconds > 3600 || nfcSeconds > 3600) {
      setError("Confira os tempos informados. O limite por teste é de 3600 segundos.");
      return;
    }

    const next: ProjectTest[] = [{
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      participant: participant.trim().slice(0, 40) || undefined,
      manualSeconds,
      nfcSeconds,
      success,
      createdAt: new Date().toISOString(),
    }, ...tests];
    persist(next);
    setParticipant("");
    setManual("");
    setNfc("");
    setSuccess(true);
    setError("");
    setFormOpen(false);
  }

  function removeTest(id: string) {
    persist(tests.filter((item) => item.id !== id));
  }

  return (
    <section className="project-results-card" aria-label="Resultados reais do projeto">
      <header className="project-results-head">
        <div><span>RESULTADOS DO PROJETO</span><strong>Impacto medido nos testes</strong><small>Nenhum número é preenchido automaticamente: registre somente testes que vocês realmente fizeram.</small></div>
        <button onClick={() => { setFormOpen((value) => !value); setError(""); }}><Plus size={16} /> Teste</button>
      </header>

      {tests.length === 0 ? (
        <div className="project-results-empty"><BarChart3 size={24} /><span><strong>Ainda não há resultados</strong><small>Cronometre a localização de uma ficha manualmente e depois com NFC. Registre os dois tempos aqui.</small></span></div>
      ) : (
        <>
          <div className="project-results-metrics">
            <div><span><Trophy size={17} /></span><strong>{tests.length}</strong><small>testes reais</small></div>
            <div><span><Clock3 size={17} /></span><strong>{Math.round(metrics.savedPercent)}%</strong><small>menos tempo</small></div>
            <div><span><CheckCircle2 size={17} /></span><strong>{Math.round(metrics.successRate)}%</strong><small>taxa de sucesso</small></div>
          </div>

          <div className="project-time-compare">
            <div className="project-time-label"><span>Tempo médio para localizar a ficha</span><strong>{seconds(metrics.avgManual)} → {seconds(metrics.avgNfc)}</strong></div>
            <div className="project-time-bars" aria-label="Comparação de tempo médio manual e NFC">
              <div><span>Manual</span><i style={{ width: "100%" }} /><b>{seconds(metrics.avgManual)}</b></div>
              <div><span>NFC</span><i style={{ width: `${Math.max(8, Math.min(100, metrics.avgManual ? (metrics.avgNfc / metrics.avgManual) * 100 : 0))}%` }} /><b>{seconds(metrics.avgNfc)}</b></div>
            </div>
            <small>Nos {tests.length} teste(s), foram economizados {seconds(metrics.totalSaved)} no total em comparação com o processo manual registrado.</small>
          </div>
        </>
      )}

      {formOpen && (
        <form className="project-test-form" onSubmit={addTest}>
          <div className="project-test-form-title"><div><strong>Registrar teste real</strong><small>Use um cronômetro e anote os tempos observados.</small></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><XCircle size={18} /></button></div>
          <label><span>Participante (opcional)</span><input value={participant} onChange={(event) => setParticipant(event.target.value)} placeholder="Ex.: Pessoa 1" maxLength={40} /></label>
          <div className="project-test-times">
            <label><span>Manual (segundos)</span><input inputMode="decimal" value={manual} onChange={(event) => { setManual(event.target.value); setError(""); }} placeholder="Ex.: 28" /></label>
            <label><span>Com NFC (segundos)</span><input inputMode="decimal" value={nfc} onChange={(event) => { setNfc(event.target.value); setError(""); }} placeholder="Ex.: 4" /></label>
          </div>
          <div className="project-test-success"><span>O teste com NFC encontrou a ficha corretamente?</span><button type="button" className={success ? "active" : ""} onClick={() => setSuccess(true)}><CheckCircle2 size={16} /> Sim</button><button type="button" className={!success ? "active fail" : ""} onClick={() => setSuccess(false)}><XCircle size={16} /> Não</button></div>
          {error && <p className="project-test-error" role="alert">{error}</p>}
          <button className="project-test-save" type="submit">Salvar resultado real</button>
        </form>
      )}

      {tests.length > 0 && (
        <div className="project-test-history">
          <strong>Últimos testes</strong>
          {tests.slice(0, 5).map((item, index) => <div key={item.id}><span className={item.success ? "success" : "fail"}>{item.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}</span><p><strong>{item.participant || `Teste ${tests.length - index}`}</strong><small>Manual {seconds(item.manualSeconds)} · NFC {seconds(item.nfcSeconds)} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</small></p><button onClick={() => removeTest(item.id)} aria-label="Excluir teste"><Trash2 size={15} /></button></div>)}
        </div>
      )}

      <p className="project-results-note">Os resultados ficam salvos neste aparelho e servem como registro da validação do protótipo. Não use números inventados na apresentação.</p>
    </section>
  );
}
