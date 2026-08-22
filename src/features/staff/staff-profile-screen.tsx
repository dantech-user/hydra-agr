import { useState, type ReactNode } from "react";
import { Bell, BriefcaseBusiness, ChevronRight, KeyRound, LogOut, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { Modal } from "../../components/ui";
import type { AppRoute, HydraAccount } from "../../lib/hydra-types";
import "../profile/profile-screen.css";
import "./staff-access.css";

type Props = {
  account: HydraAccount;
  navigate: (route: AppRoute) => void;
  logout: () => Promise<void>;
};

function MenuRow({ icon, title, subtitle, onClick, end }: { icon: ReactNode; title: string; subtitle?: string; onClick?: () => void; end?: ReactNode }) {
  const content = <><span className="profile-menu-icon">{icon}</span><div><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</div>{end || <ChevronRight size={19} />}</>;
  if (end) return <div className="profile-menu-row static-row">{content}</div>;
  return <button className="profile-menu-row" onClick={onClick}>{content}</button>;
}

export function StaffProfileScreen({ account, navigate, logout }: Props) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const initials = account.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HA";
  const role = account.access.staffRole === "manager" ? "Gerente" : "Funcionário";

  async function confirmLogout() {
    setLeaving(true);
    try { await logout(); }
    finally { setLeaving(false); }
  }

  return (
    <div className="screen profile-screen staff-profile-screen page-enter">
      <section className="profile-hero staff-profile-hero">
        <div className="profile-rings" />
        <div className="profile-avatar-wrap">
          {account.profile.avatarUrl ? <img className="profile-avatar image" src={account.profile.avatarUrl} alt={`Foto de ${account.profile.name}`} /> : <span className="profile-avatar">{initials}</span>}
        </div>
        <span className="staff-profile-role"><ShieldCheck size={15} /> {role}</span>
        <h1>{account.profile.name}</h1>
        <strong>{account.property.name || "Propriedade"}</strong>
        <p>{account.property.municipality ? `${account.property.municipality}, ${account.property.state}` : "Propriedade vinculada pelo dono"}</p>
      </section>

      <section className="profile-group">
        <span className="group-label">MEU ACESSO</span>
        <div className="profile-menu-card">
          <MenuRow icon={<BriefcaseBusiness size={21} />} title={role} subtitle={`Área: ${account.access.area || "Geral"}`} end={<ShieldCheck size={18} />} />
          <MenuRow icon={<MapPin size={21} />} title="Propriedade vinculada" subtitle={account.property.name || "Propriedade"} end={<ShieldCheck size={18} />} />
          <MenuRow icon={<KeyRound size={21} />} title="Entrada por código" subtitle="Seu acesso é controlado pelo dono da propriedade" end={<ShieldCheck size={18} />} />
        </div>
      </section>

      <section className="profile-group">
        <span className="group-label">MINHA CONTA</span>
        <div className="profile-menu-card">
          <MenuRow icon={<Bell size={21} />} title="Notificações" subtitle="Avisos ligados ao seu acesso" onClick={() => navigate("notifications")} />
          <MenuRow icon={<UserRound size={21} />} title="Meu perfil" subtitle="Nome e função definidos pelo responsável" end={<ShieldCheck size={18} />} />
        </div>
      </section>

      <section className="staff-permission-note"><ShieldCheck size={20} /><div><strong>Acesso limitado à equipe</strong><small>Você não pode alterar propriedade, equipe, plano, cadastros administrativos ou configurações do dono.</small></div></section>

      <button className="logout-button" onClick={() => setLogoutConfirm(true)}><LogOut size={19} /> Sair do acesso</button>
      <p className="profile-version">Hydra Agro · acesso de equipe</p>

      <Modal open={logoutConfirm} onClose={() => setLogoutConfirm(false)} eyebrow="ACESSO DE EQUIPE" title="Finalizar sessão" centered dismissible={!leaving}>
        <div className="confirm-action"><span><LogOut size={27} /></span><p>Deseja sair deste acesso de funcionário?</p><div className="modal-action-row"><button className="secondary-button" onClick={() => setLogoutConfirm(false)} disabled={leaving}>Cancelar</button><button className="primary-button" onClick={() => void confirmLogout()} disabled={leaving}>{leaving ? "Saindo…" : "Sair"}</button></div></div>
      </Modal>
    </div>
  );
}
