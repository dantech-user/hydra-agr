"use client";

import {
  Bell,
  ChevronRight,
  ClipboardCheck,
  Beef as Cow,
  Droplets,
  History,
  LayoutDashboard,
  Leaf,
  Map,
  MessageSquareText,
  Plus,
  RadioTower,
  ScanLine,
  Sprout,
  Trophy,
  UsersRound,
} from "lucide-react";
import { HydraWordmark } from "../../components/brand";
import { SectionHeader } from "../../components/ui";
import type { Announcement, AppRoute, HydraAccount } from "../../lib/hydra-types";
import { WeatherWidget } from "./weather-widget";

type Props = {
  account: HydraAccount;
  navigate: (route: AppRoute) => void;
  onQuickAction: () => void;
  announcements: Announcement[];
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function HomeScreen({ account, navigate, onQuickAction, announcements }: Props) {
  const firstName = account.profile.name.split(/\s+/)[0] || "Produtor";
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
  const waterTotal = account.waterRecords.reduce((total, record) => total + record.amount, 0);
  const pendingActivities = account.activities.filter((activity) => !activity.done);
  const waterAttention = account.waterSources.filter((source) => source.status !== "ativa").length;
  const animalsWithoutNfc = account.animals.filter((animal) => !animal.electronicId).length;
  const propertyReady = Boolean(account.property.municipality && account.property.mainActivity);

  const pendingSetup = [
    account.waterRecords.length === 0 && {
      label: "Registrar a primeira leitura de água",
      icon: <Droplets size={21} />,
      route: "water" as AppRoute,
    },
    account.animals.length === 0 && {
      label: "Cadastrar o primeiro animal",
      icon: <Cow size={21} />,
      route: "herd" as AppRoute,
    },
    account.sectors.length === 0 && {
      label: "Criar o primeiro setor",
      icon: <Map size={21} />,
      route: "monitor" as AppRoute,
    },
  ].filter(Boolean) as { label: string; icon: React.ReactNode; route: AppRoute }[];

  return (
    <div className="screen home-screen page-enter">
      <div className="home-brandbar">
        <HydraWordmark />
        <button className="icon-button bare" onClick={() => navigate("notifications")} aria-label="Notificações">
          <Bell size={23} />
          {account.notifications.length > 0 && <span className="notification-dot" />}
        </button>
      </div>

      <section className="greeting-block">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p className="capitalize">{today}</p>
        </div>
        <WeatherWidget municipality={account.property.municipality} onCompleteProperty={() => navigate("property")} />
      </section>

      {announcements.length > 0 && <section className="home-announcements" aria-label="Avisos do Hydra Agro">{announcements.slice(0, 3).map((announcement) => <article key={announcement.id} className={announcement.level}><span>{announcement.level === "critical" ? "IMPORTANTE" : announcement.level === "attention" ? "ATENÇÃO" : "AVISO"}</span><strong>{announcement.title}</strong><p>{announcement.body}</p></article>)}</section>}

      <div className="shortcut-row" aria-label="Atalhos">
        <button onClick={() => navigate("herd")}><span><Cow size={23} /></span><small>Rebanho</small></button>
        <button onClick={() => navigate("water")}><span><Droplets size={23} /></span><small>Água</small></button>
        <button onClick={() => navigate("monitor")}><span><RadioTower size={23} /></span><small>Monitorar</small></button>
        <button onClick={() => navigate("activities")}><span><ClipboardCheck size={23} /></span><small>Atividades</small></button>
      </div>

      <button className="nfc-banner" onClick={() => navigate("nfc")}>
        <span className="nfc-banner-icon"><ScanLine size={27} /></span>
        <span className="nfc-banner-copy">
          <small>NFC / RFID</small>
          <strong>Ler identificação do animal</strong>
          <em>{account.animals.filter((animal) => animal.electronicId).length} identificados · {account.nfcReadCount} leituras</em>
        </span>
        <ChevronRight size={22} />
      </button>

      <button className="assistant-home-card" onClick={() => navigate("assistant")}>
        <span><MessageSquareText size={22} /></span>
        <div>
          <small>Assistente</small>
          <strong>Consultar registros da propriedade</strong>
          <em>Pergunte sobre rebanho, água, atividades ou monitoramentos.</em>
        </div>
        <ChevronRight size={19} />
      </button>

      <section className="property-hero">
        <div className="property-hero-top">
          <div>
            <span className="property-kicker">Propriedade</span>
            <h2>{account.property.name || "Propriedade não cadastrada"}</h2>
            <p>{propertyReady ? `${account.property.mainActivity} · ${account.property.municipality}, ${account.property.state}` : "Complete a ficha da propriedade"}</p>
          </div>
          <button onClick={() => navigate("property")} aria-label="Editar propriedade"><Sprout size={20} /></button>
        </div>

        <div className="property-metrics">
          <div><Droplets size={20} /><span><strong>{waterTotal.toLocaleString("pt-BR")} L</strong><small>água registrada</small></span></div>
          <div><Cow size={20} /><span><strong>{account.animals.length}</strong><small>animais</small></span></div>
          <div><RadioTower size={20} /><span><strong>{account.monitoring.length}</strong><small>monitoramentos</small></span></div>
        </div>

        <button className="property-link" onClick={() => navigate("property")}>Ver ficha <ChevronRight size={18} /></button>
      </section>

      <section className="home-section">
        <SectionHeader title="Resumo" action={<button className="text-button" onClick={() => navigate("notifications")}>Alertas</button>} />

        <button className="today-home-card" onClick={() => navigate("today")}>
          <span><LayoutDashboard size={20} /></span>
          <div><strong>Central Hoje</strong><small>{pendingActivities.length} atividades pendentes · {waterAttention} fontes em atenção · {animalsWithoutNfc} animais sem NFC</small></div>
          <ChevronRight size={18} />
        </button>

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
            {pendingActivities.slice(0, 3).map((activity) => <button key={activity.id} onClick={() => navigate("activities")}><span>{activity.category}</span><strong>{activity.title}</strong><ChevronRight size={19} /></button>)}
          </div>
        )}

        {pendingActivities.length === 0 && pendingSetup.length > 0 && (
          <div className="task-card">
            <div className="task-card-title"><ClipboardCheck size={21} /><strong>Primeiros passos</strong><span>{pendingSetup.length}</span></div>
            {pendingSetup.map((item) => <button key={item.label} onClick={() => navigate(item.route)}>{item.icon}<strong>{item.label}</strong><ChevronRight size={19} /></button>)}
          </div>
        )}

        {pendingActivities.length === 0 && pendingSetup.length === 0 && (
          <div className="calm-state"><Leaf size={22} /><div><strong>Sem atividades pendentes</strong><span>Os registros atuais estão em dia.</span></div></div>
        )}
      </section>

      <section className="home-section">
        <SectionHeader title="Outras áreas" />
        <div className="feature-link-grid">
          <button onClick={() => navigate("community")}><UsersRound size={23} /><span><strong>Comunidade</strong><small>Publicações e comentários</small></span><ChevronRight size={18} /></button>
          <button onClick={() => navigate("challenges")}><Trophy size={23} /><span><strong>Desafios</strong><small>Metas e acompanhamento</small></span><ChevronRight size={18} /></button>
        </div>
      </section>

      <button className="home-fab-label" onClick={onQuickAction}><Plus size={19} /> Nova ação</button>
    </div>
  );
}
