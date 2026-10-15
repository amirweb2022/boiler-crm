import { query } from "./postgres";
import { daysUntil } from "../date/shamsi";
import { ValidationError } from "../validation";
import type { Vessel, CreateVesselInput, UpdateVesselInput } from "../../types";

function mapVessel(r:any): Vessel { return {id:r.id,companyId:r.company_id,name:r.name,volume:r.volume,details:r.details??{},tested:r.tested,status:r.status,exclusionReason:r.exclusion_reason,excludedAt:r.excluded_at,createdAt:r.created_at,updatedAt:r.updated_at,type:r.type}; }

export async function createVessel(input:CreateVesselInput):Promise<Vessel> {
  const company = await query(`SELECT id FROM companies WHERE id=$1`,[input.companyId]);
  if (!company.rows[0]) throw new ValidationError("شرکت یافت نشد");
  const {rows} = await query(`INSERT INTO vessels(company_id,name,volume,type,details) VALUES($1,$2,$3,$4,$5) RETURNING *`,[input.companyId,input.name??null,input.volume??null,input.type,JSON.stringify(input.details??{})]);
  return mapVessel(rows[0]);
}

export async function updateVessel(id:string,input:UpdateVesselInput):Promise<Vessel> {
  const patch:Array<[string,unknown]> = [];
  if (input.name) patch.push(["name",input.name]);
  if (input.volume) patch.push(["volume",input.volume]);
  if (input.type) patch.push(["type",input.type]);
  if (input.type && input.type !== "tank" && input.type !== "boiler") { patch.push(["name",null]); patch.push(["volume",null]); }
  if (input.details) patch.push(["details",JSON.stringify(input.details)]);
  if (!patch.length) {
    const found = await query(`SELECT * FROM vessels WHERE id=$1`,[id]);
    if (!found.rows[0]) throw new ValidationError("مخزن یافت نشد");
    return mapVessel(found.rows[0]);
  }
  const sets = patch.map(([key],i)=>`${key}=$${i+2}${key === "details" ? "::jsonb" : ""}`).join(",");
  const {rows} = await query(`UPDATE vessels SET ${sets},updated_at=now() WHERE id=$1 RETURNING *`,[id,...patch.map(([,v])=>v)]);
  if (!rows[0]) throw new ValidationError("مخزن یافت نشد");
  return mapVessel(rows[0]);
}

export async function deleteVessel(id:string):Promise<void> { await query(`DELETE FROM vessels WHERE id=$1`,[id]); }

export async function toggleVesselTested(id:string,tested:boolean):Promise<Vessel> {
  const {rows} = await query(`SELECT v.*,tr.test_date,tr.status AS test_status FROM vessels v JOIN test_records tr ON tr.company_id=v.company_id WHERE v.id=$1`,[id]);
  const vessel=rows[0];
  if (!vessel) throw new ValidationError("مخزن یافت نشد");
  if (vessel.status === "excluded") throw new ValidationError("این مخزن از چرخه فعلی معاف شده است؛ ابتدا معافیت را لغو کنید");
  if (vessel.test_status !== "pending") throw new ValidationError("این چرخه تست قبلاً بسته شده است");
  if (daysUntil(vessel.test_date)>0) throw new ValidationError("تاریخ آزمون هنوز فرارسیده است؛ امکان تیک‌زدن وجود ندارد");
  const updated=await query(`UPDATE vessels SET tested=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,tested]);
  return mapVessel(updated.rows[0]);
}

export async function setVesselExclusion(id:string,excluded:boolean,reason?:string):Promise<Vessel> {
  const {rows}=await query(excluded
    ? `UPDATE vessels SET status='excluded',exclusion_reason=$2,excluded_at=now(),tested=false,updated_at=now() WHERE id=$1 RETURNING *`
    : `UPDATE vessels SET status='active',exclusion_reason=null,excluded_at=null,updated_at=now() WHERE id=$1 RETURNING *`,
  excluded?[id,reason??null]:[id]);
  if (!rows[0]) throw new ValidationError("مخزن یافت نشد");
  return mapVessel(rows[0]);
}
