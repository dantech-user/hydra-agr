"use client";

import { AlertTriangle, Bell, CheckCircle2, ChevronRight, ClipboardCheck, History, KeyRound, Nfc, ShieldCheck, UsersRound } from "lucide-react";
import { HydraWordmark } from "../../components/brand";
import type { Announcement, AppRoute, HydraAccount } from "../../lib/hydra-types";
import "../../product-polish.css";
import "./staff-access.css";

type Props = {
  account: HydraAccount;
  announcements: Announcement[];
  navigate: (route: AppRoute) => void;
};

function tagged(prefix: string, text?: string) {
  return text?.startsWith(`${prefix}|`) ?? false;
}

export function StaffHomeScreen({ account, announcements, navigate }: Props) {
  const firstName = account.profile.name.split(/\s+/)[0] || "Funcionário";
  const role = account.access.staffRole === "manager" ? "Gerente" : "Funcionário";
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());
  const tasks = account.activities.filter((item) => tagged("HYDRA_TASK", item.note));
  const pendingTasks = tasks.filter((item) => !item.done);
  const reports = account.monitoring.filter((item) => tagged("HYDRA_REPORT", item.note));
  const occurrences = account.monitoring.filter((item) => tagged("HYDRA_OCCURRENCE", item.note));

  return (
    <div className="screen home-screen staff-home-screen page-enter">
      <div className="home-brandbar">
        <HydraWordmark />
        <button className="icon-button bare" onClick={() => navigate("notifications")} aria-label="Notificações"><Bell size={23} /></button>
      </div>

      <section className="greeting-block staff-greeting">
        <div><h1>Olá, {firstName}</h1><p className="capitalize">{today}</p></div>
        <span className="staff-role-pill"><ShieldCheck size={15} /> {role}</span>
      </section>

      {announcements.length > 0 && <section className="home-announcements" aria-label="Avisos do Hydra Agro">{announcements.slice(0, 2).map((announcement) => <article key={announcement.id} className={announcement.level}><span>{announcement.level === "critical" ? "IMPORTANTE" : announcement.level === "attention" ? "ATENÇÃO" : "AVISO"}</span><strong>{announcement.title}</strong><p>{announcement.body}</p></article>)}</section>}

      <section className="staff-access-hero">
        <span className="staff-access-icon"><KeyRound size={24} /></span>
        <div><small>ACESSO DE EQUIPE</small><h2>{account.property.name || "Propriedade"}</h2><p>{account.access.area || "Geral"} · {role}</p></div>
        <ShieldCheck size={22} />
      </section>

      <div className="shortcut-row staff-shortcuts" aria-label="Atalhos do funcionário" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <button onClick={() => navigate("operations")}><span><ClipboardCheck size={23} /></span><small>Rotina</small></button>
        <button onClick={() => navigate("history")}><span><History size={23} /></span><small>Histórico</small></button>
        <button onClick={() => navigate("nfc")}><span><Nfc size={23} /></span><small>NFC</small></button>
        <button onClick={() => navigate("profile")}><span><UsersRound size={23} /></span><small>Meu acesso</small></button>
      </div>

      <section className="staff-summary-grid">
        <button onClick={() => navigate("operations")}><ClipboardCheck size={21} /><span><small>TAREFAS PENDENTES</small><strong>{pendingTasks.length}</strong></span><ChevronRight size={18} /></button>
        <button onClick={() => navigate("operations")}><CheckCircle2 size={21} /><span><small>RELATÓRIOS</small><strong>{reports.length}</strong></span><ChevronRight size={18} /></button>
        <button onClick={() => navigate("operations")}><AlertTriangle size={21} /><span><small>OCORRÊNCIAS</small><strong>{occurrences.length}</strong></span><ChevronRight size={18} /></button>
      </section>

      <section className="home-section staff-routine-card">
        <div className="staff-section-heading"><div><span className="eyebrow">MINHA ROTINA</span><h2>O que você pode fazer</h2></div><ShieldCheck size={21} /></div>
        <button onClick={() => navigate("operations")}><span><ClipboardCheck size={20} /></span><div><strong>Enviar relatório do dia</strong><small>Registre o que foi feito e as pendências.</small></div><ChevronRight size={18} /></button>
        <button onClick={() => navigate("operations")}><span><AlertTriangle size={20} /></span><div><strong>Registrar ocorrência</strong><small>Informe algo observado na propriedade.</small></div><ChevronRight size={18} /></button>
        <button onClick={() => navigate("nfc")}><span><Nfc size={20} /></span><div><strong>Ler identificação NFC</strong><small>Localize o animal sem alterar seu cadastro.</small></div><ChevronRight size={18} /></button>
      </section>

      {pendingTasks.length > 0 && <section className="home-section"><div className="task-card"><div className="task-card-title"><ClipboardCheck size={21} /><strong>Tarefas para acompanhar</strong><span>{pendingTasks.length}</span></div>{pendingTasks.slice(0, 4).map((activity) => <button key={activity.id} onClick={() => navigate("operations")}><span>{activity.category}</span><strong>{activity.title}</strong><ChevronRight size={19} /></button>)}</div></section>}
    </div>
  );
}
