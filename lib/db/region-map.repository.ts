import { getSupabaseServerClient } from "../supabase/server";
import type { ProvinceRegionMapEntry } from "../../types";

function mapRow(row: any): ProvinceRegionMapEntry {
  return {
    id: row.id,
    province: row.province,
    regionName: row.region_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRegionMap(): Promise<ProvinceRegionMapEntry[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("province_region_map").select("*").order("province");
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** نگاشت به‌صورت Record ساده برای استفاده سریع در ساخت گزارش */
export async function getRegionMapDict(): Promise<Record<string, string>> {
  const rows = await listRegionMap();
  const dict: Record<string, string> = {};
  for (const r of rows) dict[r.province] = r.regionName;
  return dict;
}

export async function upsertRegionMap(province: string, regionName: string): Promise<ProvinceRegionMapEntry> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("province_region_map")
    .upsert({ province, region_name: regionName }, { onConflict: "province" })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteRegionMap(id: string): Promise<void> {
  const db = getSupabaseServerClient();
  const { error } = await db.from("province_region_map").delete().eq("id", id);
  if (error) throw error;
}
