import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Beef as Cow, CheckCircle2, ChevronRight, Keyboard, LoaderCircle, Nfc, Radio, ScanLine, Settings, Smartphone } from "lucide-react";
import { EmptyState, Field, LoadingButton, Modal, ScreenHeader } from "../../components/ui";
import { showAppToast } from "../../components/modal-system";
import type { Animal, HydraAccount, UpdateAccount } from "../../lib/hydra-types";
import { getNfcAvailability, openNfcSettings, readNfcTag, stopNfcRead, type NfcAvailability } from "../../services/nfc-service";

type Props = {
  account: HydraAccount;
  updateAccount: UpdateAccount;
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
  const [linking, setLinking] = useState(false);

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

  async function link(event: FormEvent) {
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
    setLinking(true);
    setMessage("");
    try {
      await updateAccount((current) => ({ ...current, animals: current.animals.map((animal) => animal.id === animalId ? { ...animal, electronicId: normalized, history: [...(animal.history ?? []), { id: `history-${Date.now()}`, date: new Date().toISOString(), type: "Identificação eletrônica", description: `Tag ${normalized} vinculada` }] } : animal) }), { requireRemote: true });
      setResult(linked ? { ...linked, electronicId: normalized } : null);
      setMessage("Identificação vinculada com sucesso.");
      showAppToast("Identificação NFC/RFID vinculada");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível vincular a identificação.");
    } finally {
      setLinking(false);
    }
  }

  async function startNativeRead() {
    const currentAvailability = await getNfcAvailability().catch(() => "unsupported" as NfcAvailability);
    setAvailability(currentAvailability);
    if (currentAvailability !== "ready") {
      setNativeInfo(true);
      return;
    }
    setScanning(true);
    setMessage("Aproxime o brinco eletrônico ou tag do celular.");
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

  const availabilityText = availability === "ready"
    ? "NFC pronto no celular"
    : availability === "disabled"
      ? "NFC do celular desativado"
      : availability === "unsupported"
        ? "Dispositivo sem NFC compatível"
        : "Leitura por aproximação somente no app Android";

  return (
    <div className="screen page-enter extra-screen nfc-screen">
      <ScreenHeader eyebrow="IDENTIFICAÇÃO ANIMAL" title="Central NFC / RFID" subtitle="Leitura por aproximação no celular Android compatível; código manual disponível em qualquer dispositivo." onBack={onBack} />

      <section className="nfc-desktop-notice" aria-label="NFC disponível somente no celular">
        <span><Smartphone size={26} /></span>
        <div>
          <small>RECURSO MÓVEL</small>
          <strong>A leitura NFC por aproximação é feita no celular</strong>
          <p>Notebooks e computadores normalmente não possuem leitor NFC compatível com o Hydra Agro. Para encostar a tag ou brinco eletrônico, abra o aplicativo em um celular Android com NFC. No computador, use o código da identificação para localizar ou vincular o animal.</p>
        </div>
      </section>

      <section className={`nfc-hero ${scanning ? "is-scanning" : ""}`}>
        <div className="nfc-waves"><span /><span /><span />{scanning ? <LoaderCircle size={38} className="spin" /> : <Nfc size={38} />}</div>
        <h2>{scanning ? "Lendo identificação…" : "Aproxime a identificação do celular"}</h2>
        <p>O código vem diretamente de uma tag real. A leitura por aproximação exige o aplicativo Android instalado em um celular com NFC.</p>
        <button className="nfc-native-read-button" onClick={() => void startNativeRead()} disabled={scanning}><Radio size={18} /> {scanning ? "Aguardando tag" : "Iniciar leitura no celular"}</button>
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
          <div className="manual-heading"><Keyboard size={21} /><div><strong>Código manual</strong><small>Disponível no celular, notebook e computador</small></div></div>
          {mode === "link" && <Field label="Animal"><select value={animalId} onChange={(event) => { setAnimalId(event.target.value); setMessage(""); }}><option value="">Selecione</option>{account.animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name || animal.identification} · {animal.identification}</option>)}</select></Field>}
          <Field label="Código da identificação"><input value={code} onChange={(event) => { setCode(event.target.value); setMessage(""); setResult(null); }} placeholder="Digite o código NFC/RFID" /></Field>
          {message && <p className={`nfc-message ${result ? "success" : ""}`}>{result ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}{message}</p>}
          <LoadingButton className="primary-button full" type="submit" loading={linking} loadingLabel="Vinculando...">{mode === "locate" ? <><ScanLine size={18} /> Localizar animal</> : <><Nfc size={18} /> Confirmar vínculo</>}</LoadingButton>
        </form>
      )}

      {result && <button className="nfc-result-card" onClick={() => onFound(result)}><span><Cow size={27} /></span><div><small>{result.identification}</small><strong>{result.name || "Animal sem nome"}</strong><p>{result.species}{result.breed ? ` · ${result.breed}` : ""}</p></div><ChevronRight size={20} /></button>}

      <Modal open={nativeInfo} onClose={() => setNativeInfo(false)} eyebrow="LEITURA NFC" title={availability === "disabled" ? "Ative o NFC do celular" : "Use um celular Android com NFC"}>
        <div className="hardware-message">
          <span><Smartphone size={31} /></span>
          <p>{availability === "disabled" ? "O celular possui NFC, mas o recurso está desativado. Ative-o nas configurações do Android e tente novamente." : availability === "web" ? "A leitura por aproximação não é feita pelo navegador do notebook ou computador. Abra o aplicativo Hydra Agro em um celular Android compatível com NFC. Aqui, você pode continuar usando o código manual da identificação." : "Este dispositivo não possui hardware NFC compatível para a leitura do Hydra Agro. Use um celular Android com NFC ou informe o código da identificação manualmente."}</p>
          <div className="future-data-list"><div><Nfc size={17} /> Aproximação somente em celular compatível</div><div><span className="tiny-shield" /> Código manual disponível em qualquer dispositivo</div></div>
          {availability === "disabled" && <button className="secondary-button full" onClick={() => void openNfcSettings()}><Settings size={17} /> Abrir configurações</button>}
          <button className="primary-button full" onClick={() => setNativeInfo(false)}>Usar código manual</button>
        </div>
      </Modal>
    </div>
  );
}
