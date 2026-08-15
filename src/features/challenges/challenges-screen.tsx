"use client";

import { useState } from "react";
import { Beef as Cow, Droplets, Info, MapPinned, Trophy } from "lucide-react";
import { Modal, ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";

type Props = { account: HydraAccount; onBack: () => void };

function ProgressCard({ icon, title, text, current, target, footer }: { icon: React.ReactNode; title: string; text: string; current: number; target: number; footer: string }) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <article className="challenge-card">
      <span className="challenge-icon">{icon}</span>
      <div className="challenge-copy"><strong>{title}</strong><p>{text}</p></div>
      <em>{current}/{target}</em>
      <div className="challenge-progress"><i style={{ width: `${percent}%` }} /></div>
      <small>{footer}<b>{percent}%</b></small>
    </article>
  );
}

export function ChallengesScreen({ account, onBack }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const waterDays = new Set(account.waterRecords.map((record) => record.date)).size;
  const identified = account.animals.filter((animal) => animal.electronicId).length;
  const monitoredSectors = new Set(account.monitoring.map((record) => record.sectorId).filter(Boolean)).size;

  return (
    <div className="screen page-enter extra-screen">
      <ScreenHeader title="Desafios" subtitle="Progresso calculado somente com seus registros." onBack={onBack} action={<button className="icon-button bare" onClick={() => setInfoOpen(true)} aria-label="Sobre os desafios"><Info size={21} /></button>} />

      <section className="ranking-hero">
        <span><Trophy size={37} /></span>
        <small>RANKING SUSTENTÁVEL</small>
        <h2>Sem posição</h2>
        <p>O ranking multiusuário será exibido quando a comunidade conectada estiver disponível.</p>
      </section>

      <div className="challenge-heading"><h2>Seus desafios</h2><span>Dados reais</span></div>
      <div className="challenge-list">
        <ProgressCard icon={<Droplets size={24} />} title="7 dias registrando água" text="Avança em cada dia diferente com uma leitura registrada." current={Math.min(waterDays, 7)} target={7} footer="Atualizado pelas leituras de água" />
        <ProgressCard icon={<Cow size={24} />} title="Rebanho identificado" text="Avança quando um animal cadastrado recebe uma identificação eletrônica." current={identified} target={account.animals.length} footer="Atualizado pelas vinculações NFC/RFID" />
        <ProgressCard icon={<MapPinned size={24} />} title="Propriedade monitorada" text="Avança quando um setor recebe ao menos um monitoramento real." current={monitoredSectors} target={account.sectors.length} footer="Atualizado pelo histórico de monitoramento" />
      </div>

      <section className="ranking-empty">
        <div><Trophy size={22} /><strong>Ranking geral</strong></div>
        <p>Nenhuma pessoa fictícia será adicionada. Perfis reais aparecerão após a integração comunitária.</p>
      </section>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Como funcionam os desafios">
        <div className="legal-copy"><p>O progresso usa exclusivamente leituras de água, identificações eletrônicas e monitoramentos registrados na sua conta. Não há pontos, pessoas ou resultados inventados.</p><button className="primary-button full" onClick={() => setInfoOpen(false)}>Entendi</button></div>
      </Modal>
    </div>
  );
}
