import { ChevronRight, Copy, Nfc, QrCode, Radio, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "../../components/ui";
import { showAppToast } from "../../components/modal-system";
import type { Animal } from "../../lib/hydra-types";
import { isWebNfcSupported, writeWebNfcUrl } from "../../services/nfc-service";
import { buildPublicAnimalUrl } from "./public-animal-card";

export function AnimalPublicShare({ animal }: { animal: Animal }) {
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const publicUrl = useMemo(() => buildPublicAnimalUrl(animal), [animal]);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(publicUrl)}`;
  const canWriteWebNfc = isWebNfcSupported();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showAppToast("Link público copiado");
    } catch {
      showAppToast("Não foi possível copiar o link.", "error");
    }
  }

  async function shareLink() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: `${animal.name || animal.identification} · Hydra Agro`, text: "Ficha pública do animal no Hydra Agro", url: publicUrl });
    } catch {
      // Cancelar o compartilhamento não precisa gerar erro.
    }
  }

  async function writeTag() {
    setWriting(true);
    try {
      await writeWebNfcUrl(publicUrl);
      showAppToast("Link público gravado na etiqueta NFC");
    } catch (caught) {
      showAppToast(caught instanceof Error ? caught.message : "Não foi possível gravar a etiqueta.", "error");
    } finally {
      setWriting(false);
    }
  }

  return (
    <>
      <button className="animal-public-share-button" onClick={() => setOpen(true)}>
        <span><QrCode size={20} /></span>
        <div><strong>NFC / QR público</strong><small>Abrir uma ficha básica sem entrar na conta</small></div>
        <ChevronRight size={18} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} eyebrow="DEMONSTRAÇÃO" title="NFC e QR público" wide dismissible={!writing}>
        <div className="public-share-modal">
          <p className="public-share-intro">Este link contém somente uma cópia dos dados básicos mostrados abaixo. Informações privadas da conta e da propriedade não entram no link.</p>

          <div className="public-share-qr-wrap"><img src={qrUrl} alt={`QR Code da ficha pública de ${animal.name || animal.identification}`} /></div>
          <div className="public-share-link">{publicUrl}</div>

          <div className="public-share-actions">
            <button className="secondary-button" onClick={() => void copyLink()}><Copy size={17} /> Copiar link</button>
            <button className="secondary-button" onClick={() => void shareLink()}><Share2 size={17} /> Compartilhar</button>
            {canWriteWebNfc && <button className="primary-button full" onClick={() => void writeTag()} disabled={writing}><Radio size={17} /> {writing ? "Aproxime a etiqueta…" : "Gravar link na etiqueta NFC"}</button>}
          </div>

          <p className="public-share-note"><Nfc size={15} /> No iPhone, a etiqueta deve estar gravada como URL. Ao aproximar o aparelho, o sistema mostra a notificação e abre esta ficha no navegador. Para gravar pelo próprio site, use Android com Chrome e Web NFC compatível.</p>
        </div>
      </Modal>
    </>
  );
}
