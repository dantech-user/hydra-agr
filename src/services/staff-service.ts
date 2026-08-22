import type { StaffRole } from "../lib/hydra-types";
import { requireSupabase } from "./supabase";

export type StaffMember = {
  id: string;
  userId: string;
  name: string;
  role: StaffRole;
  area: string;
  active: boolean;
  codeHint: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
};

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Não foi possível concluir a operação.";
}

export async function loadStaffMembers(): Promise<StaffMember[]> {
  const { data, error } = await requireSupabase()
    .from("property_members")
    .select("id,user_id,display_name,member_role,area,active,code_hint,created_at,last_login_at,login_count")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.display_name || "Funcionário"),
    role: (row.member_role === "manager" ? "manager" : "employee") as StaffRole,
    area: String(row.area || "Geral"),
    active: Boolean(row.active),
    codeHint: String(row.code_hint || ""),
    createdAt: String(row.created_at),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
    loginCount: Number(row.login_count ?? 0),
  }));
}

export async function createStaffMember(values: { name: string; role: StaffRole; area: string }) {
  const { data, error } = await requireSupabase().functions.invoke("staff-manage", {
    body: { action: "create", ...values },
  });
  if (error) throw new Error(messageFromError(error));
  const response = data as { ok?: boolean; message?: string; code?: string; member?: Record<string, unknown> } | null;
  if (!response?.ok || !response.code) throw new Error(response?.message || "Não foi possível criar o acesso.");
  return { code: response.code };
}

export async function regenerateStaffCode(memberId: string) {
  const { data, error } = await requireSupabase().functions.invoke("staff-manage", {
    body: { action: "regenerate", memberId },
  });
  if (error) throw new Error(messageFromError(error));
  const response = data as { ok?: boolean; message?: string; code?: string } | null;
  if (!response?.ok || !response.code) throw new Error(response?.message || "Não foi possível gerar outro código.");
  return response.code;
}

export async function setStaffActive(memberId: string, active: boolean) {
  const { data, error } = await requireSupabase().functions.invoke("staff-manage", {
    body: { action: "set_active", memberId, active },
  });
  if (error) throw new Error(messageFromError(error));
  const response = data as { ok?: boolean; message?: string } | null;
  if (!response?.ok) throw new Error(response?.message || "Não foi possível alterar o acesso.");
}

export async function signInWithStaffCode(code: string) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("staff-code-login", { body: { code } });
  if (error) throw new Error(messageFromError(error));
  const response = data as { ok?: boolean; message?: string; tokenHash?: string } | null;
  if (!response?.ok || !response.tokenHash) throw new Error(response?.message || "Código inválido ou desativado.");
  const { data: sessionData, error: verifyError } = await client.auth.verifyOtp({
    token_hash: response.tokenHash,
    type: "magiclink",
  });
  if (verifyError) throw new Error(verifyError.message);
  return sessionData;
}
