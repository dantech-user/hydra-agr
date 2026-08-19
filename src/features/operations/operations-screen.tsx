import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Preferences } from "@capacitor/preferences";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, HeartPulse, Nfc, Plus, UsersRound } from "lucide-react";
import { showAppToast } from "../../components/modal-system";
import { Modal } from "../../components/ui";
import { makeId, type HydraAccount, type UpdateAccount } from "../../lib/hydra-types";
import "./operations-screen.css";

type Props = { account: HydraAccount; updateAccount: UpdateAccount; onBack: () => void; openNfc: () => void };
type Section = "today" | "staff" | "reports" | "occurrences" | "tasks";
type StaffRole = "Funcionário" | "Gerente";
type StaffMember = { id: string; name: string; role: StaffRole; area: string; active: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const staffKey = (id: string) => `hydra.operations.staff.${id}`;
const tagged = (prefix: string, text?: string) => text?.startsWith(`${prefix}|`) ?? false;
const encode = (prefix: string, parts: Record<string, string>) => `${prefix}|${Object.entries(parts).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("|")}`;
const decode = (value?: string) => Object.fromEntries((value || "").split("|").slice(1).map((part) => { const at = part.indexOf("="); return at < 0 ? [part, ""] : [part.slice(0, at), decodeURIComponent(part.slice(at + 1))]; }));

export function OperationsScreen({ account, updateAccount, onBack, openNfc }: Props) {
  const [section, setSection] = useState<Section>("today");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [occurrenceOpen, setOccurrenceOpen] = useState(false);

  useEffect(() => { void Preferences.get({ key: staffKey(account.id) }).then(({ value }) => { if (value) { try { setStaff(JSON.parse(value) as StaffMember[]); } catch { setStaff([]); } } }); }, [account.id]);
  async function saveStaff(next: StaffMember[]) { setStaff(next); await Preferences.set({ key: staffKey(account.id), value: JSON.stringify(next) }); }

  const tasks = useMemo(() => account.activities.filter((item) => tagged("HYDRA_TASK", item.note)), [account.activities]);
  const reports = useMemo(() => account.monitoring.filter((item) => tagged("HYDRA_REPORT", item.note)), [account.monitoring]);
  const occurrences = useMemo(() => account.monitoring.filter((item) => tagged("HYDRA_OCCURRENCE", item.note)), [account.monitoring]);
  const openTasks = tasks.filter((item) => !item.done);
  const todayReports = reports.filter((item) => item.date === today());
  const urgent = occurrences.filter((item) => decode(item.note).priority === "Urgente");

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); if (!name) return;
    await saveStaff([...staff, { id: makeId("staff"), name, role: String(data.get("role")) as StaffRole, area: String(data.get("area") || "Geral"), active: true }]); setStaffOpen(false); showAppToast("Funcionário adicionado");
  }
  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const assignee = String(data.get("assignee") || "Equipe"); const priority = String(data.get("priority") || "Normal");
    await updateAccount((current) => ({ ...current, activities: [{ id: makeId("task"), title: String(data.get("title") || "Tarefa"), category: "Tarefa da equipe", date: String(data.get("date") || today()), animalId: String(data.get("animalId") || "") || undefined, note: encode("HYDRA_TASK", { assignee, priority }), done: false }, ...current.activities] }), { requireRemote: true }); setTaskOpen(false); showAppToast("Tarefa criada");
  }
  async function addReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const employee = String(data.get("employee") || account.profile.name); const summary = String(data.get("summary") || "").trim();
    await updateAccount((current) => ({ ...current, monitoring: [{ id: makeId("report"), date: today(), type: "Relatório diário", note: encode("HYDRA_REPORT", { employee, summary, pending: String(data.get("pending") || ""), water: String(data.get("water") || "Normal"), feeding: String(data.get("feeding") || "Normal") }) }, ...current.monitoring] }), { requireRemote: true }); setReportOpen(false); showAppToast("Relatório do dia enviado");
  }
  async function addOccurrence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const animalId = String(data.get("animalId") || ""); const description = String(data.get("description") || "").trim(); const category = String(data.get("category") || "Outro"); const priority = String(data.get("priority") || "Atenção"); const employee = String(data.get("employee") || account.profile.name);
    await updateAccount((current) => ({ ...current, monitoring: [{ id: makeId("occ"), date: today(), type: "Ocorrência", occurrence: description, note: encode("HYDRA_OCCURRENCE", { employee, category, priority, animalId, status: "Aberta" }) }, ...current.monitoring], animals: animalId ? current.animals.map((animal) => animal.id === animalId ? { ...animal, history: [{ id: makeId("history"), date: today(), type: `Ocorrência · ${category}`, description }, ...(animal.history || [])] } : animal) : current.animals }), { requireRemote: true }); setOccurrenceOpen(false); showAppToast("Ocorrência registrada");
  }
  async function toggleTask(id: string) { await updateAccount((current) => ({ ...current, activities: current.activities.map((item) => item.id === id ? { ...item, done: !item.done } : item) }), { requireRemote: true }); }

  return <div className="screen operations-screen page-enter">
    <header className="operations-header"><button className="icon-button" onClick={onBack}><ArrowLeft size={21} /></button><div><span className="eyebrow">GESTÃO DA PROPRIEDADE</span><h1>Equipe e operações</h1><p>Funcionários, relatórios, ocorrências e tarefas da propriedade em um só lugar.</p></div></header>
    <div className="operations-tabs">{([['today','Hoje'],['staff','Funcionários'],['reports','Relatórios'],['occurrences','Ocorrências'],['tasks','Tarefas']] as [Section,string][]).map(([id,label]) => <button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}</div>

    {section === "today" && <><section className="operations-summary"><div><UsersRound/><span>Equipe</span><strong>{staff.filter(s=>s.active).length}</strong></div><div><ClipboardCheck/><span>Relatórios hoje</span><strong>{todayReports.length}</strong></div><div><AlertTriangle/><span>Ocorrências urgentes</span><strong>{urgent.length}</strong></div><div><CheckCircle2/><span>Tarefas pendentes</span><strong>{openTasks.length}</strong></div></section><section className="operations-actions"><button onClick={()=>setReportOpen(true)}><ClipboardCheck/><strong>Relatório do dia</strong><small>Registrar o trabalho realizado</small></button><button onClick={()=>setOccurrenceOpen(true)}><HeartPulse/><strong>Registrar ocorrência</strong><small>Animal, água, estrutura ou equipamento</small></button><button onClick={openNfc}><Nfc/><strong>Ler NFC/RFID</strong><small>Identificar um animal rapidamente</small></button><button onClick={()=>setTaskOpen(true)}><Plus/><strong>Nova tarefa</strong><small>Atribuir uma atividade à equipe</small></button></section></>}

    {section === "staff" && <section className="operations-panel"><div className="operations-title"><div><span className="eyebrow">EQUIPE</span><h2>Funcionários</h2></div><button className="primary-button compact" onClick={()=>setStaffOpen(true)}><Plus size={17}/> Adicionar</button></div>{staff.length===0?<p className="operations-empty">Nenhum funcionário cadastrado neste dispositivo.</p>:<div className="operations-list">{staff.map(member=><article key={member.id}><span className="staff-avatar">{member.name.slice(0,2).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.role} · {member.area}</small></div><b>{member.active?'Ativo':'Inativo'}</b></article>)}</div>}</section>}

    {section === "reports" && <section className="operations-panel"><div className="operations-title"><div><span className="eyebrow">ROTINA</span><h2>Relatórios enviados</h2></div><button className="primary-button compact" onClick={()=>setReportOpen(true)}><Plus size={17}/> Novo</button></div><div className="operations-list">{reports.map(report=>{const meta=decode(report.note);return <article key={report.id}><ClipboardCheck/><div><strong>{meta.employee||'Equipe'}</strong><small>{report.date} · {meta.summary||'Sem resumo'}</small></div></article>})}{reports.length===0&&<p className="operations-empty">Nenhum relatório enviado ainda.</p>}</div></section>}

    {section === "occurrences" && <section className="operations-panel"><div className="operations-title"><div><span className="eyebrow">ATENÇÃO</span><h2>Ocorrências</h2></div><button className="primary-button compact" onClick={()=>setOccurrenceOpen(true)}><Plus size={17}/> Registrar</button></div><div className="operations-list">{occurrences.map(item=>{const meta=decode(item.note);const animal=account.animals.find(a=>a.id===meta.animalId);return <article key={item.id}><AlertTriangle/><div><strong>{meta.category}{animal?` · ${animal.name||animal.identification}`:''}</strong><small>{item.occurrence} · {meta.employee}</small></div><b className={`priority-${meta.priority?.toLowerCase()}`}>{meta.priority}</b></article>})}{occurrences.length===0&&<p className="operations-empty">Nenhuma ocorrência registrada.</p>}</div></section>}

    {section === "tasks" && <section className="operations-panel"><div className="operations-title"><div><span className="eyebrow">ORGANIZAÇÃO</span><h2>Tarefas da equipe</h2></div><button className="primary-button compact" onClick={()=>setTaskOpen(true)}><Plus size={17}/> Criar</button></div><div className="operations-list">{tasks.map(item=>{const meta=decode(item.note);return <article key={item.id} className={item.done?'is-done':''}><button className="task-check" onClick={()=>void toggleTask(item.id)}>{item.done?<CheckCircle2/>:null}</button><div><strong>{item.title}</strong><small>{meta.assignee} · {item.date}</small></div><b>{meta.priority}</b></article>})}{tasks.length===0&&<p className="operations-empty">Nenhuma tarefa criada.</p>}</div></section>}

    <Modal open={staffOpen} onClose={()=>setStaffOpen(false)} title="Adicionar funcionário"><form className="operations-form" onSubmit={addStaff}><label>Nome<input name="name" required /></label><label>Função<select name="role"><option>Funcionário</option><option>Gerente</option></select></label><label>Área principal<input name="area" placeholder="Ex.: Rebanho, irrigação" /></label><button className="primary-button" type="submit">Salvar funcionário</button></form></Modal>
    <Modal open={taskOpen} onClose={()=>setTaskOpen(false)} title="Nova tarefa"><form className="operations-form" onSubmit={addTask}><label>Tarefa<input name="title" required placeholder="Ex.: verificar bebedouro" /></label><label>Responsável<select name="assignee"><option>Equipe</option>{staff.map(s=><option key={s.id}>{s.name}</option>)}</select></label><label>Data<input name="date" type="date" defaultValue={today()} /></label><label>Prioridade<select name="priority"><option>Normal</option><option>Atenção</option><option>Urgente</option></select></label><label>Animal relacionado<select name="animalId"><option value="">Nenhum</option>{account.animals.map(a=><option value={a.id} key={a.id}>{a.name||a.identification}</option>)}</select></label><button className="primary-button" type="submit">Criar tarefa</button></form></Modal>
    <Modal open={reportOpen} onClose={()=>setReportOpen(false)} title="Relatório do dia"><form className="operations-form" onSubmit={addReport}><label>Funcionário<select name="employee"><option>{account.profile.name}</option>{staff.map(s=><option key={s.id}>{s.name}</option>)}</select></label><label>Resumo<textarea name="summary" required placeholder="O que foi feito hoje?" /></label><label>Alimentação<select name="feeding"><option>Normal</option><option>Precisa de atenção</option><option>Faltou alimento</option></select></label><label>Água<select name="water"><option>Normal</option><option>Precisa de atenção</option><option>Possível vazamento</option><option>Faltou água</option></select></label><label>Pendências<textarea name="pending" placeholder="O que ficou para depois?" /></label><button className="primary-button" type="submit">Enviar relatório</button></form></Modal>
    <Modal open={occurrenceOpen} onClose={()=>setOccurrenceOpen(false)} title="Registrar ocorrência"><form className="operations-form" onSubmit={addOccurrence}><label>Funcionário<select name="employee"><option>{account.profile.name}</option>{staff.map(s=><option key={s.id}>{s.name}</option>)}</select></label><label>Categoria<select name="category"><option>Animal</option><option>Alimentação</option><option>Água</option><option>Estrutura</option><option>Equipamento</option><option>Outro</option></select></label><label>Prioridade<select name="priority"><option>Normal</option><option>Atenção</option><option>Urgente</option></select></label><label>Animal relacionado<select name="animalId"><option value="">Nenhum</option>{account.animals.map(a=><option key={a.id} value={a.id}>{a.name||a.identification} · {a.identification}</option>)}</select></label><label>O que foi observado?<textarea name="description" required placeholder="Descreva apenas o que foi observado, sem fazer diagnóstico." /></label><button className="primary-button" type="submit">Salvar ocorrência</button></form></Modal>
  </div>;
}
