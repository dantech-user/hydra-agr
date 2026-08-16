"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BatteryMedium,
  Camera,
  ChevronRight,
  Clock3,
  Cpu,
  Map,
  MapPin,
  LoaderCircle,
  Pencil,
  PlaneTakeoff,
  Plus,
  RadioTower,
  Satellite,
  Trash2,
} from "lucide-react";
import { EmptyState, Field, Modal, ScreenHeader, SectionHeader } from "../../components/ui";
import { makeId, type HydraAccount, type MonitoringRecord, type Sector } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  saveMonitoringPhoto: (recordId: string, file?: File) => Promise<boolean>;
  createSectorRequest?: number;
  onRequestHandled?: () => void;
};

export function MonitorScreen({ account, updateAccount, saveMonitoringPhoto, createSectorRequest, onRequestHandled }: Props) {
  const [tab, setTab] = useState<"sectors" | "history">("sectors");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [hardwareOpen, setHardwareOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [selected, setSelected] = useState<Sector | null>(null);
  const [selectedMonitoringId, setSelectedMonitoringId] = useState<string>();
  const [editingSectorId, setEditingSectorId] = useState<string>();
  const [sector, setSector] = useState({ name: "", kind: "Pasto", note: "" });
  const [record, setRecord] = useState({ date: new Date().toISOString().slice(0, 10), sectorId: "", type: "Inspeção manual", duration: "", note: "", occurrence: "" });
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const selectedMonitoring = account.monitoring.find((item) => item.id === selectedMonitoringId) ?? null;

  function saveSector(event: FormEvent) {
    event.preventDefault();
    if (!sector.name.trim()) {
      setError("Informe o nome do setor.");
      return;
    }
    updateAccount((current) => ({ ...current, sectors: editingSectorId
      ? current.sectors.map((item) => item.id === editingSectorId ? { ...item, name: sector.name.trim(), kind: sector.kind, note: sector.note.trim() || undefined } : item)
      : [...current.sectors, { id: makeId("sector"), name: sector.name.trim(), kind: sector.kind, note: sector.note.trim() || undefined }],
    }));
    setSector({ name: "", kind: "Pasto", note: "" });
    setError("");
    setEditingSectorId(undefined);
    setSectorOpen(false);
  }

  function saveMonitoring(event: FormEvent) {
    event.preventDefault();
    if (!record.sectorId) {
      setError("Selecione o setor monitorado.");
      return;
    }
    updateAccount((current) => ({
      ...current,
      monitoring: [
        { id: makeId("monitor"), date: record.date, sectorId: record.sectorId, type: record.type, duration: record.duration || undefined, note: record.note.trim() || undefined, occurrence: record.occurrence.trim() || undefined },
        ...current.monitoring,
      ],
    }));
    setRecord({ date: new Date().toISOString().slice(0, 10), sectorId: "", type: "Inspeção manual", duration: "", note: "", occurrence: "" });
    setError("");
    setRecordOpen(false);
    setTab("history");
  }

  function removeSector(item: Sector) {
    if (!window.confirm(`Excluir o setor ${item.name}?`)) return;
    updateAccount((current) => ({
      ...current,
      sectors: current.sectors.filter((sectorItem) => sectorItem.id !== item.id),
      activities: current.activities.map((activity) => activity.sectorId === item.id ? { ...activity, sectorId: undefined } : activity),
      monitoring: current.monitoring.map((recordItem) => recordItem.sectorId === item.id ? { ...recordItem, sectorId: undefined } : recordItem),
    }));
    setSelected(null);
  }

  function editSector(item: Sector) {
    setEditingSectorId(item.id);
    setSector({ name: item.name, kind: item.kind, note: item.note ?? "" });
    setSelected(null);
    setSectorOpen(true);
  }

  function openNewSector() {
    setEditingSectorId(undefined);
    setSector({ name: "", kind: "Pasto", note: "" });
    setError("");
    setSectorOpen(true);
  }

  useEffect(() => { if (createSectorRequest !== undefined) { openNewSector(); onRequestHandled?.(); } }, [createSectorRequest]);

  function removeMonitoring(item: MonitoringRecord) {
    if (!window.confirm("Excluir este registro de monitoramento?")) return;
    updateAccount((current) => ({ ...current, monitoring: current.monitoring.filter((recordItem) => recordItem.id !== item.id) }));
    setSelectedMonitoringId(undefined);
  }

  async function addMonitoringPhoto(file?: File) {
    if (!selectedMonitoring) return;
    setPhotoBusy(true);
    setError("");
    try { await saveMonitoringPhoto(selectedMonitoring.id, file); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível anexar a foto."); }
    finally { setPhotoBusy(false); if (photoRef.current) photoRef.current.value = ""; }
  }

  return (
    <div className="screen page-enter">
      <ScreenHeader
        eyebrow="CENTRAL TECNOLÓGICA"
        title="Monitorar"
        subtitle="Drone Pastor e setores da propriedade."
        action={<button className="icon-button accent" onClick={openNewSector} aria-label="Criar setor"><Plus size={21} /></button>}
      />

      <section className="drone-card">
        <div className="drone-status-line">
          <span className="drone-visual"><PlaneTakeoff size={34} /></span>
          <div><small>DRONE PASTOR</small><h2>Drone em espera</h2><p>Nenhum dispositivo conectado.</p></div>
          <span className="offline-pill">OFFLINE</span>
        </div>
        <div className="drone-data-row">
          <div><BatteryMedium size={18} /><span>Bateria<strong>—</strong></span></div>
          <div><Satellite size={18} /><span>Sinal<strong>—</strong></span></div>
          <div><MapPin size={18} /><span>Setor<strong>—</strong></span></div>
        </div>
        <button className="drone-action" onClick={() => setHardwareOpen(true)}>
          <PlaneTakeoff size={19} /> Iniciar sobrevoo
        </button>
        <p className="hardware-note"><Cpu size={15} /> A ação real será liberada com hardware e API compatíveis.</p>
      </section>

      <div className="segmented-control">
        <button className={tab === "sectors" ? "active" : ""} onClick={() => setTab("sectors")}>Setores <span>{account.sectors.length}</span></button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Histórico <span>{account.monitoring.length}</span></button>
      </div>

      {tab === "sectors" ? (
        <section className="content-section monitor-section">
          <SectionHeader title="Setores da propriedade" action={<button className="text-button" onClick={openNewSector}>Criar setor</button>} />
          {account.sectors.length === 0 ? (
            <EmptyState
              icon={<Map size={26} />}
              title="Divida a propriedade em setores"
              text="Crie áreas como Pasto 1, Curral, Plantação ou Reserva."
              action={<button className="primary-button" onClick={openNewSector}><Plus size={17} /> Criar primeiro setor</button>}
            />
          ) : (
            <div className="sector-grid">
              {account.sectors.map((item) => {
                const count = account.monitoring.filter((recordItem) => recordItem.sectorId === item.id).length;
                return (
                  <button className="sector-card" key={item.id} onClick={() => setSelected(item)}>
                    <span className="sector-icon"><MapPin size={22} /></span>
                    <div><small>{item.kind}</small><strong>{item.name}</strong><em>{count} monitoramento{count === 1 ? "" : "s"}</em></div>
                    <ChevronRight size={18} />
                  </button>
                );
              })}
            </div>
          )}
          {account.sectors.length > 0 && (
            <button className="wide-outline-button" onClick={() => { setRecord((current) => ({ ...current, sectorId: account.sectors[0].id })); setRecordOpen(true); }}>
              <RadioTower size={18} /> Registrar inspeção manual
            </button>
          )}
        </section>
      ) : (
        <section className="content-section monitor-section">
          <SectionHeader title="Histórico de monitoramento" action={account.sectors.length > 0 ? <button className="text-button" onClick={() => setRecordOpen(true)}>Registrar</button> : undefined} />
          {account.monitoring.length === 0 ? (
            <EmptyState icon={<RadioTower size={26} />} title="Nenhum monitoramento" text="Registros reais aparecerão aqui após inspeções ou missões conectadas." />
          ) : (
            <div className="monitoring-list">
              {account.monitoring.map((item) => {
                const sectorItem = account.sectors.find((entry) => entry.id === item.sectorId);
                return (
                  <button className="monitoring-card" key={item.id} onClick={() => setSelectedMonitoringId(item.id)}>
                    <span className="monitoring-date">{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    <div><small>{sectorItem?.name || "Setor removido"}</small><strong>{item.type}</strong><p>{item.note || "Sem observações"}</p></div>
                    {item.duration && <em><Clock3 size={14} /> {item.duration}</em>}
                    <ChevronRight size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <Modal open={sectorOpen} onClose={() => { setSectorOpen(false); setEditingSectorId(undefined); setError(""); }} eyebrow="MAPEAMENTO" title={editingSectorId ? "Editar setor" : "Criar setor"}>
        <form className="modal-form" onSubmit={saveSector}>
          <Field label="Nome"><input value={sector.name} onChange={(e) => { setSector({ ...sector, name: e.target.value }); setError(""); }} placeholder="Ex.: Pasto 1" autoFocus /></Field>
          <Field label="Tipo">
            <select value={sector.kind} onChange={(e) => setSector({ ...sector, kind: e.target.value })}>
              {['Pasto', 'Curral', 'Plantação', 'Reserva', 'Área de água', 'Galpão', 'Outro'].map((kind) => <option key={kind}>{kind}</option>)}
            </select>
          </Field>
          <Field label="Observação"><textarea value={sector.note} onChange={(e) => setSector({ ...sector, note: e.target.value })} placeholder="Características ou uso desta área" /></Field>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" type="submit">{editingSectorId ? "Salvar alterações" : "Salvar setor"}</button>
        </form>
      </Modal>

      <Modal open={recordOpen} onClose={() => { setRecordOpen(false); setError(""); }} eyebrow="HISTÓRICO" title="Registrar monitoramento">
        <form className="modal-form" onSubmit={saveMonitoring}>
          <div className="field-combo">
            <Field label="Data"><input type="date" value={record.date} onChange={(e) => setRecord({ ...record, date: e.target.value })} /></Field>
            <Field label="Duração"><input value={record.duration} onChange={(e) => setRecord({ ...record, duration: e.target.value })} placeholder="Ex.: 25 min" /></Field>
          </div>
          <Field label="Setor">
            <select value={record.sectorId} onChange={(e) => { setRecord({ ...record, sectorId: e.target.value }); setError(""); }}>
              <option value="">Selecione</option>{account.sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo"><select value={record.type} onChange={(e) => setRecord({ ...record, type: e.target.value })}><option>Inspeção manual</option><option>Monitoramento de animais</option><option>Inspeção de água</option><option>Outro</option></select></Field>
          <Field label="Observações"><textarea value={record.note} onChange={(e) => setRecord({ ...record, note: e.target.value })} placeholder="O que foi observado?" /></Field>
          <Field label="Ocorrências"><textarea value={record.occurrence} onChange={(e) => setRecord({ ...record, occurrence: e.target.value })} placeholder="Opcional" /></Field>
          <div className="upload-placeholder"><Camera size={20} /><span>Depois de salvar, abra o registro para anexar fotos reais.</span></div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" type="submit">Salvar monitoramento</button>
        </form>
      </Modal>

      <Modal open={hardwareOpen} onClose={() => setHardwareOpen(false)} eyebrow="DRONE PASTOR" title="Integração necessária">
        <div className="hardware-message">
          <span><PlaneTakeoff size={30} /></span>
          <p>O Hydra Agro não vai simular um voo. Para iniciar um sobrevoo real, será necessário conectar um drone compatível e sua API.</p>
          <div className="future-data-list">
            <div><Cpu size={17} /> Identificação e estado</div><div><BatteryMedium size={17} /> Bateria e sinal</div><div><MapPin size={17} /> Setor e missão</div>
          </div>
          <button className="primary-button full" onClick={() => setHardwareOpen(false)}>Entendi</button>
        </div>
      </Modal>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} eyebrow="SETOR" title={selected?.name || "Setor"}>
        {selected && <div className="sector-detail"><span><MapPin size={28} /></span><strong>{selected.kind}</strong><p>{selected.note || "Sem observações cadastradas."}</p><small>{account.activities.filter((item) => item.sectorId === selected.id).length} atividades · {account.monitoring.filter((item) => item.sectorId === selected.id).length} monitoramentos</small><div className="detail-actions"><button className="secondary-button" onClick={() => editSector(selected)}><Pencil size={17} /> Editar</button><button className="danger-button" onClick={() => removeSector(selected)}><Trash2 size={17} /> Excluir setor</button></div></div>}
      </Modal>

      <Modal open={Boolean(selectedMonitoring)} onClose={() => { setSelectedMonitoringId(undefined); setError(""); }} eyebrow="MONITORAMENTO" title={selectedMonitoring?.type || "Detalhes"}>
        {selectedMonitoring && <div className="monitoring-detail"><div className="detail-grid"><div><span>Data</span><strong>{new Date(`${selectedMonitoring.date}T12:00:00`).toLocaleDateString("pt-BR")}</strong></div><div><span>Setor</span><strong>{account.sectors.find((item) => item.id === selectedMonitoring.sectorId)?.name || "Setor removido"}</strong></div><div><span>Duração</span><strong>{selectedMonitoring.duration || "Não informada"}</strong></div><div><span>Tipo</span><strong>{selectedMonitoring.type}</strong></div></div>{selectedMonitoring.note && <div className="detail-note">{selectedMonitoring.note}</div>}{selectedMonitoring.occurrence && <div className="info-strip">Ocorrência: {selectedMonitoring.occurrence}</div>}{(selectedMonitoring.photoUrls?.length ?? 0) > 0 && <div className="monitoring-photos">{selectedMonitoring.photoUrls!.map((url, index) => <img src={url} alt={`Foto do monitoramento ${index + 1}`} key={url} />)}</div>}<div className="animal-photo-actions"><button className="secondary-button" onClick={() => void addMonitoringPhoto()} disabled={photoBusy}>{photoBusy ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />} Câmera</button><button className="secondary-button" onClick={() => photoRef.current?.click()} disabled={photoBusy}>Galeria</button><input ref={photoRef} className="hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void addMonitoringPhoto(event.target.files?.[0])} /></div>{error && <p className="form-error">{error}</p>}<button className="danger-button full" onClick={() => removeMonitoring(selectedMonitoring)}><Trash2 size={17} /> Excluir monitoramento</button></div>}
      </Modal>
    </div>
  );
}
