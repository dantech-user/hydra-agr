import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Beef as Cow, CheckCircle2, ChevronRight, Keyboard, LoaderCircle, Nfc, Radio, ScanLine, Settings, Smartphone } from "lucide-react";
import { EmptyState, Field, Modal, ScreenHeader } from "../../components/ui";
import type { Animal, HydraAccount } from "../../lib/hydra-types";
import { getNfcAvailability, openNfcSettings, readNfcTag, stopNfcRead, type NfcAvailability } from "../../services/nfc-service";

type Props = {
  account: HydraAccount;
  updateAccount: (updater: (current: HydraAccount) => HydraAccount) => void;
  onBack: () => void;
  onFound: (animal: Animal) => void;
  initialAnimalId?: string;
  onRealRead: (code: string) => Promise<boolean>;
};

export function NfcScreen({ account, updateAccount, onBack, onFound, initialAnimalId, onRealRead }: Props) {
  const [mode, setMode] = useState<"locate" | "link">(initialAnimalId ? "link" : "locate");
  const [code, setCode] = useState("");
  const [animalId, setAnimalId] = useState(initialAnimalId ?? "");
  const [result, setResult] = useState<Animal | null>(null);
  const [message, setMessage] = useState("");
  const [nativeInfo, setNativeInfo] = useState(false);
  const [availability, setAvailability] = useState<NfcAvailability>("web");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void getNfcAvailability().then(setAvailability).catch(() => setAvailability("unsupported"));
    return () => { void stopNfcRead(); };
  }, []);

  function findByCode(value: string) {
    const normalized = value.trim().toLowerCase();
    return account.animals.find((animal) => animal.electronicId?.trim().toLowerCase() === normalized) || null;
  }

  function locate(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setMessage("Digite o código da identificação.");
      return;
    }
    const found = findByCode(code);
    setResult(found);
    setMessage(found ? "Animal localizado. Abrindo a ficha…" : "Nenhum animal foi encontrado com esse código.");
    if (found) window.setTimeout(() => onFound(found), 350);
  }

  function link(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim();
    if (!animalId || !normalized) {
      setMessage("Selecione o animal e informe o código.");
      return;
    }
    const duplicate = account.animals.find((animal) => animal.electronicId?.toLowerCase() === normalized.toLowerCase() && animal.id !== animalId);
    if (duplicate) {
      setMessage(`Este código já pertence a ${duplicate.name || duplicate.identification}.`);
      return;
    }
    const linked = account.animals.find((animal) => animal.id === animalId) || null;
    updateAccount((current) => ({ ...current, animals: current.animals.map((animal) => animal.id === animalId ? { ...animal, electronicId: normalized, history: [...(animal.history ?? []), { id: `history-${Date.now()}`, date: new Date().toISOString(), type: "Identificação eletrônica", description: `Tag ${normalized} vinculada` }] } : animal) }));
    setResult(linked ? { ...linked, electronicId: normalized } : null);
    setMessage("Identificação vinculada com sucesso.");
  }

  async function startNativeRead() {
    const currentAvailability = await getNfcAvailability().catch(() => "unsupported" as NfcAvailability);
    setAvailability(currentAvailability);
    if (currentAvailability !== "ready") {
      setNativeInfo(true);
      return;
    }
    setScanning(true);
    setMessage("Aproxime o brinco eletrônico ou tag do aparelho.");
    try {
      const readCode = await readNfcTag();
      await onRealRead(readCode).catch(() => false);
      setCode(readCode);
      if (mode === "locate") {
        const found = findByCode(readCode);
        setResult(found);
        setMessage(found ? "Tag lida. Abrindo a ficha do animal…" : `Tag ${readCode} lida, mas ainda não está vinculada.`);
        if (found) window.setTimeout(() => onFound(found), 350);
      } else {
        setMessage(`Tag ${readCode} lida. Confirme o vínculo abaixo.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A leitura não pôde ser concluída.");
    } finally {
      setScanning(false);
    }
  }

  function switchMode(next: "locate" | "link") {
    setMode(next);
    setCode("");
    setResult(null);
    setMessage("");
  }

  const availabilityText = availability === "ready" ? "NFC pronto" : availability === "disabled" ? "NFC desativado" : availability === "unsupported" ? "Aparelho sem NFC" : "Leitura nativa somente no Android";

  return (
    <div className="screen page-enter extra-screen nfc-screen">
      <ScreenHeader eyebrow="IDENTIFICAÇÃO ANIMAL" title="Central NFC / RFID" subtitle="Brinco eletrônico ou chip compatível." onBack={onBack} />

      <section className={`nfc-hero ${scanning ? "is-scanning" : ""}`}>
        <div className="nfc-waves"><span /><span /><span />{scanning ? <LoaderCircle size={38} className="spin" /> : <Nfc size={38} />}</div>
        <h2>{scanning ? "Lendo identificação…" : "Aproxime a identificação"}</h2>
        <p>O código vem diretamente da tag real; nenhuma leitura é simulada.</p>
        <button onClick={() => void startNativeRead()} disabled={scanning}><Radio size={18} /> {scanning ? "Aguardando tag" : "Iniciar leitura"}</button>
        <small><Smartphone size={15} /> {availabilityText}</small>
      </section>

      <div className="segmented-control nfc-segment">
        <button className={mode === "locate" ? "active" : ""} onClick={() => switchMode("locate")}>Localizar animal</button>
        <button className={mode === "link" ? "active" : ""} onClick={() => switchMode("link")}>Vincular identificação</button>
      </div>

      {account.animals.length === 0 ? (
        <EmptyState icon={<Cow size={26} />} title="Cadastre um animal primeiro" text="A identificação eletrônica sempre precisa ser vinculada a uma ficha real." />
      ) : (
        <form className="nfc-manual-card" onSubmit={mode === "locate" ? locate : link}>
          <div className="manual-heading"><Keyboard size={21} /><div><strong>Código manual</strong><small>Alternativa quando a leitura não estiver disponível</small></div></div>
          {mode === "link" && <Field label="Animal"><select value={animalId} onChange={(event) => { setAnimalId(event.target.value); setMessage(""); }}><option value="">Selecione</option>{account.animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name || animal.identification} · {animal.identification}</option>)}</select></Field>}
          <Field label="Código da identificação"><input value={code} onChange={(event) => { setCode(event.target.value); setMessage(""); setResult(null); }} placeholder="Digite o código NFC/RFID" /></Field>
          {message && <p className={`nfc-message ${result ? "success" : ""}`}>{result ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}{message}</p>}
          <button className="primary-button full" type="submit">{mode === "locate" ? <><ScanLine size={18} /> Localizar animal</> : <><Nfc size={18} /> Confirmar vínculo</>}</button>
        </form>
      )}

      {result && <button className="nfc-result-card" onClick={() => onFound(result)}><span><Cow size={27} /></span><div><small>{result.identification}</small><strong>{result.name || "Animal sem nome"}</strong><p>{result.species}{result.breed ? ` · ${result.breed}` : ""}</p></div><ChevronRight size={20} /></button>}

      <Modal open={nativeInfo} onClose={() => setNativeInfo(false)} eyebrow="LEITURA NATIVA" title={availability === "disabled" ? "Ative o NFC do aparelho" : "NFC indisponível neste dispositivo"}>
        <div className="hardware-message">
          <span><Smartphone size={31} /></span>
          <p>{availability === "disabled" ? "O aparelho possui NFC, mas o recurso está desativado. Ative-o nas configurações do Android e tente novamente." : availability === "web" ? "A leitura real funciona no aplicativo Android instalado em um aparelho compatível. A entrada manual permanece disponível aqui." : "Este aparelho não possui hardware NFC compatível. Use o código impresso na identificação."}</p>
          <div className="future-data-list"><div><Nfc size={17} /> Somente tags reais</div><div><span className="tiny-shield" /> Código manual sempre disponível</div></div>
          {availability === "disabled" && <button className="secondary-button full" onClick={() => void openNfcSettings()}><Settings size={17} /> Abrir configurações</button>}
          <button className="primary-button full" onClick={() => setNativeInfo(false)}>Usar código manual</button>
        </div>
      </Modal>
    </div>
  );
}
