"use client";

import { Bell, BellOff } from "lucide-react";
import { EmptyState, ScreenHeader, Toggle } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  onBack: () => void;
};

export function NotificationsScreen({ account, updateAccount, onBack }: Props) {
  return (
    <div className="screen page-enter extra-screen">
      <ScreenHeader title="Notificações" subtitle="Alertas da propriedade e do aplicativo." onBack={onBack} />
      <div className="notification-settings">
        <div><span><Bell size={20} /></span><div><strong>Notificações do aplicativo</strong><small>Atividades, monitoramentos e comunidade</small></div><Toggle checked={account.settings.pushNotifications} label="Notificações do aplicativo" onChange={(pushNotifications) => updateAccount((current) => ({ ...current, settings: { ...current.settings, pushNotifications } }))} /></div>
        <div><span><BellOff size={20} /></span><div><strong>Alertas de água</strong><small>Dependem de registros suficientes</small></div><Toggle checked={account.settings.waterAlerts} label="Alertas de água" onChange={(waterAlerts) => updateAccount((current) => ({ ...current, settings: { ...current.settings, waterAlerts } }))} /></div>
      </div>
      {account.notifications.length === 0 ? <EmptyState icon={<Bell size={26} />} title="Nenhuma notificação" text="Quando houver algo importante e baseado em dados reais, aparecerá aqui." /> : <div className="notification-list">{account.notifications.map((item, index) => <div key={`${item}-${index}`}><span /><p>{item}</p></div>)}</div>}
    </div>
  );
}

