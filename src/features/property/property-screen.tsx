"use client";

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Beef as Cow, Droplets, MapPin, Nfc, Pencil, RadioTower, Ruler, Sprout, Tractor } from "lucide-react";
import { Field, Modal, ScreenHeader, SectionHeader } from "../../components/ui";
import type { HydraAccount, Property } from "../../lib/hydra-types";
import { isSupportedMunicipality, supportedMunicipalities } from "../../lib/municipalities";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  onBack: () => void;
};

function InfoItem({ label, value, icon }: { label: string; value?: string; icon?: ReactNode }) {
  return <div className="property-info-item">{icon && <span>{icon}</span>}<div><small>{label}</small><strong>{value || "Não informado"}</strong></div></div>;
}

export function PropertyScreen({ account, updateAccount, onBack }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Property>({ ...account.property });
  const [error, setError] = useState("");
  const coverStyle = account.property.coverUrl ? { backgroundImage: `linear-gradient(145deg, rgba(13,78,54,.84), rgba(7,52,36,.94)), url("${account.property.coverUrl}")` } as CSSProperties : undefined;

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) { setError("Informe o nome da propriedade."); return; }
    if (!isSupportedMunicipality(draft.municipality)) { setError("Escolha Brejões ou um município vizinho atendido."); return; }
    const area = Number(draft.area.replace(",", "."));
    if (!Number.isFinite(area) || area <= 0) { setError("Informe uma área válida, maior que zero."); return; }
    if (draft.approximateAnimals && !/^\d+$/.test(draft.approximateAnimals)) { setError("Informe uma quantidade válida de animais."); return; }
    updateAccount((current) => ({ ...current, property: draft }));
    setError("");
    setEditOpen(false);
  }

  return (
    <div className="screen page-enter extra-screen property-screen">
      <ScreenHeader eyebrow="FICHA DIGITAL" title="Minha propriedade" subtitle="Tudo que foi cadastrado, sem pedir os mesmos dados novamente." onBack={onBack} action={<button className="icon-button accent" onClick={() => { setDraft({ ...account.property }); setEditOpen(true); }} aria-label="Editar propriedade"><Pencil size={19} /></button>} />

      <section className={`property-cover ${account.property.coverUrl ? "has-image" : ""}`} style={coverStyle}>
        <span className="property-cover-icon"><Sprout size={33} /></span>
        <div><small>PROPRIEDADE</small><h2>{account.property.name || "Nome não informado"}</h2><p><MapPin size={16} /> {account.property.municipality ? `${account.property.municipality}, ${account.property.state}` : "Localização não informada"}</p></div>
      </section>

      <section className="property-section-card">
        <SectionHeader title="Visão geral" />
        <div className="property-info-grid">
          <InfoItem label="Área" value={account.property.area ? `${account.property.area} ${account.property.areaUnit}` : undefined} icon={<Ruler size={20} />} />
          <InfoItem label="Tipo" value={account.property.type} icon={<Tractor size={20} />} />
          <InfoItem label="Município" value={account.property.municipality} icon={<MapPin size={20} />} />
          <InfoItem label="Estado" value={account.property.state === "BA" ? "Bahia" : account.property.state} icon={<MapPin size={20} />} />
          <InfoItem label="Referência" value={account.property.locationDetails} icon={<MapPin size={20} />} />
        </div>
      </section>

      <section className="property-section-card">
        <SectionHeader title="Produção" />
        <div className="production-main"><Sprout size={22} /><div><small>ATIVIDADE PRINCIPAL</small><strong>{account.property.mainActivity || "Não informada"}</strong></div></div>
        <div className="property-tags">
          {account.property.otherActivities.length > 0 ? account.property.otherActivities.map((activity) => <span key={activity}>{activity}</span>) : <em>Nenhuma atividade secundária informada.</em>}
        </div>
        <div className="production-summary"><Cow size={21} /><div><small>REBANHO INFORMADO NO CADASTRO</small><strong>{account.property.approximateAnimals || "Não informado"}</strong><p>{account.animals.length === 1 ? "1 ficha individual" : `${account.animals.length} fichas individuais`} no aplicativo</p></div></div>
      </section>

      <section className="property-section-card">
        <SectionHeader title="Água" />
        <div className="property-stat-row"><div><Droplets size={21} /><span><strong>{account.waterSources.length}</strong><small>fontes cadastradas</small></span></div><div><span><strong>{account.waterRecords.length}</strong><small>leituras</small></span></div></div>
        <div className="property-tags blue">
          {account.property.waterKinds.length > 0 ? account.property.waterKinds.map((kind) => <span key={kind}>{kind}</span>) : <em>Nenhuma fonte informada no cadastro.</em>}
        </div>
      </section>

      <section className="property-section-card last-section">
        <SectionHeader title="Tecnologia" />
        <div className="tech-list">
          <div><span><Nfc size={21} /></span><div><strong>NFC / RFID</strong><small>{account.animals.filter((animal) => animal.electronicId).length} animais identificados</small></div></div>
          <div><span><RadioTower size={21} /></span><div><strong>Monitoramento</strong><small>{account.monitoring.length} registros em {account.sectors.length} setores</small></div></div>
          <div className="muted"><span><Tractor size={21} /></span><div><strong>Drone Pastor</strong><small>Requer hardware e API compatíveis</small></div></div>
        </div>
      </section>

      <Modal open={editOpen} onClose={() => { setEditOpen(false); setError(""); }} eyebrow="EDIÇÃO" title="Dados da propriedade" wide>
        <form className="modal-form" onSubmit={save}>
          <Field label="Nome da propriedade"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <div className="field-combo"><Field label="Município"><input list="property-supported-cities" value={draft.municipality} onChange={(e) => { setDraft({ ...draft, municipality: e.target.value }); setError(""); }} /><datalist id="property-supported-cities">{supportedMunicipalities.map((city) => <option key={city} value={city} />)}</datalist></Field><Field label="Estado"><select value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}><option value="BA">Bahia</option></select></Field></div>
          <Field label="Localização ou referência (opcional)"><input value={draft.locationDetails || ""} onChange={(e) => setDraft({ ...draft, locationDetails: e.target.value })} placeholder="Ex.: Comunidade Lagoa Nova" /></Field>
          <div className="field-combo"><Field label="Área"><input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></Field><Field label="Unidade"><select value={draft.areaUnit} onChange={(e) => setDraft({ ...draft, areaUnit: e.target.value })}><option>hectares</option><option>tarefas</option><option>alqueires</option></select></Field></div>
          <Field label="Tipo"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option value="">Selecione</option><option>Familiar</option><option>Comercial</option><option>Assentamento</option><option>Cooperativa</option><option>Outra</option></select></Field>
          <Field label="Principal atividade"><select value={draft.mainActivity} onChange={(e) => setDraft({ ...draft, mainActivity: e.target.value })}><option value="">Selecione</option>{['Pecuária', 'Agricultura', 'Cacau', 'Café', 'Fruticultura', 'Apicultura', 'Avicultura', 'Outras atividades'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Outras atividades" hint="Separe por vírgulas."><input value={draft.otherActivities.join(", ")} onChange={(e) => setDraft({ ...draft, otherActivities: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Ex.: Cacau, Apicultura" /></Field>
          <Field label="Quantidade aproximada de animais"><input value={draft.approximateAnimals} onChange={(e) => setDraft({ ...draft, approximateAnimals: e.target.value })} /></Field>
          <Field label="Fontes de água disponíveis" hint="Separe por vírgulas."><input value={draft.waterKinds.join(", ")} onChange={(e) => setDraft({ ...draft, waterKinds: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Ex.: Poço, Cisterna" /></Field>
          {error && <p className="form-error">{error}</p>}<div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setEditOpen(false)}>Cancelar</button><button className="primary-button" type="submit">Confirmar alterações</button></div>
        </form>
      </Modal>
    </div>
  );
}
