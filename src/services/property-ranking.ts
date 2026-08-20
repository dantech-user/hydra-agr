import { requireSupabase } from "./supabase";

export type PropertyRankingEntry = {
  position: number;
  propertyId: string;
  propertyName: string;
  municipality: string;
  xp: number;
  isMine: boolean;
};

type RankingRow = {
  position?: unknown;
  property_id?: unknown;
  property_name?: unknown;
  municipality?: unknown;
  xp?: unknown;
  is_mine?: unknown;
};

export async function loadPropertyRanking(): Promise<PropertyRankingEntry[]> {
  const { data, error } = await requireSupabase().rpc("property_ranking");
  if (error) throw new Error(error.message || "Não foi possível carregar o ranking.");

  return ((data ?? []) as RankingRow[]).map((row) => ({
    position: Number(row.position ?? 0),
    propertyId: String(row.property_id ?? ""),
    propertyName: String(row.property_name ?? "Propriedade"),
    municipality: String(row.municipality ?? ""),
    xp: Number(row.xp ?? 0),
    isMine: Boolean(row.is_mine),
  }));
}
