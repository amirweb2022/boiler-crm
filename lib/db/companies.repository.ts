import { computeProximity, daysUntil, nextYearShamsi } from "../date/shamsi";
import { findCatalogEntry } from "../data/companies-catalog";
import { isUniqueViolation, query, transaction } from "./postgres";
import { ValidationError } from "../validation";
import type { Company, TestRecord, Vessel, CompanyWithDetails, CompanyListFilters, PaginatedResult, CreateCompanyInput, UpdateCompanyInput } from "../../types";

export async function getDashboardStats() {
  const today = "(now() AT TIME ZONE 'Asia/Tehran')::date";
  const { rows } = await query(`
    SELECT
      (SELECT count(*)::int FROM test_records WHERE status='pending') AS current_cycles,
      (SELECT count(*)::int FROM test_records WHERE status='pending' AND test_date BETWEEN ${today}+2 AND ${today}+30) AS near_due,
      (SELECT count(*)::int FROM (SELECT DISTINCT company_id, cycle_count FROM test_history WHERE cycle_count IS NOT NULL) completed) AS completed_cycles,
      (SELECT count(*)::int FROM test_records WHERE status='pending' AND certificate_uploaded=true) AS active_certificates
  `);
  const row = rows[0] ?? {};
  return {
    currentCycles: Number(row.current_cycles ?? 0),
    nearDue: Number(row.near_due ?? 0),
    completedCycles: Number(row.completed_cycles ?? 0),
    activeCertificates: Number(row.active_certificates ?? 0),
  };
}

const mapCompany = (r: any): Company => ({ id:r.id, catalogCode:r.catalog_code, name:r.name, phone:r.phone, contactName:r.contact_name ?? null, province:r.province, city:r.city, address:r.address, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at, type:r.type });
const mapTestRecord = (r: any): TestRecord => ({ id:r.id, companyId:r.company_id, testDate:r.test_date instanceof Date ? r.test_date.toISOString().slice(0,10) : String(r.test_date).slice(0,10), status:r.status, certificateUploaded:r.certificate_uploaded, certificateUrl:r.certificate_url, certificatePath:r.certificate_path, proofOfUploadPending:r.proof_of_upload_pending, doneAt:r.done_at, cycleCount:r.cycle_count, createdAt:r.created_at, updatedAt:r.updated_at });
const mapVessel = (r: any): Vessel => ({ id:r.id, companyId:r.company_id, name:r.name, volume:r.volume, details:r.details ?? {}, tested:r.tested, status:r.status, exclusionReason:r.exclusion_reason, excludedAt:r.excluded_at, createdAt:r.created_at, updatedAt:r.updated_at, type:r.type });

