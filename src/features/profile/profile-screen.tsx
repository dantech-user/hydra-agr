import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  BellRing,
  Camera,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Crown,
  Droplets,
  ExternalLink,
  FileText,
  Instagram,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Nfc,
  Pencil,
  ShieldCheck,
  Sprout,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Field, Modal, Toggle } from "../../components/ui";
import type { AppLink, AppRoute, AuthResult, HydraAccount } from "../../lib/hydra-types";
import { hydraSupport } from "../../lib/support";

type Props = {
  account: HydraAccount;
  links: AppLink[];
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  navigate: (route: AppRoute) => void;
  logout: () => Promise<void>;
  saveAvatar: (file?: File) => Promise<boolean>;
  changeCredentials: (values: { email?: string; password?: string }) => Promise<AuthResult>;
};

function MenuRow({ icon, title, subtitle, onClick, end }: { icon: ReactNode; title: string; subtitle?: string; onClick?: () => void; end?: ReactNode }) {
  const content = <><span className="profile-menu-icon">{icon}</span><div><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</div>{end || <ChevronRight size={19} />}</>;
  if (end) return <div className="profile-menu-row static-row">{content}</div>;
  return <button className="profile-menu-row" onClick={onClick}>{content}</button>;
}

export function ProfileScreen({ account, links, updateAccount, navigate, logout, saveAvatar, changeCredentials }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [info, setInfo] = useState<"terms" | "privacy" | "about" | null>(null);
  const [profile, setProfile] = useState({ name: account.profile.name, phone: account.phone, bio: account.profile.bio || "" });
  const [security, setSecurity] = useState({ email: account.email, password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = account.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HA";

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile.name.trim()) return;
    updateAccount((current) => ({ ...current, phone: profile.phone, profile: { ...current.profile, name: profile.name.trim(), bio: profile.bio.trim() || undefined } }));
    setEditOpen(false);
  }

  async function chooseAvatar(file?: File) {
    setUploading(true);
    setMessage("");
    try {
      const changed = await saveAvatar(file);
      if (changed) setMessage("Foto do perfil atualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveSecurity(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (security.password && security.password.length < 8) {
      setMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (security.password !== security.confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }
    const values: { email?: string; password?: string } = {};
    if (security.email.trim().toLowerCase() !== account.email.toLowerCase()) values.email = security.email.trim();
    if (security.password) values.password = security.password;
    if (!values.email && !values.password) {
      setMessage("Nenhuma alteração para salvar.");
      return;
    }
    const result = await changeCredentials(values);
    setMessage(result.message);
    if (result.ok) setSecurityOpen(false);
  }

  const infoContent = {
    terms: { title: "Termos de uso", text: "O Hydra Agro organiza informações fornecidas pelo produtor. O usuário é responsável pela veracidade dos registros e pelo uso seguro do aparelho. Recursos de drone, pagamento e hardware só operam quando a integração correspondente estiver contratada e configurada." },
    privacy: { title: "Política de privacidade", text: "Dados pessoais e rurais ficam vinculados à conta autenticada e protegidos por regras de acesso no servidor. Fotos são armazenadas em áreas controladas. O Hydra Agro não vende dados pessoais e permite solicitar correção ou exclusão pelos canais oficiais cadastrados pelo administrador." },
    about: { title: "Sobre o Hydra Agro", text: "Plataforma de tecnologia rural para gestão da propriedade, água, rebanho, identificação NFC/RFID, setores, comunidade e monitoramento inteligente. Desenvolvida inicialmente para Brejões e municípios vizinhos." },
  } as const;

  const isAdmin = ["moderator", "admin", "owner"].includes(account.role);

  return (
    <div className="screen profile-screen page-enter">
      <section className="profile-hero">
        <div className="profile-rings" />
        <div className="profile-avatar-wrap">
          {account.profile.avatarUrl ? <img className="profile-avatar image" src={account.profile.avatarUrl} alt={`Foto de ${account.profile.name}`} /> : <span className="profile-avatar">{initials}</span>}
          <button className="avatar-edit-button" onClick={() => void chooseAvatar()} aria-label="Tirar ou escolher foto" disabled={uploading}>{uploading ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />}</button>
          <input ref={fileRef} className="hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseAvatar(event.target.files?.[0])} />
        </div>
        <h1>{account.profile.name}</h1>
        <strong>{account.property.name || "Propriedade não cadastrada"}</strong>
        <p>{account.property.municipality ? `${account.property.municipality}, ${account.property.state}` : "Localização não informada"}</p>
        <div className="profile-hero-actions"><button onClick={() => setEditOpen(true)}><Pencil size={16} /> Editar perfil</button><button onClick={() => fileRef.current?.click()}><Camera size={16} /> Galeria</button></div>
      </section>

      {message && <div className="profile-message" role="status">{message}</div>}

      <section className="plan-card">
        <div className="plan-mark"><Crown size={24} /></div>
        <div><span>PLANO ATUAL</span><strong>{account.profile.plan}</strong><small>{account.profile.plan === "Gratuito" ? "Conheça o Hydra Agro+" : "Recursos premium ativos"}</small></div>
        <button onClick={() => setPlanOpen(true)}>Gerenciar</button>
      </section>

      {isAdmin && <section className="profile-group"><span className="group-label">ADMINISTRAÇÃO</span><div className="profile-menu-card admin-access-card"><MenuRow icon={<ShieldCheck size={21} />} title="Painel administrativo" subtitle={`Acesso ${account.role} validado pelo servidor`} onClick={() => navigate("admin")} /></div></section>}

      <section className="profile-group">
        <span className="group-label">MINHA CONTA</span>
        <div className="profile-menu-card">
          <MenuRow icon={<UserRound size={21} />} title="Dados pessoais" subtitle={account.email} onClick={() => setEditOpen(true)} />
          <MenuRow icon={<UsersRound size={21} />} title="Comunidade" subtitle={`${account.posts.filter((post) => post.authorId === account.id).length} publicaç${account.posts.filter((post) => post.authorId === account.id).length === 1 ? "ão" : "ões"}`} onClick={() => navigate("community")} />
          <MenuRow icon={<ClipboardList size={21} />} title="Atividades" subtitle={`${account.activities.length} registro${account.activities.length === 1 ? "" : "s"}`} onClick={() => navigate("activities")} />
          <MenuRow icon={<Bell size={21} />} title="Notificações" subtitle={`${account.notifications.length} aviso${account.notifications.length === 1 ? "" : "s"}`} onClick={() => navigate("notifications")} />
        </div>
      </section>

      <section className="profile-group">
        <span className="group-label">MINHA PROPRIEDADE</span>
        <div className="profile-menu-card">
          <MenuRow icon={<Sprout size={21} />} title="Ver todos os dados cadastrados" subtitle="Visão geral, produção, água e tecnologia" onClick={() => navigate("property")} />
          <MenuRow icon={<Nfc size={21} />} title="Central NFC/RFID" subtitle={`${account.animals.filter((animal) => animal.electronicId).length} identificações · ${account.nfcReadCount} leituras reais`} onClick={() => navigate("nfc")} />
          <MenuRow icon={<Droplets size={21} />} title="Alertas de consumo de água" subtitle="Análises dependem dos seus registros" end={<Toggle checked={account.settings.waterAlerts} label="Alertas de água" onChange={(waterAlerts) => updateAccount((current) => ({ ...current, settings: { ...current.settings, waterAlerts } }))} />} />
        </div>
      </section>

      <section className="profile-group">
        <span className="group-label">PREFERÊNCIAS E SEGURANÇA</span>
        <div className="profile-menu-card">
          <MenuRow icon={<Bell size={21} />} title="Notificações do aplicativo" subtitle="Avisos da propriedade e administração" end={<Toggle checked={account.settings.pushNotifications} label="Notificações" onChange={(pushNotifications) => updateAccount((current) => ({ ...current, settings: { ...current.settings, pushNotifications } }))} />} />
          <MenuRow icon={<LockKeyhole size={21} />} title="Segurança" subtitle="Alterar e-mail ou senha" onClick={() => { setSecurity({ email: account.email, password: "", confirmPassword: "" }); setSecurityOpen(true); }} />
          <MenuRow icon={<FileText size={21} />} title="Termos de uso" onClick={() => setInfo("terms")} />
          <MenuRow icon={<ShieldCheck size={21} />} title="Política de privacidade" onClick={() => setInfo("privacy")} />
          <MenuRow icon={<CircleHelp size={21} />} title="Sobre o Hydra Agro" onClick={() => setInfo("about")} />
        </div>
      </section>

      <section className="profile-group"><span className="group-label">SUPORTE E LINKS OFICIAIS</span><div className="profile-menu-card"><MenuRow icon={<Mail size={21} />} title="Suporte por e-mail" subtitle={hydraSupport.email} onClick={() => { window.location.href = `mailto:${hydraSupport.email}?subject=Suporte%20Hydra%20Agro`; }} /><MenuRow icon={<Instagram size={21} />} title="Instagram" subtitle={hydraSupport.instagramHandle} onClick={() => window.open(hydraSupport.instagramUrl, "_blank", "noopener,noreferrer")} />{links.map((link) => <MenuRow key={link.id} icon={<ExternalLink size={21} />} title={link.label} subtitle={link.description} onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} />)}</div></section>

      <button className="logout-button" onClick={() => void logout()}><LogOut size={19} /> Sair desta conta</button>
      <p className="profile-version">Hydra Agro · versão 1.0.0</p>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} eyebrow="PERFIL" title="Editar dados pessoais">
        <form className="modal-form" onSubmit={saveProfile}>
          <Field label="Nome"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></Field>
          <Field label="E-mail" hint="Altere o e-mail em Segurança."><input value={account.email} disabled /></Field>
          <Field label="Telefone"><input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="(75) 99999-9999" /></Field>
          <Field label="Sobre você (opcional)"><textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="Uma breve apresentação para a comunidade" maxLength={180} /></Field>
          <button className="primary-button full" type="submit">Salvar alterações</button>
        </form>
      </Modal>

      <Modal open={securityOpen} onClose={() => setSecurityOpen(false)} eyebrow="SEGURANÇA" title="E-mail e senha">
        <form className="modal-form" onSubmit={saveSecurity}>
          <Field label="E-mail"><input type="email" value={security.email} onChange={(event) => setSecurity({ ...security, email: event.target.value })} /></Field>
          <Field label="Nova senha" hint="Deixe em branco para manter a atual."><input type="password" value={security.password} onChange={(event) => setSecurity({ ...security, password: event.target.value })} autoComplete="new-password" /></Field>
          <Field label="Confirmar nova senha"><input type="password" value={security.confirmPassword} onChange={(event) => setSecurity({ ...security, confirmPassword: event.target.value })} autoComplete="new-password" /></Field>
          {message && <p className="form-notice">{message}</p>}
          <button className="primary-button full" type="submit">Salvar com segurança</button>
        </form>
      </Modal>

      <Modal open={planOpen} onClose={() => setPlanOpen(false)} eyebrow="ASSINATURA" title="Hydra Agro+">
        <div className="plan-modal"><span className="plan-modal-icon"><Crown size={31} /></span><h3>Recursos premium preparados</h3><p>O plano Hydra Agro+ será ativado somente por um provedor de pagamento real e validação no servidor.</p><div><BellRing size={18} /> Nenhuma cobrança é simulada pelo aplicativo.</div><button className="primary-button full" onClick={() => setPlanOpen(false)}>Entendi</button></div>
      </Modal>

      <Modal open={Boolean(info)} onClose={() => setInfo(null)} title={info ? infoContent[info].title : "Informações"}>
        {info && <div className="legal-copy"><p>{infoContent[info].text}</p><button className="primary-button full" onClick={() => setInfo(null)}>Fechar</button></div>}
      </Modal>
    </div>
  );
}
