import { Preferences } from "@capacitor/preferences";
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

export async function handleAuthCallbackUrl(url: string) {
  const client = requireSupabase();
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
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

  return hash.get("type") === "recovery" || parsed.searchParams.get("type") === "recovery" || parsed.pathname.includes("recovery");
}

export function isAuthCallbackUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const hasCredentials = Boolean(
      parsed.searchParams.get("code") ||
      (hash.get("access_token") && hash.get("refresh_token")),
    );
    const isRecovery =
      hash.get("type") === "recovery" ||
      parsed.searchParams.get("type") === "recovery" ||
      parsed.pathname.includes("/auth/recovery");
    return hasCredentials && isRecovery;
  } catch {
    return false;
  }
}

export function publicMediaUrl(bucket: "avatars" | "community-media", path?: string | null) {
  if (!path || !supabase) return undefined;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