export async function listCompaniesWithDetails(filters: CompanyListFilters): Promise<PaginatedResult<CompanyWithDetails>> {
  const page = Math.max(1, Math.floor(filters.page ?? 1) || 1);
  const pageSize = Math.max(1, Math.min(Math.floor(filters.pageSize ?? 20) || 20, 100));
  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.search) {
    values.push(`%${filters.search.slice(0,100).replace(/[\\%_]/g, "\\$&")}%`);
    where.push(`(name ILIKE $${values.length} ESCAPE '\\' OR catalog_code ILIKE $${values.length} ESCAPE '\\' OR phone ILIKE $${values.length} ESCAPE '\\')`);
  }
  if (filters.province && filters.province !== "all") { values.push(filters.province); where.push(`province = $${values.length}`); }
  if (filters.status && filters.status !== "all") {
    values.push(filters.status);
    where.push(`EXISTS (SELECT 1 FROM test_records tr WHERE tr.company_id=companies.id AND tr.status=$${values.length})`);
  }
  if (filters.proximity && filters.proximity !== "all") {
    const today = "(now() AT TIME ZONE 'Asia/Tehran')::date";
    const conditions: Record<string, string> = {
      done: "tr.status='done'",
      overdue: `tr.status='pending' AND tr.test_date < ${today}`,
      due: `tr.status='pending' AND tr.test_date BETWEEN ${today} AND ${today}+1`,
      near_due: `tr.status='pending' AND tr.test_date BETWEEN ${today}+2 AND ${today}+30`,
      unscheduled: `tr.status='pending' AND tr.test_date > ${today}+30`,
    };
    const condition = conditions[filters.proximity];
    if (condition) where.push(`EXISTS (SELECT 1 FROM test_records tr WHERE tr.company_id=companies.id AND (${condition}))`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const filterValues = values.slice();
  values.push(pageSize, (page - 1) * pageSize);
  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(`SELECT * FROM companies ${whereSql} ORDER BY created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`, values),
    query(`SELECT count(*)::text AS total FROM companies ${whereSql}`, filterValues),
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  const companyIds = rows.map((r:any) => r.id);
  if (!companyIds.length) return { data: [], total, page, pageSize };
  const [tests, vesselsResult] = await Promise.all([
    query(`SELECT tr.*, coalesce(json_agg(ch) FILTER (WHERE ch.test_record_id IS NOT NULL), '[]') AS certificate_history FROM test_records tr LEFT JOIN certificate_history ch ON ch.test_record_id=tr.id WHERE tr.company_id = ANY($1::uuid[]) GROUP BY tr.id`, [companyIds]),
    query(`SELECT * FROM vessels WHERE company_id = ANY($1::uuid[]) ORDER BY created_at`, [companyIds]),
  ]);
  const testByCompany = new Map(tests.rows.map((r:any) => [r.company_id, r]));
  const vesselsByCompany = new Map<string, Vessel[]>();
  for (const row of vesselsResult.rows) {
    const list = vesselsByCompany.get(row.company_id) ?? [];
    list.push(mapVessel(row)); vesselsByCompany.set(row.company_id, list);
  }
  const data = rows.map((company:any) => {
    const tr:any = testByCompany.get(company.id);
    const testRecord = tr ? mapTestRecord(tr) : null;
    const equipment = vesselsByCompany.get(company.id) ?? [];
    const proximity = computeProximity(testRecord?.testDate ?? null, testRecord?.status ?? "pending");
    const allVesselsTested = equipment.length > 0 && equipment.every((v) => v.status === "excluded" || v.tested);
    const dateReached = testRecord ? daysUntil(testRecord.testDate) <= 0 : false;
    const canMarkDone = testRecord?.status === "pending" && dateReached && allVesselsTested && Boolean(testRecord.certificateUploaded) &&
      (tr?.certificate_cycle_count === (tr?.cycle_count ?? 0)+1 || (tr?.certificate_cycle_count == null && tr?.cycle_count === 0));
    const companyRow = company;
    return { ...mapCompany(companyRow), testRecord, certificateHistory: (tr?.certificate_history ?? []).map((h:any) => ({cycleCount:h.cycle_count,testDate:h.test_date,certificateUrl:h.certificate_url})), vessels: equipment, proximity, allVesselsTested, canMarkDone };
  });
  return { data, total, page, pageSize };
}

export async function createCompanyWithTestRecord(input: CreateCompanyInput): Promise<Company> {
  const catalogEntry = findCatalogEntry(input.catalogCode);
  if (!catalogEntry) throw new ValidationError("شرکت انتخاب‌شده در کاتالوگ یافت نشد");
  try {
    return await transaction(async (db) => {
      const { rows } = await db.query(`INSERT INTO companies(catalog_code,name,phone,contact_name,province,city,address) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [catalogEntry.code,catalogEntry.name,input.phone,input.contactName ?? null,input.province,input.city ?? null,input.address ?? null]);
      const company = rows[0];
      await db.query(`INSERT INTO test_records(company_id,test_date,status) VALUES($1,$2,'pending')`, [company.id,input.testDate]);
      return mapCompany(company);
    });
  } catch (error) { if (isUniqueViolation(error)) throw new ValidationError("این شرکت قبلاً در سیستم ثبت شده است"); throw error; }
}

export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  const patch: Array<[string, unknown]> = [];
  if (input.phone) patch.push(["phone",input.phone]);
  if (input.contactName !== undefined) patch.push(["contact_name",input.contactName || null]);
  if (input.province) patch.push(["province",input.province]);
  if (input.city !== undefined) patch.push(["city",input.city]);
  if (input.address !== undefined) patch.push(["address",input.address]);
  if (input.status) patch.push(["status",input.status]);
  return transaction(async (db) => {
    if (patch.length) {
      const sets = patch.map(([key],i) => `${key}=$${i+2}`).join(",");
      const { rows } = await db.query(`UPDATE companies SET ${sets},updated_at=now() WHERE id=$1 RETURNING *`, [id,...patch.map(([,v])=>v)]);
      if (!rows[0]) throw new ValidationError("شرکت یافت نشد");
      if (input.testDate) await db.query(`UPDATE test_records SET test_date=$2 WHERE company_id=$1`, [id,input.testDate]);
      return mapCompany(rows[0]);
    }
    if (input.testDate) await db.query(`UPDATE test_records SET test_date=$2 WHERE company_id=$1`, [id,input.testDate]);
    const { rows } = await db.query(`SELECT * FROM companies WHERE id=$1`, [id]);
    if (!rows[0]) throw new ValidationError("شرکت یافت نشد");
    return mapCompany(rows[0]);
  });
}

export async function deleteCompany(id: string): Promise<void> { await query(`DELETE FROM companies WHERE id=$1`, [id]); }

export async function markTestDoneAndStartNextCycle(companyId: string): Promise<{testRecord: TestRecord}> {
  return transaction(async (db) => {
    const { rows: trRows } = await db.query(`SELECT * FROM test_records WHERE company_id=$1 FOR UPDATE`, [companyId]);
    const current = trRows[0];
    if (!current) throw new ValidationError("رکورد تست یافت نشد");
    if (current.status === "done") throw new ValidationError("این تست قبلاً به‌عنوان انجام‌شده ثبت شده است");
    if (daysUntil(current.test_date) > 0) throw new ValidationError("تاریخ تست هنوز فرارسیده است؛ امکان ثبت انجام وجود ندارد");
    if (!current.certificate_uploaded || (current.certificate_cycle_count !== (current.cycle_count ?? 0)+1 && !(current.certificate_cycle_count == null && current.cycle_count === 0))) throw new ValidationError("قبل از ثبت انجام، ابتدا باید گواهی آزمون آپلود شود");
    const { rows: companyRows } = await db.query(`SELECT id,name,catalog_code,province,city,phone,address FROM companies WHERE id=$1`, [companyId]);
    const company = companyRows[0];
    if (!company) throw new ValidationError("شرکت یافت نشد");
    const { rows: vessels } = await db.query(`SELECT id,name,volume,type,details,tested,status FROM vessels WHERE company_id=$1 FOR UPDATE`, [companyId]);
    if (!vessels.length) throw new ValidationError("این شرکت هیچ مخزنی ثبت‌شده ندارد؛ ابتدا مخازن را اضافه کنید");
    if (!vessels.every((v:any)=>v.status === "excluded" || v.tested)) throw new ValidationError("همه مخازن باید یا تست‌شده علامت بخورند یا با دلیل معاف شوند");
    const cycleCount = (current.cycle_count ?? 0)+1;
    await db.query(`INSERT INTO certificate_history(test_record_id,cycle_count,test_date,certificate_url,certificate_path) VALUES($1,$2,$3,$4,$5) ON CONFLICT(test_record_id,cycle_count) DO UPDATE SET test_date=EXCLUDED.test_date,certificate_url=EXCLUDED.certificate_url,certificate_path=EXCLUDED.certificate_path`, [current.id,cycleCount,current.test_date,current.certificate_url,current.certificate_path]);
    for (const vessel of vessels.filter((v:any)=>v.tested && v.status !== "excluded")) {
      await db.query(`INSERT INTO test_history(company_id,company_name,company_catalog_code,company_province,company_city,company_phone,company_address,vessel_id,vessel_name,vessel_volume,vessel_type,vessel_details,test_date,result,cycle_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved',$14)`, [company.id,company.name,company.catalog_code,company.province,company.city,company.phone,company.address,vessel.id,vessel.name,vessel.volume,vessel.type,vessel.details,current.test_date,cycleCount]);
    }
    const currentDate = current.test_date instanceof Date ? `${current.test_date.getFullYear()}-${String(current.test_date.getMonth()+1).padStart(2,"0")}-${String(current.test_date.getDate()).padStart(2,"0")}` : String(current.test_date).slice(0,10);
    const nextDate = nextYearShamsi(currentDate);
    const { rows: updatedRows } = await db.query(`UPDATE test_records SET test_date=$2,status='pending',certificate_uploaded=false,certificate_url=null,certificate_path=null,certificate_cycle_count=null,proof_of_upload_pending=false,done_at=now(),cycle_count=$3,updated_at=now() WHERE id=$1 RETURNING *`, [current.id,nextDate,cycleCount]);
    await db.query(`UPDATE vessels SET tested=false,status='active',exclusion_reason=null,excluded_at=null,updated_at=now() WHERE company_id=$1`, [companyId]);
    return {testRecord:mapTestRecord(updatedRows[0])};
  });
}

export async function clearStaleCertificates(nearDueDays: number): Promise<{cleared:Array<{testRecordId:string;certificatePath:string|null}>}> {
  const { rows } = await query(`SELECT * FROM test_records WHERE status='pending' AND certificate_uploaded=true`);
  const cleared:Array<{testRecordId:string;certificatePath:string|null}> = [];
  for (const record of rows) {
    if (daysUntil(record.test_date)>nearDueDays || record.certificate_cycle_count!==record.cycle_count || !record.done_at) continue;
    await transaction(async (db) => {
      await db.query(`INSERT INTO certificate_history(test_record_id,cycle_count,test_date,certificate_url,certificate_path) VALUES($1,$2,null,$3,$4) ON CONFLICT(test_record_id,cycle_count) DO UPDATE SET certificate_url=EXCLUDED.certificate_url,certificate_path=EXCLUDED.certificate_path`, [record.id,record.cycle_count,record.certificate_url,record.certificate_path]);
      await db.query(`UPDATE test_records SET certificate_uploaded=false,certificate_url=null,certificate_path=null,certificate_cycle_count=null,updated_at=now() WHERE id=$1 AND certificate_cycle_count=$2 AND certificate_path IS NOT DISTINCT FROM $3`, [record.id,record.certificate_cycle_count,record.certificate_path]);
    });
    cleared.push({testRecordId:record.id,certificatePath:record.certificate_path});
  }
  return {cleared};
}
