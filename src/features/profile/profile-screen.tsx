import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Crown,
  Droplets,
  ExternalLink,
  FileText,
  HeartHandshake,
  Instagram,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Nfc,
  Pencil,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Field, Modal, Toggle } from "../../components/ui";
import type { AppLink, AppRoute, AuthResult, HydraAccount } from "../../lib/hydra-types";
import { isSupportedMunicipality, supportedMunicipalities } from "../../lib/municipalities";
import { hydraSupport } from "../../lib/support";

type Props = {
  account: HydraAccount;
  links: AppLink[];
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  navigate: (route: AppRoute) => void;
  logout: () => Promise<void>;
  saveAvatar: (file?: File) => Promise<boolean>;
  savePropertyCover: (file?: File) => Promise<boolean>;
  changeCredentials: (values: { email?: string; password?: string }) => Promise<AuthResult>;
};

type ProfileDraft = {
  name: string;
  phone: string;
  bio: string;
  propertyName: string;
  municipality: string;
  state: string;
  locationDetails: string;
};

function draftFromAccount(account: HydraAccount): ProfileDraft {
  return {
    name: account.profile.name,
    phone: account.phone,
    bio: account.profile.bio || "",
    propertyName: account.property.name,
    municipality: account.property.municipality,
    state: account.property.state || "BA",
    locationDetails: account.property.locationDetails || "",
  };
}

function MenuRow({ icon, title, subtitle, onClick, end }: { icon: ReactNode; title: string; subtitle?: string; onClick?: () => void; end?: ReactNode }) {
  const content = <><span className="profile-menu-icon">{icon}</span><div><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</div>{end || <ChevronRight size={19} />}</>;
  if (end) return <div className="profile-menu-row static-row">{content}</div>;
  return <button className="profile-menu-row" onClick={onClick}>{content}</button>;
}

