import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const backendConfigured =
  /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) &&
  supabaseKey.length > 20 &&
  !supabaseKey.includes("SUBSTITUA");

const authStorage = {
  async getItem(key: string) {
    return (await Preferences.get({ key })).value;
  },
  async setItem(key: string, value: string) {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string) {
    await Preferences.remove({ key });
  },
};

export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-hydra-client": "hydra-agro-mobile/1.2.2" },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Backend não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}

function authCallbackParts(url: string) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const type = hash.get("type") || parsed.searchParams.get("type") || "";
  const hasCredentials = Boolean(
    parsed.searchParams.get("code") ||
    (hash.get("access_token") && hash.get("refresh_token")),
  );
  const recovery = type === "recovery" || parsed.pathname.includes("/auth/recovery");
  const callbackError = parsed.searchParams.get("error_description") || hash.get("error_description");
  return { parsed, hash, type, hasCredentials, recovery, callbackError };
}

export async function handleAuthCallbackUrl(url: string) {
  const client = requireSupabase();
  const { parsed, hash, recovery, callbackError } = authCallbackParts(url);

  if (callbackError) {
    throw new Error(decodeURIComponent(callbackError.replace(/\+/g, " ")));
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const code = parsed.searchParams.get("code");

  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
  } else if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else {
    throw new Error("Link de autenticação inválido ou expirado.");
  }

  return recovery;
}

/* Mantém esta função específica para o fluxo de recuperação usado pelo HydraApp. */
export function isAuthCallbackUrl(url: string) {
  try {
    const { hasCredentials, recovery } = authCallbackParts(url);
    return hasCredentials && recovery;
  } catch {
    return false;
  }
}

function isSignupConfirmationUrl(url: string) {
  try {
    const { hasCredentials, recovery, type } = authCallbackParts(url);
    if (!hasCredentials || recovery) return false;
    return type === "signup" || type === "email" || type === "magiclink" || type === "";
  } catch {
    return false;
  }
}

/*
 * O app desativa detectSessionInUrl porque o fluxo nativo usa deep link manual.
 * No navegador isso fazia o retorno da confirmação de cadastro ser ignorado.
 * Processamos somente confirmações de conta aqui; recovery continua no HydraApp.
 */
if (
  supabase &&
  typeof window !== "undefined" &&
  !Capacitor.isNativePlatform() &&
  isSignupConfirmationUrl(window.location.href)
) {
  void handleAuthCallbackUrl(window.location.href)
    .then(() => {
      const cleanUrl = `${window.location.pathname}${window.location.search ? "" : ""}`;
      window.history.replaceState({}, document.title, cleanUrl || "/");
    })
    .catch((error) => {
      console.error("Hydra Agro: falha ao confirmar e-mail", error);
    });
}

export function publicMediaUrl(bucket: "avatars" | "community-media", path?: string | null) {
  if (!path || !supabase) return undefined;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
