"use client";

import "../../ranking.css";
import { useCallback, useEffect, useState } from "react";
import { ArrowUp, Beef as Cow, Crown, Droplets, Info, MapPinned, RefreshCw, Trophy } from "lucide-react";
import { Modal, ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";
import { loadPropertyRanking, type PropertyRankingEntry } from "../../services/property-ranking";

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

function PodiumPlace({ item }: { item: PropertyRankingEntry }) {
  return (
    <div className={`ranking-podium-place place-${item.position} ${item.isMine ? "mine" : ""}`}>
      <div className="ranking-podium-mark">
        {item.position === 1 ? <Crown size={20} /> : <span>{item.position}º</span>}
      </div>
      <strong>{item.propertyName}</strong>
      <small>{item.municipality || "Município não informado"}</small>
      <b>{item.xp} XP</b>
    </div>
  );
}

export function ChallengesScreen({ account, onBack }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [ranking, setRanking] = useState<PropertyRankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState("");

  const waterDays = new Set(account.waterRecords.map((record) => record.date)).size;
  const identified = account.animals.filter((animal) => animal.electronicId).length;
  const monitoredSectors = new Set(account.monitoring.map((record) => record.sectorId).filter(Boolean)).size;
  const completedActivities = account.activities.filter((activity) => activity.done).length;
  const ownXp =
    account.animals.length * 10
    + identified * 20
    + account.waterRecords.length * 5
    + completedActivities * 10
    + account.monitoring.length * 10
    + account.sectors.length * 5;
  const myRanking = ranking.find((item) => item.isMine);
  const topThree = ranking.slice(0, 3);
  const podium = [topThree[1], topThree[0], topThree[2]].filter(Boolean) as PropertyRankingEntry[];
  const nextAhead = myRanking && myRanking.position > 1
    ? ranking.find((item) => item.position === myRanking.position - 1)
    : undefined;
  const xpToNext = myRanking && nextAhead ? Math.max(1, nextAhead.xp - myRanking.xp + 1) : 0;

  const refreshRanking = useCallback(async () => {
    setRankingLoading(true);
    setRankingError("");
    try {
      setRanking(await loadPropertyRanking());
    } catch {
      setRankingError("Não foi possível carregar o ranking agora.");
    } finally {
      setRankingLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRanking();
  }, [refreshRanking]);

  return (
    <div className="screen page-enter extra-screen">
      <ScreenHeader title="Desafios" subtitle="XP e progresso calculados pelos registros da propriedade." onBack={onBack} action={<button className="icon-button bare" onClick={() => setInfoOpen(true)} aria-label="Sobre XP e desafios"><Info size={21} /></button>} />

      <section className="property-ranking-section" aria-label="Ranking de propriedades">
        <header className="property-ranking-head">
          <span><Trophy size={22} /></span>
          <div>
            <strong>Ranking de propriedades</strong>
            <small>Quanto mais registros reais, maior o XP.</small>
          </div>
          <button className={rankingLoading ? "loading" : ""} onClick={() => void refreshRanking()} disabled={rankingLoading} aria-label="Atualizar ranking"><RefreshCw size={18} /></button>
        </header>

        {rankingLoading && <p className="property-ranking-message">Carregando propriedades…</p>}
        {!rankingLoading && rankingError && <p className="property-ranking-message error">{rankingError}</p>}
        {!rankingLoading && !rankingError && ranking.length === 0 && <p className="property-ranking-message">Ainda não há propriedades com nome cadastradas no ranking.</p>}

        {!rankingLoading && !rankingError && ranking.length > 0 && (
          <>
            <div className={`ranking-podium count-${Math.min(3, topThree.length)}`}>
              {podium.map((item) => <PodiumPlace key={item.propertyId} item={item} />)}
            </div>

            <div className="ranking-my-position">
              <div className="ranking-my-number">
                <span>{myRanking ? `${myRanking.position}º` : "—"}</span>
                <small>sua posição</small>
              </div>
              <div className="ranking-my-copy">
                <strong>{account.property.name || "Sua propriedade"}</strong>
                <small>{myRanking ? `${myRanking.xp} XP acumulados` : `${ownXp} XP calculados`}</small>
                {myRanking?.position === 1
                  ? <p>Você está liderando o ranking.</p>
                  : myRanking && nextAhead
                    ? <p><ArrowUp size={13} /> Faltam {xpToNext} XP para ultrapassar {nextAhead.propertyName}.</p>
                    : <p>Sua posição aparece assim que o ranking terminar de sincronizar.</p>}
              </div>
            </div>

            <div className="ranking-table-head"><span>Classificação</span><span>XP</span></div>
            <div className="property-ranking-list">
              {ranking.map((item) => (
                <div key={item.propertyId} className={`property-ranking-row ${item.isMine ? "mine" : ""}`}>
                  <span className="property-ranking-position">{item.position}º</span>
                  <div className="property-ranking-copy">
                    <strong>{item.propertyName}</strong>
                    <small>{item.municipality || "Município não informado"}{item.isMine ? " · sua propriedade" : ""}</small>
                  </div>
                  <strong className="property-ranking-xp">{item.xp} XP</strong>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="xp-rules">Animal 10 XP · NFC vinculado +20 · água 5 · atividade concluída 10 · monitoramento 10 · setor 5.</p>
      </section>

      <div className="challenge-heading"><h2>Seus desafios</h2><span>Dados reais</span></div>
      <div className="challenge-list">
        <ProgressCard icon={<Droplets size={24} />} title="7 dias registrando água" text="Avança em cada dia diferente com uma leitura registrada." current={Math.min(waterDays, 7)} target={7} footer="Atualizado pelas leituras de água" />
        <ProgressCard icon={<Cow size={24} />} title="Rebanho identificado" text="Avança quando um animal cadastrado recebe uma identificação eletrônica." current={identified} target={account.animals.length} footer="Atualizado pelas vinculações NFC/RFID" />
        <ProgressCard icon={<MapPinned size={24} />} title="Propriedade monitorada" text="Avança quando um setor recebe ao menos um monitoramento real." current={monitoredSectors} target={account.sectors.length} footer="Atualizado pelo histórico de monitoramento" />
      </div>

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Como funciona o XP">
        <div className="legal-copy">
          <p>As propriedades são ordenadas do maior para o menor XP. O primeiro lugar é a propriedade com mais XP.</p>
          <p>O XP usa somente registros reais: 10 por animal cadastrado, mais 20 quando ele recebe NFC/RFID, 5 por registro de água, 10 por atividade concluída, 10 por monitoramento e 5 por setor criado.</p>
          <p>Nome do proprietário, e-mail, telefone e outros dados privados não aparecem no ranking.</p>
          <button className="primary-button full" onClick={() => setInfoOpen(false)}>Entendi</button>
        </div>
      </Modal>
    </div>
  );
}
