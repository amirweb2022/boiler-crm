import { getSupabaseServerClient } from "../supabase/server";
import { computeProximity, daysUntil, nextYearShamsi } from "../date/shamsi";
import { findCatalogEntry } from "../data/companies-catalog";
import { ValidationError } from "../validation";
import type {
  Company,
  TestRecord,
  Vessel,
  CompanyWithDetails,
  CompanyListFilters,
  PaginatedResult,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "../../types";

// =====================================================================
// لایه Repository — تنها نقطه‌ای که با Supabase صحبت می‌کند. برای
// مهاجرت به PostgreSQL مستقل فقط بدنه این توابع عوض می‌شود.
// =====================================================================

function mapCompanyRow(row: any): Company {
  return {
    id: row.id,
    catalogCode: row.catalog_code,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type,
  };
}

function mapTestRecordRow(row: any): TestRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    testDate: row.test_date,
    status: row.status,
    certificateUploaded: row.certificate_uploaded,
    certificateUrl: row.certificate_url,
    certificatePath: row.certificate_path,
    proofOfUploadPending: row.proof_of_upload_pending,
    doneAt: row.done_at,
    cycleCount: row.cycle_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

/** فرار از کاراکترهای خاص PostgREST (٪ , * ) در فیلتر ilike/or تا جستجو
 *  با ورودی حاوی این کاراکترها کوئری را نشکند یا رفتار غیرمنتظره ندهد. */
function escapeForOrFilter(value: string): string {
  return value.replace(/[%,]/g, "\\$&");
}

export async function listCompaniesWithDetails(
  filters: CompanyListFilters,
): Promise<PaginatedResult<CompanyWithDetails>> {
  const db = getSupabaseServerClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100); // سقف امنیتی برای جلوگیری از drain کامل جدول
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("companies")
    .select("*, test_records(*), vessels(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    const s = escapeForOrFilter(filters.search.slice(0, 100));
    query = query.or(
      `name.ilike.%${s}%,catalog_code.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }
  if (filters.province && filters.province !== "all") {
    query = query.eq("province", filters.province);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  let items: CompanyWithDetails[] = (data ?? []).map((row: any) => {
    const trRow = Array.isArray(row.test_records)
      ? row.test_records[0]
      : row.test_records;
    const testRecord = trRow ? mapTestRecordRow(trRow) : null;
    const vessels: Vessel[] = (row.vessels ?? []).map(mapVesselRow);
    const proximity = computeProximity(
      testRecord?.testDate ?? null,
      testRecord?.status ?? "pending",
    );
    // مخزن معاف‌شده (excluded) هم مثل مخزن تست‌شده حساب می‌شود — چون
    // آگاهانه و با دلیل ثبت‌شده از این چرخه مستثنی شده، نه اینکه فراموش شده باشد.
    const allVesselsTested =
      vessels.length > 0 &&
      vessels.every((v) => v.status === "excluded" || v.tested);
    const dateReached = testRecord
      ? daysUntil(testRecord.testDate) <= 0
      : false;
    // طبق نیازمندی جدید: «ثبت انجام» علاوه‌بر تاریخ فرارسیده و تست همه
    // مخازن، به آپلود گواهی هم نیاز دارد.
    const canMarkDone =
      testRecord?.status === "pending" &&
      dateReached &&
      allVesselsTested &&
      Boolean(testRecord?.certificateUploaded);

    return {
      ...mapCompanyRow(row),
      testRecord,
      vessels,
      proximity,
      allVesselsTested,
      canMarkDone,
    };
  });

  if (filters.status && filters.status !== "all") {
    items = items.filter((c) => c.testRecord?.status === filters.status);
  }
  if (filters.proximity && filters.proximity !== "all") {
    items = items.filter((c) => c.proximity === filters.proximity);
  }

  return { data: items, total: count ?? items.length, page, pageSize };
}

export async function createCompanyWithTestRecord(
  input: CreateCompanyInput,
): Promise<Company> {
  const db = getSupabaseServerClient();

  // نام/کد همیشه سمت سرور از کاتالوگ ثابت استخراج می‌شود؛ ورودی کلاینت
  // فقط "کدام آیتم کاتالوگ" را مشخص می‌کند، نه مقدار نام/کد را مستقیم.
  const catalogEntry = findCatalogEntry(input.catalogCode);
  if (!catalogEntry) {
    throw new ValidationError("شرکت انتخاب‌شده در کاتالوگ یافت نشد");
  }

  const { data: company, error: companyError } = await db
    .from("companies")
    .insert({
      catalog_code: catalogEntry.code,
      name: catalogEntry.name,
      phone: input.phone,
      province: input.province,
      city: input.city ?? null,
      address: input.address ?? null,
    })
    .select()
    .single();

  if (companyError) {
    if (companyError.code === "23505") {
      throw new ValidationError("این شرکت قبلاً در سیستم ثبت شده است");
    }
    throw companyError;
  }

  const { error: trError } = await db.from("test_records").insert({
    company_id: company.id,
    test_date: input.testDate,
    status: "pending",
  });
  if (trError) throw trError;

  return mapCompanyRow(company);
}

export async function updateCompany(
  id: string,
  input: UpdateCompanyInput,
): Promise<Company> {
  const db = getSupabaseServerClient();
  const patch: Record<string, any> = {};
  if (input.phone) patch.phone = input.phone;
  if (input.province) patch.province = input.province;
  if (input.city !== undefined) patch.city = input.city;
  if (input.address !== undefined) patch.address = input.address;
  if (input.status) patch.status = input.status;

  const { data, error } = await db
    .from("companies")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (input.testDate) {
    await db
      .from("test_records")
      .update({ test_date: input.testDate })
      .eq("company_id", id);
  }

  return mapCompanyRow(data);
}

export async function deleteCompany(id: string): Promise<void> {
  const db = getSupabaseServerClient();
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) throw error;
}

/**
 * ثبت انجام تست + شروع چرخه بعدی:
 * - فقط وقتی تاریخ فرارسیده، همه مخازن تست‌شده، و گواهی آپلود شده باشد مجاز است
 * - تاریخ آزمون یک سال شمسی جلو می‌رود (روی همان رکورد، نه رکورد جدید)
 * - وضعیت به‌جای done ماندن، بلافاصله برای چرخه جدید pending می‌شود
 *   (done_at و cycle_count برای تاریخچه/آمار نگه داشته می‌شود)
 * - گواهی فعلی نگه داشته می‌شود؛ عمداً اینجا پاک نمی‌شود — طبق نیازمندی،
 *   گواهی فقط وقتی چرخه جدید به وضعیت «نزدیک سررسید» برسد باید خودکار
 *   حذف شود (این کار توسط clearStaleCertificates انجام می‌شود که از
 *   cron روزانه فراخوانی می‌شود، نه اینجا).
 * - تیک تست تمام مخازن ریست می‌شود (باید برای چرخه جدید دوباره تست شوند)
 */
export async function markTestDoneAndStartNextCycle(
  companyId: string,
): Promise<{
  testRecord: TestRecord;
}> {
  const db = getSupabaseServerClient();

  const { data: current, error: fetchError } = await db
    .from("test_records")
    .select("*")
    .eq("company_id", companyId)
    .single();
  if (fetchError || !current) throw new ValidationError("رکورد تست یافت نشد");

  if (current.status === "done") {
    throw new ValidationError("این تست قبلاً به‌عنوان انجام‌شده ثبت شده است");
  }
  if (daysUntil(current.test_date) > 0) {
    throw new ValidationError(
      "تاریخ تست هنوز فرانرسیده است؛ امکان ثبت انجام وجود ندارد",
    );
  }
  if (!current.certificate_uploaded) {
    throw new ValidationError(
      "قبل از ثبت انجام، ابتدا باید گواهی آزمون آپلود شود",
    );
  }

  const { data: company, error: companyFetchError } = await db
    .from("companies")
    .select("id, name, catalog_code, province, city, phone, address")
    .eq("id", companyId)
    .single();
  if (companyFetchError || !company) throw new ValidationError("شرکت یافت نشد");

  const { data: vessels, error: vesselsError } = await db
    .from("vessels")
    .select("id, name, volume, tested, status")
    .eq("company_id", companyId);
  if (vesselsError) throw vesselsError;

  if (!vessels || vessels.length === 0) {
    throw new ValidationError(
      "این شرکت هیچ مخزنی ثبت‌شده ندارد؛ ابتدا مخازن را اضافه کنید",
    );
  }
  if (!vessels.every((v) => v.status === "excluded" || v.tested)) {
    throw new ValidationError(
      "همه مخازن باید یا تست‌شده علامت بخورند یا با دلیل معاف شوند",
    );
  }

  const nextDate = nextYearShamsi(current.test_date);
  const completingCycleCount = (current.cycle_count ?? 0) + 1;

  // ثبت دائمی در تاریخچه — فقط مخازنی که واقعاً «تست‌شده» بودند (نه معاف‌شده‌ها،
  // چون آن‌ها عملاً بازرسی نشدند و نباید در گزارش رسمی «تأیید» ثبت شوند).
  // این تنها منبع داده برای گزارش‌های ماهانه است؛ test_records خودش هر
  // چرخه بازنویسی می‌شود و تاریخچه واقعی را نگه نمی‌دارد.
  const historyRows = vessels
    .filter((v) => v.tested && v.status !== "excluded")
    .map((v) => ({
      company_id: company.id,
      company_name: company.name,
      company_catalog_code: company.catalog_code,
      company_province: company.province,
      company_city: company.city,
      company_phone: company.phone,
      company_address: company.address,
      vessel_id: v.id,
      vessel_name: v.name,
      vessel_volume: v.volume,
      test_date: current.test_date,
      result: "approved",
      cycle_count: completingCycleCount,
    }));

  if (historyRows.length > 0) {
    const { error: historyError } = await db
      .from("test_history")
      .insert(historyRows);
    if (historyError) throw historyError;
  }

  const { data: updated, error: updateError } = await db
    .from("test_records")
    .update({
      test_date: nextDate,
      status: "pending",
      // توجه: certificate_uploaded / certificate_url / certificate_path
      // عمداً دست‌نخورده می‌مانند — پاک‌سازی‌شان به clearStaleCertificates سپرده شده.
      proof_of_upload_pending: false,
      done_at: new Date().toISOString(),
      cycle_count: completingCycleCount,
    })
    .eq("id", current.id)
    .select()
    .single();
  if (updateError) throw updateError;

  // شروع چرخه جدید: تیک تست همه مخازن ریست می‌شود و معافیت‌های موقت
  // (excluded) هم به حالت «فعال» برمی‌گردند — چون معافیت فقط برای همان
  // چرخه‌ای بود که الان بسته شد، نه برای همیشه.
  const { error: resetError } = await db
    .from("vessels")
    .update({
      tested: false,
      status: "active",
      exclusion_reason: null,
      excluded_at: null,
    })
    .eq("company_id", companyId);
  if (resetError) throw resetError;

  return { testRecord: mapTestRecordRow(updated) };
}

/**
 * پاک‌سازی خودکار گواهی‌های «بیات» — طبق نیازمندی: گواهیِ چرخه‌ی قبل
 * باید تا وقتی چرخه‌ی فعلی به وضعیت «نزدیک سررسید» می‌رسد باقی بماند؛
 * از آن لحظه به بعد باید خودکار حذف شود (هم فایل واقعی از Storage، هم
 * فیلدهای دیتابیس) تا کاربر مجبور به آپلود گواهی تازه برای چرخه جدید شود.
 * این تابع idempotent است: چون بعد از حذف certificate_uploaded=false
 * می‌شود، رکورد دیگر در دفعات بعدی cron مطابقت پیدا نمی‌کند.
 */
export async function clearStaleCertificates(nearDueDays: number): Promise<{
  cleared: Array<{ testRecordId: string; certificatePath: string | null }>;
}> {
  const db = getSupabaseServerClient();

  const { data: candidates, error } = await db
    .from("test_records")
    .select("id, test_date, certificate_path")
    .eq("status", "pending")
    .eq("certificate_uploaded", true);
  if (error) throw error;

  const cleared: Array<{
    testRecordId: string;
    certificatePath: string | null;
  }> = [];

  for (const record of candidates ?? []) {
    if (daysUntil(record.test_date) > nearDueDays) continue; // هنوز نزدیک سررسید نشده

    if (record.certificate_path) {
      const { error: removeError } = await db.storage
        .from("certificates")
        .remove([record.certificate_path]);
      if (removeError) {
        console.error("خطا در حذف فایل گواهی بیات:", removeError.message);
      }
    }

    const { error: updateError } = await db
      .from("test_records")
      .update({
        certificate_uploaded: false,
        certificate_url: null,
        certificate_path: null,
      })
      .eq("id", record.id);
    if (updateError) throw updateError;

    cleared.push({
      testRecordId: record.id,
      certificatePath: record.certificate_path,
    });
  }

  return { cleared };
}
