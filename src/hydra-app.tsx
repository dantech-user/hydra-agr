import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ClipboardCheck, Beef as Cow, Droplets, Home, MapPin, Nfc, Plus, RadioTower, Send, UserRound, X } from "lucide-react";
import { SplashBrand } from "./components/brand";
import { requestCloseTopOverlay, useAppOverlay, useModalNavigation } from "./components/modal-system";
import { BackendSetupScreen, BannedScreen, PasswordRecoveryScreen, SyncBanner } from "./components/system-state";
import { AppToastRegion } from "./components/ui";
import { AuthFlow } from "./features/auth/auth-flow";
import { HomeScreen } from "./features/home/home-screen";
import { useHydraStore } from "./hooks/use-hydra-store";
import type { AppRoute, MainTab } from "./lib/hydra-types";
import { handleAuthCallbackUrl, isAuthCallbackUrl } from "./services/supabase";

const WaterScreen = lazy(() => import("./features/water/water-screen").then((module) => ({ default: module.WaterScreen })));
const HerdScreen = lazy(() => import("./features/herd/herd-screen").then((module) => ({ default: module.HerdScreen })));
const MonitorScreen = lazy(() => import("./features/monitor/monitor-screen").then((module) => ({ default: module.MonitorScreen })));
const ProfileScreen = lazy(() => import("./features/profile/profile-screen").then((module) => ({ default: module.ProfileScreen })));
const CommunityScreen = lazy(() => import("./features/community/community-screen").then((module) => ({ default: module.CommunityScreen })));
const ChallengesScreen = lazy(() => import("./features/challenges/challenges-screen").then((module) => ({ default: module.ChallengesScreen })));
const PropertyScreen = lazy(() => import("./features/property/property-screen").then((module) => ({ default: module.PropertyScreen })));
const ActivitiesScreen = lazy(() => import("./features/activities/activities-screen").then((module) => ({ default: module.ActivitiesScreen })));
const NfcScreen = lazy(() => import("./features/nfc/nfc-screen").then((module) => ({ default: module.NfcScreen })));
const NotificationsScreen = lazy(() => import("./features/notifications/notifications-screen").then((module) => ({ default: module.NotificationsScreen })));
const PlusScreen = lazy(() => import("./features/premium/plus-screen").then((module) => ({ default: module.PlusScreen })));
const AdminScreen = lazy(() => import("./features/admin/admin-screen").then((module) => ({ default: module.AdminScreen })));

const mainTabs: { id: MainTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "water", label: "Água", icon: Droplets },
  { id: "herd", label: "Rebanho", icon: Cow },
  { id: "monitor", label: "Monitorar", icon: RadioTower },
  { id: "profile", label: "Perfil", icon: UserRound },
];

