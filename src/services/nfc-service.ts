import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { CapacitorNfc, type NfcEvent } from "@capgo/capacitor-nfc";

export type NfcAvailability = "ready" | "disabled" | "unsupported" | "web";

export async function getNfcAvailability(): Promise<NfcAvailability> {
  if (!Capacitor.isNativePlatform()) return "web";
  const { supported } = await CapacitorNfc.isSupported();
  if (!supported) return "unsupported";
  const { status } = await CapacitorNfc.getStatus();
  return status === "NFC_OK" ? "ready" : status === "NFC_DISABLED" ? "disabled" : "unsupported";
}

export async function openNfcSettings() {
  await CapacitorNfc.showSettings();
}

function tagCode(event: NfcEvent) {
  const bytes = event.tag.id ?? [];
  if (bytes.length > 0) {
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  const payload = event.tag.ndefMessage?.[0]?.payload ?? [];
  if (payload.length > 0) {
    const decoded = new TextDecoder().decode(new Uint8Array(payload)).replace(/^\x02[a-z]{2}/i, "").trim();
    if (decoded) return decoded;
  }
  return "";
}

export async function readNfcTag(timeoutMs = 30_000): Promise<string> {
  const availability = await getNfcAvailability();
  if (availability !== "ready") {
    const error = new Error(availability);
    error.name = "NfcUnavailable";
    throw error;
  }

  return new Promise<string>(async (resolve, reject) => {
    let finished = false;
    let timer: number | undefined;
    const listener = await CapacitorNfc.addListener("nfcEvent", async (event) => {
      if (finished) return;
      const code = tagCode(event);
      if (!code) return;
      finished = true;
      if (timer) window.clearTimeout(timer);
      await listener.remove();
      await CapacitorNfc.stopScanning().catch(() => undefined);
      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      resolve(code);
    });

    timer = window.setTimeout(async () => {
      if (finished) return;
      finished = true;
      await listener.remove();
      await CapacitorNfc.stopScanning().catch(() => undefined);
      reject(new Error("Tempo de leitura esgotado."));
    }, timeoutMs);

    try {
      await CapacitorNfc.startScanning({
        invalidateAfterFirstRead: true,
        alertMessage: "Aproxime o brinco eletrônico ou tag do aparelho.",
        iosSessionType: "tag",
      });
    } catch (error) {
      finished = true;
      if (timer) window.clearTimeout(timer);
      await listener.remove();
      reject(error);
    }
  });
}

export async function stopNfcRead() {
  await CapacitorNfc.stopScanning().catch(() => undefined);
}
