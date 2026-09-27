import { getSupabaseServerClient } from "../supabase/server";
import { daysUntil } from "../date/shamsi";
import { ValidationError } from "../validation";
import type { Vessel, CreateVesselInput, UpdateVesselInput } from "../../types";

function mapVesselRow(row: any): Vessel {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    volume: row.volume,
    tested: row.tested,
    status: row.status,
    exclusionReason: row.exclusion_reason,
    excludedAt: row.excluded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type,
  };
}

export async function createVessel(input: CreateVesselInput): Promise<Vessel> {
  const db = getSupabaseServerClient();

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("id")
    .eq("id", input.companyId)
    .single();
  if (companyError || !company) throw new ValidationError("شرکت یافت نشد");

  const { data, error } = await db
    .from("vessels")
    .insert({
      company_id: input.companyId,
      name: input.name,
      volume: input.volume,
      type: input.type,
    })
    .select()
    .single();
  if (error) throw error;

  return mapVesselRow(data);
}

export async function updateVessel(
  id: string,
  input: UpdateVesselInput,
): Promise<Vessel> {
  const db = getSupabaseServerClient();
  const patch: Record<string, any> = {};
  if (input.name) patch.name = input.name;
  if (input.volume) patch.volume = input.volume;
  if (input.type) patch.type = input.type;

  const { data, error } = await db
    .from("vessels")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  return mapVesselRow(data);
}

export async function deleteVessel(id: string): Promise<void> {
  const db = getSupabaseServerClient();
  const { error } = await db.from("vessels").delete().eq("id", id);
  if (error) throw error;
}

/**
 * تیک‌زدن/برداشتن تیک «تست‌شده» برای یک مخزن.
 * فقط وقتی تاریخ آزمون شرکت فرارسیده باشد مجاز است؛ مخزنِ معاف‌شده هم
 * اصلاً نباید قابل تیک‌زدن باشد (چون از چرخه مستثنی شده).
 */
export async function toggleVesselTested(
  id: string,
  tested: boolean,
): Promise<Vessel> {
  const db = getSupabaseServerClient();

  const { data: vessel, error: vesselError } = await db
    .from("vessels")
    .select("*, companies!inner(id, test_records(test_date, status))")
    .eq("id", id)
    .single();
  if (vesselError || !vessel) throw new ValidationError("مخزن یافت نشد");

  if (vessel.status === "excluded") {
    throw new ValidationError(
      "این مخزن از چرخه فعلی معاف شده است؛ ابتدا معافیت را لغو کنید",
    );
  }

  const testRecord = Array.isArray(vessel.companies?.test_records)
    ? vessel.companies.test_records[0]
    : vessel.companies?.test_records;

  if (!testRecord) {
    throw new ValidationError("رکورد تست این شرکت یافت نشد");
  }
  if (testRecord.status !== "pending") {
    throw new ValidationError("این چرخه تست قبلاً بسته شده است");
  }
  if (daysUntil(testRecord.test_date) > 0) {
    throw new ValidationError(
      "تاریخ آزمون هنوز فرانرسیده است؛ امکان تیک‌زدن وجود ندارد",
    );
  }

  const { data, error } = await db
    .from("vessels")
    .update({ tested })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  return mapVesselRow(data);
}

/**
 * معاف‌کردن یک مخزن از الزام «تست‌شدن» در همین چرخه (با دلیل اجباری،
 * برای audit trail)، یا لغو معافیت. این عملیات فقط برای admin مجاز است
 * (در route بررسی می‌شود). معافیت موقتی است — با «ثبت انجام» و شروع
 * چرخه بعد، خودکار به «active» برمی‌گردد (در companies.repository).
 */
export async function setVesselExclusion(
  id: string,
  excluded: boolean,
  reason?: string,
): Promise<Vessel> {
  const db = getSupabaseServerClient();

  const patch = excluded
    ? {
        status: "excluded",
        exclusion_reason: reason ?? null,
        excluded_at: new Date().toISOString(),
        tested: false,
      }
    : { status: "active", exclusion_reason: null, excluded_at: null };

  const { data, error } = await db
    .from("vessels")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  return mapVesselRow(data);
}
