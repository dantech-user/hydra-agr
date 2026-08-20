"use client";

import "../../product-polish.css";
import "../../identity-system.css";
import "../../identity-herd.css";
import "../../identity-finish.css";
import {
  Bell,
  ChevronRight,
  ClipboardCheck,
  Beef as Cow,
  Droplets,
  History,
  Leaf,
  Map,
  MessageSquareText,
  Pencil,
  Plus,
  RadioTower,
  ScanLine,
  Trophy,
  UsersRound,
} from "lucide-react";
import { HydraWordmark } from "../../components/brand";
import { SectionHeader } from "../../components/ui";
import type { Announcement, AppRoute, HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  navigate: (route: AppRoute) => void;
  onQuickAction: () => void;
  announcements: Announcement[];
};

export function HomeScreen({ account, navigate, onQuickAction, announcements }: Props) {
  const waterTotal = account.waterRecords.reduce((total, record) => total + record.amount, 0);
  const pendingActivities = account.activities.filter((activity) => !activity.done);
  const propertyReady = Boolean(account.property.municipality && account.property.mainActivity);

  const pendingSetup = [
    account.waterRecords.length === 0 && { label: "Registrar a primeira leitura de água", icon: <Droplets size={21} />, route: "water" as AppRoute },
    account.animals.length === 0 && { label: "Cadastrar o primeiro animal", icon: <Cow size={21} />, route: "herd" as AppRoute },
    account.sectors.length === 0 && { label: "Criar o primeiro setor", icon: <Map size={21} />, route: "monitor" as AppRoute },
  ].filter(Boolean) as { label: string; icon: React.ReactNode; route: AppRoute }[];

  const propertyStyle = account.property.coverUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(5,34,23,.04) 0%, rgba(5,34,23,.12) 35%, rgba(5,34,23,.72) 100%), url("${account.property.coverUrl}")` }
    : { backgroundImage: "linear-gradient(145deg, #215f43, #0e3b29)" };

  return (
    <div className="screen home-screen page-enter">
      <div className="home-brandbar">
        <HydraWordmark />
        <button className="icon-button bare" onClick={() => navigate("notifications")} aria-label="Notificações">
          <Bell size={23} />
          {account.notifications.length > 0 && <span className="notification-dot" />}
        </button>
      </div>

      {announcements.length > 0 && (
        <section className="home-announcements" aria-label="Avisos do Hydra Agro">
          {announcements.slice(0, 3).map((announcement) => (
            <article key={announcement.id} className={announcement.level}>
              <span>{announcement.level === "critical" ? "IMPORTANTE" : announcement.level === "attention" ? "ATENÇÃO" : "AVISO"}</span>
              <strong>{announcement.title}</strong>
              <p>{announcement.body}</p>
            </article>
          ))}
        </section>
      )}

      <section className="property-hero" style={propertyStyle}>
        <div className="property-hero-top">
          <div>
            <span className="property-kicker">Propriedade</span>
            <h2>{account.property.name || "Propriedade não cadastrada"}</h2>
            <p>{propertyReady ? `${account.property.mainActivity} · ${account.property.municipality}, ${account.property.state}` : "Complete a ficha da propriedade"}</p>
          </div>
          <button onClick={() => navigate("property")} aria-label="Editar propriedade"><Pencil size={15} /><span>Editar</span></button>
        </div>
        <div className="property-metrics">
          <div><Droplets size={19} /><span><strong>{waterTotal.toLocaleString("pt-BR")} L</strong><small>água registrada</small></span></div>
          <div><Cow size={19} /><span><strong>{account.animals.length}</strong><small>animais</small></span></div>
          <div><RadioTower size={19} /><span><strong>{account.monitoring.length}</strong><small>monitoramentos</small></span></div>
        </div>
        <button className="property-link" onClick={() => navigate("property")}>Ver ficha <ChevronRight size={18} /></button>
      </section>

      <section className="home-quick-section">
        <div className="identity-section-title"><h2>Ações rápidas</h2></div>
        <div className="shortcut-row identity-shortcuts" aria-label="Ações rápidas">
          <button onClick={() => navigate("nfc")}><span><ScanLine size={22} /></span><small>Ler NFC</small></button>
          <button onClick={() => navigate("herd")}><span><Cow size={22} /></span><small>Rebanho</small></button>
          <button onClick={() => navigate("water")}><span><Droplets size={22} /></span><small>Água</small></button>
          <button onClick={() => navigate("activities")}><span><ClipboardCheck size={22} /></span><small>Atividades</small></button>
        </div>
      </section>

      <section className="home-section home-summary-section">
        <button className="history-home-row" onClick={() => navigate("history")}>
          <span><History size={19} /></span>
          <div><strong>Histórico da propriedade</strong><small>Água, atividades, rebanho e monitoramentos</small></div>
          <ChevronRight size={18} />
        </button>

        {!propertyReady && (
          <button className="first-action-card" onClick={() => navigate("property")}>
            <span><Plus size={24} /></span>
            <div><strong>Complete a ficha da propriedade</strong><p>Localização, área e atividade principal.</p></div>
            <ChevronRight size={21} />
          </button>
        )}

        {pendingActivities.length > 0 && (
          <div className="task-card">
            <div className="task-card-title"><ClipboardCheck size={21} /><strong>Atividades pendentes</strong><span>{pendingActivities.length}</span></div>
            {pendingActivities.slice(0, 3).map((activity) => (
              <button key={activity.id} onClick={() => navigate("activities")}><span>{activity.category}</span><strong>{activity.title}</strong><ChevronRight size={19} /></button>
            ))}
          </div>
        )}

        {pendingActivities.length === 0 && pendingSetup.length > 0 && (
          <div className="task-card">
            <div className="task-card-title"><ClipboardCheck size={21} /><strong>Primeiros passos</strong><span>{pendingSetup.length}</span></div>
            {pendingSetup.map((item) => (
              <button key={item.label} onClick={() => navigate(item.route)}>{item.icon}<strong>{item.label}</strong><ChevronRight size={19} /></button>
            ))}
          </div>
        )}

        {pendingActivities.length === 0 && pendingSetup.length === 0 && (
          <div className="calm-state"><Leaf size={22} /><div><strong>Sem atividades pendentes</strong><span>Os registros atuais estão em dia.</span></div></div>
        )}
      </section>

      <button className="assistant-home-identity" onClick={() => navigate("assistant")}>
        <span><MessageSquareText size={22} /></span>
        <div><strong>Assistente</strong><small>Ver prioridades da propriedade com base nos seus registros.</small></div>
        <ChevronRight size={19} />
      </button>

      <section className="home-section identity-other-section">
        <SectionHeader title="Outras áreas" />
        <div className="feature-link-grid identity-grid">
          <button onClick={() => navigate("monitor")}><RadioTower size={23} /><span><strong>Monitorar</strong><small>Setores e registros</small></span><ChevronRight size={18} /></button>
          <button onClick={() => navigate("community")}><UsersRound size={23} /><span><strong>Comunidade</strong><small>Publicações e comentários</small></span><ChevronRight size={18} /></button>
          <button onClick={() => navigate("challenges")}><Trophy size={23} /><span><strong>Desafios</strong><small>Ranking e XP</small></span><ChevronRight size={18} /></button>
        </div>
      </section>

      <button className="home-fab-label" onClick={onQuickAction}><Plus size={19} /> Nova ação</button>
    </div>
  );
}
