import { requireSupabase } from "./supabase";

export type ActivityLogEntry = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  title: string;
  detail?: string;
  createdAt: string;
};

export async function loadActivityLog(limit = 180): Promise<ActivityLogEntry[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("activity_log")
    .select("id,actor_name,action,entity_type,entity_id,title,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    actorName: String(row.actor_name || "Produtor"),
    action: String(row.action || "update"),
    entityType: String(row.entity_type || ""),
    entityId: row.entity_id ? String(row.entity_id) : undefined,
    title: String(row.title || "Ação registrada"),
    detail: row.detail ? String(row.detail) : undefined,
    createdAt: String(row.created_at),
  }));
}