export default function HydraApp() {
  const store = useHydraStore();
  const [splash, setSplash] = useState(true);
  const [route, setRoute] = useState<AppRoute>("home");
  const [backRoute, setBackRoute] = useState<AppRoute>("home");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickClosing, setQuickClosing] = useState(false);
  const [routeMotion, setRouteMotion] = useState<"forward" | "back">("forward");
  const [animalToOpen, setAnimalToOpen] = useState<string>();
  const [nfcAnimalId, setNfcAnimalId] = useState<string>();
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [quickIntent, setQuickIntent] = useState<{ kind: "water" | "animal" | "activity" | "sector" | "post"; request: number }>();
  const quickTimer = useRef<number | null>(null);
  const modalNavigationOpen = useModalNavigation();

  useAppOverlay(quickOpen, () => closeQuick());

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function handlePointerDown(event: PointerEvent) {
      if (reducedMotion.matches || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!(target instanceof HTMLButtonElement) || target.disabled) return;
      const bounds = target.getBoundingClientRect();
      const diameter = Math.max(bounds.width, bounds.height) * 1.5;
      const ripple = document.createElement("span");
      ripple.className = "touch-ripple";
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${event.clientX - bounds.left - diameter / 2}px`;
      ripple.style.top = `${event.clientY - bounds.top - diameter / 2}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
      if (target.matches(".primary-button, .icon-button.accent, .bottom-nav button, .toggle, .home-fab-label")) window.navigator.vibrate?.(7);
    }
    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => () => { if (quickTimer.current) window.clearTimeout(quickTimer.current); }, []);

  useEffect(() => {
    if (!store.account) {
      setRoute("home");
      setBackRoute("home");
      setQuickOpen(false);
      setQuickIntent(undefined);
      setAnimalToOpen(undefined);
      setNfcAnimalId(undefined);
      return;
    }
    if (route === "admin" && !["moderator", "admin", "owner"].includes(store.account.role)) setRoute("home");
  }, [store.account?.id, store.account?.role]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener("backButton", () => {
      if (quickOpen) { closeQuick(); return; }
      if (modalNavigationOpen) { requestCloseTopOverlay(); return; }
      if (!store.account) { void CapacitorApp.exitApp(); return; }
      if (!["home", "water", "herd", "monitor", "profile"].includes(route)) { goBack(); return; }
      if (route !== "home") { navigate("home"); return; }
      void CapacitorApp.exitApp();
    }).then((listener) => { handle = listener; });
    return () => { void handle?.remove(); };
  }, [quickOpen, modalNavigationOpen, route, store.account]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !store.configured) return;
    let active = true;
    let handle: { remove: () => Promise<void> } | undefined;
    async function receive(url?: string) {
      if (!url?.startsWith("br.com.hydraagro.app://auth/")) return;
      try {
        const recovery = await handleAuthCallbackUrl(url);
        if (active && recovery) setPasswordRecovery(true);
      } catch {
        // O fluxo de login permanece disponível quando o link expirou.
      }
    }
    void CapacitorApp.getLaunchUrl().then((result) => void receive(result?.url));
    void CapacitorApp.addListener("appUrlOpen", ({ url }) => { void receive(url); }).then((listener) => { handle = listener; });
    return () => { active = false; void handle?.remove(); };
  }, [store.configured]);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || !store.configured || !isAuthCallbackUrl(window.location.href)) return;
    let active = true;
    void handleAuthCallbackUrl(window.location.href)
      .then((recovery) => {
        if (!active || !recovery) return;
        setPasswordRecovery(true);
        window.history.replaceState({}, document.title, "/");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [store.configured]);

  function navigate(next: AppRoute) {
    if (next === route) return;
    if (next === "admin" && !["moderator", "admin", "owner"].includes(store.account?.role ?? "user")) return;
    const currentIndex = mainTabs.findIndex((tab) => tab.id === route);
    const nextIndex = mainTabs.findIndex((tab) => tab.id === next);
    setRouteMotion(currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex ? "back" : "forward");
    if (!["home", "water", "herd", "monitor", "profile"].includes(next)) setBackRoute(route);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setRouteMotion("back");
    setRoute(backRoute === route ? "home" : backRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openQuick() {
    if (quickTimer.current) window.clearTimeout(quickTimer.current);
    setQuickClosing(false);
    setQuickOpen(true);
  }

  function closeQuick(afterClose?: () => void) {
    if (quickClosing) return;
    setQuickClosing(true);
    quickTimer.current = window.setTimeout(() => {
      setQuickOpen(false);
      setQuickClosing(false);
      afterClose?.();
    }, 230);
  }

  function openNfc(animalId?: string) {
    setNfcAnimalId(animalId);
    navigate("nfc");
  }

  function launchQuick(kind: NonNullable<typeof quickIntent>["kind"], next: AppRoute) {
    setQuickIntent((current) => ({ kind, request: (current?.request ?? 0) + 1 }));
    navigate(next);
  }

  if (!store.configured) return <BackendSetupScreen />;

  if (!store.ready || splash) {
    return <main className="splash-screen"><div className="splash-glow" /><SplashBrand /><div className="splash-loader"><span /></div><p>TECNOLOGIA QUE NASCE DO CAMPO</p></main>;
  }

  if (!store.account) {
    return <AuthFlow onLogin={store.login} onSignup={store.createAccount} onResetPassword={store.resetPassword} />;
  }

  if (store.account.bannedAt) return <BannedScreen reason={store.account.banReason} logout={store.logout} />;

  if (passwordRecovery) return <PasswordRecoveryScreen save={async (password) => { const result = await store.changeCredentials({ password }); if (result.ok) window.setTimeout(() => setPasswordRecovery(false), 650); return result; }} logout={async () => { setPasswordRecovery(false); await store.logout(); }} />;

  const account = store.account;

  function mainContent() {
    switch (route) {
      case "home": return <HomeScreen account={account} announcements={store.announcements} navigate={navigate} onQuickAction={openQuick} />;
      case "water": return <WaterScreen account={account} updateAccount={store.updateAccount} createRecordRequest={quickIntent?.kind === "water" ? quickIntent.request : undefined} onRequestHandled={() => setQuickIntent(undefined)} />;
      case "herd": return <HerdScreen account={account} updateAccount={store.updateAccount} openNfc={openNfc} focusAnimalId={animalToOpen} saveAnimalPhoto={store.saveAnimalPhoto} createRequest={quickIntent?.kind === "animal" ? quickIntent.request : undefined} onRequestHandled={() => setQuickIntent(undefined)} />;
      case "monitor": return <MonitorScreen account={account} updateAccount={store.updateAccount} saveMonitoringPhoto={store.saveMonitoringPhoto} createSectorRequest={quickIntent?.kind === "sector" ? quickIntent.request : undefined} onRequestHandled={() => setQuickIntent(undefined)} />;
      case "profile": return <ProfileScreen account={account} links={store.links} updateAccount={store.updateAccount} navigate={navigate} logout={store.logout} saveAvatar={store.saveAvatar} savePropertyCover={store.savePropertyCover} changeCredentials={store.changeCredentials} />;
      case "community": return <CommunityScreen account={account} onBack={goBack} publishPost={store.publishPost} likePost={store.likePost} commentPost={store.commentPost} deletePost={store.deletePost} refreshCommunity={store.refreshCommunity} createRequest={quickIntent?.kind === "post" ? quickIntent.request : undefined} onRequestHandled={() => setQuickIntent(undefined)} />;
      case "challenges": return <ChallengesScreen account={account} onBack={goBack} />;
      case "property": return <PropertyScreen account={account} updateAccount={store.updateAccount} onBack={goBack} />;
      case "activities": return <ActivitiesScreen account={account} updateAccount={store.updateAccount} onBack={goBack} createRequest={quickIntent?.kind === "activity" ? quickIntent.request : undefined} onRequestHandled={() => setQuickIntent(undefined)} />;
      case "nfc": return <NfcScreen account={account} updateAccount={store.updateAccount} onBack={goBack} initialAnimalId={nfcAnimalId} onRealRead={store.registerNfcRead} onFound={(animal) => { setAnimalToOpen(animal.id); navigate("herd"); }} />;
      case "notifications": return <NotificationsScreen account={account} updateAccount={store.updateAccount} onBack={goBack} />;
      case "plus": return <PlusScreen account={account} updateAccount={store.updateAccount} onBack={goBack} />;
      case "admin": return ["moderator", "admin", "owner"].includes(account.role) ? <AdminScreen account={account} onBack={goBack} /> : <HomeScreen account={account} announcements={store.announcements} navigate={navigate} onQuickAction={openQuick} />;
      default: return null;
    }
  }

  const activeTab: MainTab = (["home", "water", "herd", "monitor", "profile"] as string[]).includes(route)
    ? route as MainTab
    : route === "property" || route === "plus" || route === "admin" ? "profile"
    : route === "nfc" ? "herd"
    : "home";
  const activeIndex = mainTabs.findIndex((tab) => tab.id === activeTab);
  const navStyle = { "--active-index": activeIndex } as CSSProperties;

  return (
    <main className="app-shell">
      <div className={`phone-app ${modalNavigationOpen ? "is-overlay-open" : ""}`}>
        <SyncBanner status={store.syncStatus} error={store.lastError} retry={store.retrySync} />
        <div key={route} className={`app-content route-motion-${routeMotion}`}><Suspense fallback={<div className="route-loading"><span /><small>Carregando módulo…</small></div>}>{mainContent()}</Suspense></div>

        <nav className={`bottom-nav ${modalNavigationOpen ? "is-hidden" : ""}`} aria-label="Navegação principal" aria-hidden={modalNavigationOpen} style={navStyle}>
          <span className="bottom-nav-indicator" aria-hidden="true" />
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => navigate(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined}><span><Icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 2} /></span><small>{tab.label}</small></button>;
          })}
        </nav>

        {quickOpen && <div className={`quick-layer ${quickClosing ? "is-closing" : ""}`} onMouseDown={() => closeQuick()}><section className="quick-sheet" onMouseDown={(event) => event.stopPropagation()}><div className="sheet-handle" /><header><div><span className="eyebrow orange">AÇÃO RÁPIDA</span><h2>O que deseja fazer?</h2></div><button className="icon-button" onClick={() => closeQuick()} aria-label="Fechar ações rápidas"><X size={22} /></button></header><div className="quick-grid"><QuickAction index={0} icon={<Droplets size={22} />} title="Registrar água" subtitle="Adicionar uma leitura" onClick={() => closeQuick(() => launchQuick("water", "water"))} /><QuickAction index={1} icon={<Cow size={22} />} title="Cadastrar animal" subtitle="Adicionar ao rebanho" onClick={() => closeQuick(() => launchQuick("animal", "herd"))} /><QuickAction index={2} icon={<Nfc size={22} />} title="Ler identificação" subtitle="NFC/RFID ou código" onClick={() => closeQuick(() => openNfc())} /><QuickAction index={3} icon={<ClipboardCheck size={22} />} title="Nova atividade" subtitle="Organizar a rotina" onClick={() => closeQuick(() => launchQuick("activity", "activities"))} /><QuickAction index={4} icon={<MapPin size={22} />} title="Criar setor" subtitle="Mapear a propriedade" onClick={() => closeQuick(() => launchQuick("sector", "monitor"))} /><QuickAction index={5} icon={<Send size={22} />} title="Nova publicação" subtitle="Compartilhar no feed" onClick={() => closeQuick(() => launchQuick("post", "community"))} /></div></section></div>}
        <AppToastRegion />
      </div>
    </main>
  );
}

function QuickAction({ icon, title, subtitle, onClick, index }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; index: number }) {
  return <button style={{ "--quick-index": index } as CSSProperties} onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><small>{subtitle}</small></div><Plus size={17} /></button>;
}
