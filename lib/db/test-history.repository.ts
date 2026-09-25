import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { getSupabaseServerClient } from "../supabase/server";
import type { TestHistoryEntry } from "../../types";

dayjs.extend(jalaliday);

function mapHistoryRow(row: any): TestHistoryEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    companyCatalogCode: row.company_catalog_code,
    companyProvince: row.company_province,
    companyCity: row.company_city,
    companyPhone: row.company_phone,
    companyAddress: row.company_address,
    vesselId: row.vessel_id,
    vesselName: row.vessel_name,
    vesselVolume: row.vessel_volume,
    testDate: row.test_date,
    result: row.result,
    cycleCount: row.cycle_count,
    createdAt: row.created_at,
  };
}

/** بازه میلادی [شروع، پایان] یک ماه شمسی خاص را برمی‌گرداند (برای فیلتر SQL) */
export function shamsiMonthToGregorianRange(jYear: number, jMonth: number): { startISO: string; endISO: string } {
  const start = dayjs().calendar("jalali").year(jYear).month(jMonth - 1).date(1).startOf("day");
  const end = start.add(1, "month").subtract(1, "day");
  return {
    startISO: start.calendar("gregory").format("YYYY-MM-DD"),
    endISO: end.calendar("gregory").format("YYYY-MM-DD"),
  };
}

export async function listTestHistoryForShamsiMonth(jYear: number, jMonth: number): Promise<TestHistoryEntry[]> {
  const db = getSupabaseServerClient();
  const { startISO, endISO } = shamsiMonthToGregorianRange(jYear, jMonth);

  const { data, error } = await db
    .from("test_history")
    .select("*")
    .gte("test_date", startISO)
    .lte("test_date", endISO)
    .order("company_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map(mapHistoryRow);
}

/** لیست ماه‌های شمسی‌ای که واقعاً داده‌ی تاریخچه دارند (برای دراپ‌داون انتخاب ماه دیگر) */
export async function listAvailableHistoryMonths(): Promise<Array<{ jYear: number; jMonth: number }>> {
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("test_history").select("test_date");
  if (error) throw error;

  const seen = new Set<string>();
  const months: Array<{ jYear: number; jMonth: number }> = [];

  for (const row of data ?? []) {
    const d = dayjs(row.test_date).calendar("jalali");
    const key = `${d.year()}-${d.month()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    months.push({ jYear: d.year(), jMonth: d.month() + 1 });
  }

  months.sort((a, b) => (a.jYear !== b.jYear ? b.jYear - a.jYear : b.jMonth - a.jMonth));
  return months;
}
