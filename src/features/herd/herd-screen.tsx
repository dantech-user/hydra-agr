import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, Camera, ChevronRight, Beef as Cow, Filter, History, LoaderCircle, Nfc, Pencil, Plus, Search, Trash2, Weight } from "lucide-react";
import { ConfirmDialog, EmptyState, Field, Modal, ScreenHeader } from "../../components/ui";
import { makeId, type Animal, type HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  openNfc: (animalId?: string) => void;
  focusAnimalId?: string;
  createRequest?: number;
  onRequestHandled?: () => void;
  saveAnimalPhoto: (animalId: string, file?: File) => Promise<boolean>;
};

const blankAnimal = { identification: "", name: "", species: "Bovino", breed: "", sex: "", birthDate: "", weight: "", status: "Ativo", electronicId: "", notes: "" };

function formFromAnimal(animal: Animal) {
  return { identification: animal.identification, name: animal.name || "", species: animal.species, breed: animal.breed || "", sex: animal.sex || "", birthDate: animal.birthDate || "", weight: animal.weight?.toString() || "", status: animal.status, electronicId: animal.electronicId || "", notes: animal.notes || "" };
}

export function HerdScreen({ account, updateAccount, openNfc, focusAnimalId, saveAnimalPhoto, createRequest, onRequestHandled }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [animal, setAnimal] = useState(blankAnimal);
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Animal | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const selected = account.animals.find((item) => item.id === selectedId) ?? null;

  useEffect(() => { if (focusAnimalId) setSelectedId(focusAnimalId); }, [focusAnimalId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return account.animals.filter((item) => {
      const matchesSearch = !term || [item.identification, item.name, item.species, item.breed, item.electronicId].filter(Boolean).some((value) => value!.toLocaleLowerCase("pt-BR").includes(term));
      const matchesFilter = filter === "Todos" || item.species === filter || (filter === "Identificados" && Boolean(item.electronicId));
      return matchesSearch && matchesFilter;
    });
  }, [account.animals, filter, search]);

  function openCreate() {
    setEditingId(undefined);
    setAnimal(blankAnimal);
    setError("");
    setFormOpen(true);
  }

  useEffect(() => { if (createRequest !== undefined) { openCreate(); onRequestHandled?.(); } }, [createRequest]);

  function openEdit(item: Animal) {
    setEditingId(item.id);
    setAnimal(formFromAnimal(item));
    setError("");
    setSelectedId(undefined);
    setFormOpen(true);
  }

  function saveAnimal(event: FormEvent) {
    event.preventDefault();
    if (!animal.identification.trim()) {
      setError("Informe a identificação do animal.");
      return;
    }
    const duplicate = account.animals.some((item) => item.id !== editingId && item.identification.toLowerCase() === animal.identification.trim().toLowerCase());
    if (duplicate) {
      setError("Já existe um animal com esta identificação.");
      return;
    }
    const duplicateTag = animal.electronicId.trim() && account.animals.some((item) => item.id !== editingId && item.electronicId?.toLowerCase() === animal.electronicId.trim().toLowerCase());
    if (duplicateTag) {
      setError("Esta identificação eletrônica já está vinculada a outro animal.");
      return;
    }
    const weight = animal.weight ? Number(animal.weight.replace(",", ".")) : undefined;
    const item: Animal = {
      id: editingId ?? makeId("animal"), identification: animal.identification.trim(), name: animal.name.trim() || undefined, species: animal.species, breed: animal.breed.trim() || undefined, sex: animal.sex || undefined, birthDate: animal.birthDate || undefined, weight: Number.isFinite(weight) ? weight : undefined, status: animal.status, electronicId: animal.electronicId.trim() || undefined, notes: animal.notes.trim() || undefined,
    };
    updateAccount((current) => {
      if (!editingId) return { ...current, animals: [{ ...item, history: [{ id: makeId("history"), date: new Date().toISOString(), type: "Cadastro", description: "Ficha criada no Hydra Agro" }] }, ...current.animals] };
      return { ...current, animals: current.animals.map((existing) => existing.id === editingId ? { ...existing, ...item, history: [...(existing.history ?? []), { id: makeId("history"), date: new Date().toISOString(), type: "Edição", description: "Dados da ficha atualizados" }] } : existing) };
    });
    setAnimal(blankAnimal);
    setError("");
    setEditingId(undefined);
    setFormOpen(false);
  }

  function removeAnimal(item: Animal) {
    updateAccount((current) => ({ ...current, animals: current.animals.filter((animalItem) => animalItem.id !== item.id), activities: current.activities.map((activity) => activity.animalId === item.id ? { ...activity, animalId: undefined } : activity) }));
    setSelectedId(undefined);
    setDeleteTarget(null);
  }

  async function setPhoto(file?: File) {
    if (!selected) return;
    setPhotoBusy(true);
    setError("");
    try { await saveAnimalPhoto(selected.id, file); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar a foto."); }
    finally { setPhotoBusy(false); if (photoRef.current) photoRef.current.value = ""; }
  }

  return (
    <div className="screen page-enter">
      <ScreenHeader eyebrow="GESTÃO ANIMAL" title="Rebanho" subtitle={account.animals.length === 1 ? "1 animal cadastrado" : `${account.animals.length} animais cadastrados`} action={<button className="icon-button accent" onClick={openCreate} aria-label="Cadastrar animal"><Plus size={21} /></button>} />

      <div className="search-row"><label className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, código, raça ou tag" /></label><button className={`filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((value) => !value)} aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}><Filter size={19} /></button></div>
      {filtersOpen && <div className="filter-chips">{["Todos", "Bovino", "Caprino", "Ovino", "Equino", "Identificados"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>}

      <button className="nfc-inline-card" onClick={() => openNfc()}><span><Nfc size={23} /></span><div><strong>Localizar por NFC/RFID</strong><small>Aproxime uma tag compatível ou digite o código.</small></div><ChevronRight size={19} /></button>

      {account.animals.length === 0 ? <EmptyState icon={<Cow size={27} />} title="Nenhum animal cadastrado" text="Crie a primeira ficha do rebanho sem preencher dados inventados." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Cadastrar animal</button>} /> : filtered.length === 0 ? <EmptyState icon={<Search size={25} />} title="Nenhum resultado" text="Tente outro termo ou remova o filtro." /> : <div className="animal-list">{filtered.map((item) => <button key={item.id} className="animal-card" onClick={() => setSelectedId(item.id)}>{item.photoUrl ? <img className="animal-avatar image" src={item.photoUrl} alt={`Foto de ${item.name || item.identification}`} /> : <span className="animal-avatar"><Cow size={25} /></span>}<div className="animal-copy"><span className="animal-code">{item.identification}</span><strong>{item.name || "Animal sem nome"}</strong><small>{[item.species, item.breed, item.sex].filter(Boolean).join(" · ")}</small></div><div className="animal-side">{item.electronicId && <span className="tag-badge"><Nfc size={13} /> vinculado</span>}<ChevronRight size={19} /></div></button>)}</div>}

      <Modal open={formOpen} onClose={() => { setFormOpen(false); setError(""); }} eyebrow={editingId ? "EDIÇÃO" : "NOVA FICHA"} title={editingId ? "Editar animal" : "Cadastrar animal"} wide>
        <form className="modal-form" onSubmit={saveAnimal}>
          <div className="field-combo"><Field label="Identificação"><input value={animal.identification} onChange={(event) => { setAnimal({ ...animal, identification: event.target.value }); setError(""); }} placeholder="Ex.: BOV-001" autoFocus /></Field><Field label="Nome (opcional)"><input value={animal.name} onChange={(event) => setAnimal({ ...animal, name: event.target.value })} placeholder="Ex.: Estrela" /></Field></div>
          <div className="field-combo"><Field label="Espécie"><select value={animal.species} onChange={(event) => setAnimal({ ...animal, species: event.target.value })}>{["Bovino", "Caprino", "Ovino", "Equino", "Suíno", "Ave", "Outra"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Raça"><input value={animal.breed} onChange={(event) => setAnimal({ ...animal, breed: event.target.value })} placeholder="Informe se souber" /></Field></div>
          <div className="field-combo"><Field label="Sexo"><select value={animal.sex} onChange={(event) => setAnimal({ ...animal, sex: event.target.value })}><option value="">Não informado</option><option>Fêmea</option><option>Macho</option></select></Field><Field label="Nascimento"><input type="date" value={animal.birthDate} onChange={(event) => setAnimal({ ...animal, birthDate: event.target.value })} /></Field></div>
          <div className="field-combo"><Field label="Peso (kg)"><input inputMode="decimal" value={animal.weight} onChange={(event) => setAnimal({ ...animal, weight: event.target.value })} placeholder="0" /></Field><Field label="Situação"><select value={animal.status} onChange={(event) => setAnimal({ ...animal, status: event.target.value })}><option>Ativo</option><option>Em observação</option><option>Vendido</option><option>Baixa</option></select></Field></div>
          <Field label="Código NFC/RFID (opcional)" hint="Você também pode usar a Central NFC para ler uma tag real."><input value={animal.electronicId} onChange={(event) => setAnimal({ ...animal, electronicId: event.target.value })} placeholder="Digite o código da tag" /></Field>
          <Field label="Observações"><textarea value={animal.notes} onChange={(event) => setAnimal({ ...animal, notes: event.target.value })} placeholder="Histórico ou informações importantes" /></Field>
          {error && <p className="form-error">{error}</p>}<div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary-button" type="submit">{editingId ? "Confirmar alterações" : "Confirmar animal"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => { setSelectedId(undefined); setError(""); }} eyebrow="FICHA INDIVIDUAL" title={selected?.name || selected?.identification || "Animal"}>
        {selected && <div className="animal-detail">
          <div className="animal-detail-hero">{selected.photoUrl ? <img src={selected.photoUrl} alt={`Foto de ${selected.name || selected.identification}`} /> : <span><Cow size={34} /></span>}<div><small>{selected.identification}</small><strong>{selected.name || "Animal sem nome"}</strong><em>{selected.status}</em></div></div>
          <div className="animal-photo-actions"><button className="secondary-button" onClick={() => void setPhoto()} disabled={photoBusy}>{photoBusy ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />} Câmera</button><button className="secondary-button" onClick={() => photoRef.current?.click()} disabled={photoBusy}>Galeria</button><input ref={photoRef} className="hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void setPhoto(event.target.files?.[0])} /></div>
          <div className="detail-grid"><div><span>Espécie</span><strong>{selected.species}</strong></div><div><span>Raça</span><strong>{selected.breed || "Não informada"}</strong></div><div><span>Sexo</span><strong>{selected.sex || "Não informado"}</strong></div><div><span>Peso</span><strong>{selected.weight ? `${selected.weight} kg` : "Não informado"}</strong></div></div>
          <div className="detail-line">{selected.electronicId ? <BadgeCheck size={19} /> : <Nfc size={19} />}<div><span>Identificação eletrônica</span><strong>{selected.electronicId || "Não vinculada"}</strong></div></div>
          {selected.weight && <div className="detail-line"><Weight size={19} /><div><span>Último peso informado</span><strong>{selected.weight} kg</strong></div></div>}
          {selected.notes && <div className="detail-note">{selected.notes}</div>}
          {(selected.history?.length ?? 0) > 0 && <div className="animal-history"><h3><History size={17} /> Histórico</h3>{selected.history!.slice().reverse().map((entry) => <div key={entry.id}><span /><p><strong>{entry.type}</strong>{entry.description}<small>{new Date(entry.date).toLocaleString("pt-BR")}</small></p></div>)}</div>}
          {error && <p className="form-error">{error}</p>}
          <div className="detail-actions three"><button className="secondary-button" onClick={() => openEdit(selected)}><Pencil size={17} /> Editar</button><button className="secondary-button" onClick={() => openNfc(selected.id)}><Nfc size={17} /> Vincular tag</button><button className="danger-button" onClick={() => setDeleteTarget(selected)}><Trash2 size={17} /> Excluir</button></div>
        </div>}
      </Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Excluir animal?" text={`${deleteTarget?.name || deleteTarget?.identification || "Este animal"} e seu histórico serão removidos da conta. Atividades vinculadas perderão apenas a referência ao animal.`} confirmLabel="Confirmar exclusão" onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) removeAnimal(deleteTarget); }} />
    </div>
  );
}
