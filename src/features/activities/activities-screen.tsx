"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronRight, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog, EmptyState, Field, Modal, ScreenHeader } from "../../components/ui";
import { makeId, type Activity, type HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  onBack: () => void;
  createRequest?: number;
  onRequestHandled?: () => void;
};

export function ActivitiesScreen({ account, updateAccount, onBack, createRequest, onRequestHandled }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState({ title: "", category: "Manejo", customCategory: "", date: new Date().toISOString().slice(0, 10), sectorId: "", animalId: "", note: "" });
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Informe o título da atividade.");
      return;
    }
    const category = form.category === "Personalizada" ? form.customCategory.trim() : form.category;
    if (!category) {
      setError("Informe a categoria personalizada.");
      return;
    }
    const next = { id: editingId ?? makeId("activity"), title: form.title.trim(), category, date: form.date, sectorId: form.sectorId || undefined, animalId: form.animalId || undefined, note: form.note.trim() || undefined, done: editingId ? account.activities.find((item) => item.id === editingId)?.done ?? false : false };
    updateAccount((current) => ({ ...current, activities: editingId ? current.activities.map((item) => item.id === editingId ? next : item) : [next, ...current.activities] }));
    setForm({ title: "", category: "Manejo", customCategory: "", date: new Date().toISOString().slice(0, 10), sectorId: "", animalId: "", note: "" });
    setError("");
    setEditingId(undefined);
    setOpen(false);
  }

  function toggle(item: Activity) {
    updateAccount((current) => ({ ...current, activities: current.activities.map((activity) => activity.id === item.id ? { ...activity, done: !activity.done } : activity) }));
  }

  function remove(item: Activity) {
    updateAccount((current) => ({ ...current, activities: current.activities.filter((activity) => activity.id !== item.id) }));
    setSelected(null);
    setDeleteTarget(null);
  }

  function openCreate() {
    setEditingId(undefined);
    setForm({ title: "", category: "Manejo", customCategory: "", date: new Date().toISOString().slice(0, 10), sectorId: "", animalId: "", note: "" });
    setOpen(true);
  }

  useEffect(() => { if (createRequest !== undefined) { openCreate(); onRequestHandled?.(); } }, [createRequest]);

  function openEdit(item: Activity) {
    const initialCategories = ['Alimentação', 'Manejo', 'Vacinação', 'Irrigação', 'Plantio', 'Colheita', 'Inspeção', 'Manutenção'];
    const known = initialCategories.includes(item.category);
    setEditingId(item.id);
    setForm({ title: item.title, category: known ? item.category : "Personalizada", customCategory: known ? "" : item.category, date: item.date, sectorId: item.sectorId ?? "", animalId: item.animalId ?? "", note: item.note ?? "" });
    setSelected(null);
    setOpen(true);
  }

  return (
    <div className="screen page-enter extra-screen">
      <ScreenHeader eyebrow="ROTINA RURAL" title="Atividades" subtitle="Manejo, produção, irrigação e manutenção." onBack={onBack} action={<button className="icon-button accent" onClick={openCreate} aria-label="Nova atividade"><Plus size={21} /></button>} />

      <div className="activity-summary"><div><ClipboardCheck size={22} /><span><strong>{account.activities.filter((item) => !item.done).length}</strong><small>pendentes</small></span></div><div><Check size={22} /><span><strong>{account.activities.filter((item) => item.done).length}</strong><small>concluídas</small></span></div></div>

      {account.activities.length === 0 ? (
        <EmptyState icon={<CalendarDays size={27} />} title="Nenhuma atividade registrada" text="Organize a rotina sem criar tarefas fictícias." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Nova atividade</button>} />
      ) : (
        <div className="activity-list">
          {account.activities.map((item) => (
            <div className={`activity-card ${item.done ? "done" : ""}`} key={item.id}>
              <button className="activity-check" onClick={() => toggle(item)} aria-label={item.done ? "Marcar como pendente" : "Concluir atividade"}>{item.done && <Check size={17} />}</button>
              <button className="activity-main" onClick={() => setSelected(item)}><small>{item.category} · {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</small><strong>{item.title}</strong><span>{item.note || "Sem observações"}</span></button>
              <ChevronRight size={18} />
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(undefined); setError(""); }} eyebrow={editingId ? "EDIÇÃO" : "NOVA ATIVIDADE"} title={editingId ? "Editar atividade" : "Registrar atividade"}>
        <form className="modal-form" onSubmit={save}>
          <Field label="Título"><input value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(""); }} placeholder="Ex.: Vacinar lote do Pasto 1" autoFocus /></Field>
          <div className="field-combo">
            <Field label="Categoria"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['Alimentação', 'Manejo', 'Vacinação', 'Irrigação', 'Plantio', 'Colheita', 'Inspeção', 'Manutenção', 'Personalizada'].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Data"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          {form.category === "Personalizada" && <Field label="Categoria personalizada"><input value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} placeholder="Nome da categoria" /></Field>}
          <Field label="Setor (opcional)"><select value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value })}><option value="">Toda a propriedade</option>{account.sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Animal (opcional)"><select value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}><option value="">Nenhum animal específico</option>{account.animals.map((item) => <option key={item.id} value={item.id}>{item.name || item.identification}</option>)}</select></Field>
          <Field label="Observação"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Detalhes da atividade" /></Field>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-button" type="submit">{editingId ? "Confirmar alterações" : "Confirmar atividade"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} eyebrow="ATIVIDADE" title={selected?.title || "Detalhes"}>
        {selected && <div className="activity-detail"><span>{selected.category}</span><p>{selected.note || "Sem observações cadastradas."}</p><small>{new Date(`${selected.date}T12:00:00`).toLocaleDateString("pt-BR")}</small><div className="detail-actions"><button className="secondary-button" onClick={() => openEdit(selected)}><Pencil size={17} /> Editar</button><button className="danger-button" onClick={() => setDeleteTarget(selected)}><Trash2 size={17} /> Excluir atividade</button></div></div>}
      </Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Excluir atividade?" text={`A atividade ${deleteTarget?.title || "selecionada"} será removida da rotina e não poderá ser recuperada.`} confirmLabel="Confirmar exclusão" onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) remove(deleteTarget); }} />
    </div>
  );
}