export function ProfileScreen({ account, links, updateAccount, navigate, logout, saveAvatar, savePropertyCover, changeCredentials }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [info, setInfo] = useState<"terms" | "privacy" | "about" | null>(null);
  const [profile, setProfile] = useState<ProfileDraft>(() => draftFromAccount(account));
  const [security, setSecurity] = useState({ email: account.email, password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const initials = account.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HA";
  const isPlus = account.profile.plan === "Hydra Agro+";
  const heroStyle = account.property.coverUrl
    ? { backgroundImage: `linear-gradient(145deg, rgba(9,58,40,.89), rgba(5,38,26,.94)), url("${account.property.coverUrl}")` } as CSSProperties
    : undefined;

  function openEditor() {
    setProfile(draftFromAccount(account));
    setError("");
    setMessage("");
    setEditOpen(true);
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile.name.trim()) { setError("Informe o seu nome."); return; }
    if (!profile.propertyName.trim()) { setError("Informe o nome da propriedade."); return; }
    if (!isSupportedMunicipality(profile.municipality)) { setError("Escolha Brejões ou um município vizinho atendido."); return; }
    updateAccount((current) => ({
      ...current,
      phone: profile.phone.trim(),
      profile: { ...current.profile, name: profile.name.trim(), bio: profile.bio.trim() || undefined },
      property: {
        ...current.property,
        name: profile.propertyName.trim(),
        municipality: profile.municipality,
        state: "BA",
        locationDetails: profile.locationDetails.trim() || undefined,
      },
    }));
    setMessage("Perfil e propriedade atualizados.");
    setError("");
    setEditOpen(false);
  }

  async function chooseAvatar(file?: File) {
    setUploading("avatar");
    setMessage("");
    try {
      const changed = await saveAvatar(file);
      if (changed) setMessage("Foto do perfil atualizada.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível atualizar a foto.");
    } finally {
      setUploading(null);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

  async function chooseCover(file?: File) {
    setUploading("cover");
    setMessage("");
    try {
      const changed = await savePropertyCover(file);
      if (changed) setMessage("Capa da propriedade atualizada.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível atualizar a capa.");
    } finally {
      setUploading(null);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  }

  async function saveSecurity(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (security.password && security.password.length < 8) { setMessage("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (security.password !== security.confirmPassword) { setMessage("As senhas não coincidem."); return; }
    const values: { email?: string; password?: string } = {};
    if (security.email.trim().toLowerCase() !== account.email.toLowerCase()) values.email = security.email.trim();
    if (security.password) values.password = security.password;
    if (!values.email && !values.password) { setMessage("Nenhuma alteração para salvar."); return; }
    const result = await changeCredentials(values);
    setMessage(result.message);
    if (result.ok) setSecurityOpen(false);
  }

  function openInstagram(subject: "plus" | "support") {
    const text = subject === "plus"
      ? "Olá! Quero ativar o Hydra Agro+ por R$ 6/mês."
      : "Olá! Quero apoiar voluntariamente o desenvolvimento do Hydra Agro.";
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    window.open(hydraSupport.instagramUrl, "_blank", "noopener,noreferrer");
  }

  const infoContent = {
    terms: { title: "Termos de uso", text: "O Hydra Agro organiza informações fornecidas pelo produtor. O usuário é responsável pela veracidade dos registros e pelo uso seguro do aparelho. Recursos de drone, pagamento e hardware só operam quando a integração correspondente estiver contratada e configurada." },
    privacy: { title: "Política de privacidade", text: "Dados pessoais e rurais ficam vinculados à conta autenticada e protegidos por regras de acesso no servidor. Fotos são armazenadas em áreas controladas. O Hydra Agro não vende dados pessoais e permite solicitar correção ou exclusão pelos canais oficiais cadastrados pelo administrador." },
    about: { title: "Sobre o Hydra Agro", text: "Plataforma de tecnologia rural para gestão da propriedade, água, rebanho, identificação NFC/RFID, setores, comunidade e monitoramento inteligente. Desenvolvida inicialmente para Brejões e municípios vizinhos." },
  } as const;

  const isAdmin = ["moderator", "admin", "owner"].includes(account.role);

  return (
    <div className="screen profile-screen page-enter">
      <section className="profile-hero" style={heroStyle}>
        <div className="profile-rings" />
        <button className="profile-top-edit" onClick={openEditor} aria-label="Editar perfil"><Pencil size={18} /></button>
        <div className="profile-avatar-wrap">
          {account.profile.avatarUrl ? <img className="profile-avatar image" src={account.profile.avatarUrl} alt={`Foto de ${account.profile.name}`} /> : <span className="profile-avatar">{initials}</span>}
          <button className="avatar-edit-button" onClick={() => Capacitor.isNativePlatform() ? void chooseAvatar() : avatarFileRef.current?.click()} aria-label="Alterar foto do perfil" disabled={uploading === "avatar"}>{uploading === "avatar" ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />}</button>
          <input ref={avatarFileRef} className="hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseAvatar(event.target.files?.[0])} />
        </div>
        <h1>{account.profile.name}</h1>
        <strong>{account.property.name || "Propriedade não cadastrada"}</strong>
        <p>{account.property.municipality ? `${account.property.locationDetails ? `${account.property.locationDetails} · ` : ""}${account.property.municipality}, ${account.property.state}` : "Localização não informada"}</p>
        {account.profile.bio && <small className="profile-bio">{account.profile.bio}</small>}
      </section>

      {message && <div className="profile-message" role="status">{message}</div>}

      <section className={`plan-card ${isPlus ? "is-plus" : "is-free"}`}>
        <div className="plan-mark">{isPlus ? <Crown size={24} /> : <Sprout size={24} />}</div>
        <div><span>PLANO ATUAL</span><strong>{account.profile.plan}</strong><small>{isPlus ? "Membro Hydra Agro+ · painel premium ativo" : "Conheça o Hydra Agro+ · R$ 6 por mês"}</small></div>
        <button onClick={() => navigate("plus")}>{isPlus ? "Abrir painel" : "Conhecer"}</button>
      </section>

      {isAdmin && <section className="profile-group"><span className="group-label">ADMINISTRAÇÃO</span><div className="profile-menu-card admin-access-card"><MenuRow icon={<ShieldCheck size={21} />} title="Painel administrativo" subtitle={`Acesso ${account.role} validado pelo servidor`} onClick={() => navigate("admin")} /></div></section>}

      <section className="profile-group">
        <span className="group-label">MINHA CONTA</span>
        <div className="profile-menu-card">
          <MenuRow icon={<UserRound size={21} />} title="Dados pessoais" subtitle={account.email} onClick={openEditor} />
          <MenuRow icon={<Sparkles size={21} />} title="Hydra Agro+" subtitle={isPlus ? "Abrir painel de recursos premium" : "Plano oficial por R$ 6/mês"} onClick={() => navigate("plus")} />
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
          <MenuRow icon={<HeartHandshake size={21} />} title="Apoie o Hydra Agro" subtitle="Apoio voluntário, separado da assinatura" onClick={() => setSupportOpen(true)} />
          <MenuRow icon={<FileText size={21} />} title="Termos de uso" onClick={() => setInfo("terms")} />
          <MenuRow icon={<ShieldCheck size={21} />} title="Política de privacidade" onClick={() => setInfo("privacy")} />
          <MenuRow icon={<CircleHelp size={21} />} title="Sobre o Hydra Agro" onClick={() => setInfo("about")} />
        </div>
      </section>

      <section className="profile-group"><span className="group-label">SUPORTE E LINKS OFICIAIS</span><div className="profile-menu-card"><MenuRow icon={<Mail size={21} />} title="Suporte por e-mail" subtitle={hydraSupport.email} onClick={() => { window.location.href = `mailto:${hydraSupport.email}?subject=Suporte%20Hydra%20Agro`; }} /><MenuRow icon={<Instagram size={21} />} title="Instagram" subtitle={hydraSupport.instagramHandle} onClick={() => window.open(hydraSupport.instagramUrl, "_blank", "noopener,noreferrer")} />{links.map((link) => <MenuRow key={link.id} icon={<ExternalLink size={21} />} title={link.label} subtitle={link.description} onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} />)}</div></section>

      <button className="logout-button" onClick={() => setLogoutConfirm(true)}><LogOut size={19} /> Sair desta conta</button>
      <p className="profile-version">Hydra Agro · versão 1.1.0</p>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} eyebrow="PERFIL" title="Editar seus dados" wide>
        <form className="modal-form" onSubmit={saveProfile}>
          <div className="profile-media-editor">
            <button type="button" onClick={() => Capacitor.isNativePlatform() ? void chooseAvatar() : avatarFileRef.current?.click()} disabled={Boolean(uploading)}><span>{account.profile.avatarUrl ? <img src={account.profile.avatarUrl} alt="Foto atual" /> : initials}</span><div><strong>Foto de perfil</strong><small>JPG, PNG ou WebP</small></div><Camera size={18} /></button>
            <button type="button" onClick={() => Capacitor.isNativePlatform() ? void chooseCover() : coverFileRef.current?.click()} disabled={Boolean(uploading)}><span className="cover-thumb">{account.property.coverUrl ? <img src={account.property.coverUrl} alt="Capa atual" /> : <Sprout size={21} />}</span><div><strong>Capa da propriedade</strong><small>Imagem privada da sua conta</small></div>{uploading === "cover" ? <LoaderCircle size={18} className="spin" /> : <Camera size={18} />}</button>
            <input ref={coverFileRef} className="hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseCover(event.target.files?.[0])} />
          </div>
          <Field label="Nome"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></Field>
          <Field label="Sobre você (opcional)"><textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="Uma breve apresentação para a comunidade" maxLength={180} /></Field>
          <Field label="Telefone (opcional)"><input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="(75) 99999-9999" /></Field>
          <Field label="Nome da propriedade"><input value={profile.propertyName} onChange={(event) => setProfile({ ...profile, propertyName: event.target.value })} /></Field>
          <Field label="Localização ou referência (opcional)"><input value={profile.locationDetails} onChange={(event) => setProfile({ ...profile, locationDetails: event.target.value })} placeholder="Ex.: Comunidade Lagoa Nova" /></Field>
          <div className="field-combo"><Field label="Cidade"><select value={profile.municipality} onChange={(event) => { setProfile({ ...profile, municipality: event.target.value }); setError(""); }}><option value="">Selecione</option>{supportedMunicipalities.map((city) => <option key={city}>{city}</option>)}</select></Field><Field label="Estado"><select value="BA" disabled><option value="BA">Bahia</option></select></Field></div>
          <Field label="E-mail" hint="Altere o e-mail em Segurança."><input value={account.email} disabled /></Field>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setEditOpen(false)}>Cancelar</button><button className="primary-button" type="submit">Confirmar alterações</button></div>
        </form>
      </Modal>

      <Modal open={securityOpen} onClose={() => setSecurityOpen(false)} eyebrow="SEGURANÇA" title="E-mail e senha">
        <form className="modal-form" onSubmit={saveSecurity}>
          <Field label="E-mail"><input type="email" value={security.email} onChange={(event) => setSecurity({ ...security, email: event.target.value })} /></Field>
          <Field label="Nova senha" hint="Deixe em branco para manter a atual."><input type="password" value={security.password} onChange={(event) => setSecurity({ ...security, password: event.target.value })} autoComplete="new-password" /></Field>
          <Field label="Confirmar nova senha"><input type="password" value={security.confirmPassword} onChange={(event) => setSecurity({ ...security, confirmPassword: event.target.value })} autoComplete="new-password" /></Field>
          {message && <p className="form-notice">{message}</p>}
          <div className="modal-action-row"><button className="secondary-button" type="button" onClick={() => setSecurityOpen(false)}>Cancelar</button><button className="primary-button" type="submit">Confirmar com segurança</button></div>
        </form>
      </Modal>

      <Modal open={supportOpen} onClose={() => setSupportOpen(false)} eyebrow="APOIO VOLUNTÁRIO" title="Apoie o Hydra Agro">
        <div className="support-modal"><span><HeartHandshake size={31} /></span><p>O Hydra Agro nasceu para aproximar tecnologia e campo, ajudando produtores a organizar suas propriedades, cuidar melhor dos recursos e usar a tecnologia de forma simples no dia a dia.</p><p>O projeto continua crescendo, e cada apoio ajuda no desenvolvimento de novas ferramentas e na evolução da plataforma. Se você acredita nessa ideia e quiser contribuir, qualquer apoio faz diferença.</p><div className="support-separation-note"><Crown size={18} /><span><strong>Apoio não é assinatura</strong><small>A contribuição é opcional, não libera o Hydra Agro+ e não bloqueia nenhuma função gratuita.</small></span></div><button className="primary-button full" onClick={() => openInstagram("support")}><Instagram size={18} /> Quero apoiar o projeto</button><small>{hydraSupport.instagramHandle}</small></div>
      </Modal>

      <Modal open={Boolean(info)} onClose={() => setInfo(null)} title={info ? infoContent[info].title : "Informações"}>
        {info && <div className="legal-copy"><p>{infoContent[info].text}</p><button className="primary-button full" onClick={() => setInfo(null)}>Fechar</button></div>}
      </Modal>

      <Modal open={logoutConfirm} onClose={() => setLogoutConfirm(false)} eyebrow="CONFIRMAÇÃO" title="Sair desta conta?">
        <div className="confirm-action"><span><LogOut size={27} /></span><p>A sessão local será encerrada e os dados derivados desta conta serão removidos da tela. Seus registros já sincronizados permanecem no servidor.</p><div className="modal-action-row"><button className="secondary-button" onClick={() => setLogoutConfirm(false)}>Continuar no app</button><button className="danger-button" onClick={() => void logout()}>Confirmar saída</button></div></div>
      </Modal>
    </div>
  );
}
