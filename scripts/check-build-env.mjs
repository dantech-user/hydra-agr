import { loadEnv } from "vite";

const values = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const url = values.VITE_SUPABASE_URL?.trim() ?? "";
const key = values.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

const validUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
const validKey = key.length > 20 && !key.includes("SUBSTITUA");

if (!validUrl || !validKey) {
  console.error("Configuração incompleta: informe VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY antes de gerar o APK.");
  process.exit(1);
}

console.log("Backend público configurado para o build Android.");
