import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import { persianDate } from "../date/shamsi";
import { query } from "./postgres";
import type { TestHistoryEntry } from "../../types";


function mapHistoryRow(row:any):TestHistoryEntry { return {id:row.id,companyId:row.company_id,companyName:row.company_name,companyCatalogCode:row.company_catalog_code,companyProvince:row.company_province,companyCity:row.company_city,companyPhone:row.company_phone,companyAddress:row.company_address,vesselId:row.vessel_id,vesselName:row.vessel_name,vesselVolume:row.vessel_volume,vesselType:row.vessel_type??null,vesselDetails:row.vessel_details??{},testDate:row.test_date,result:row.result,cycleCount:row.cycle_count,createdAt:row.created_at}; }

export function shamsiMonthToGregorianRange(jYear:number,jMonth:number):{startISO:string;endISO:string} {
  const start = new DateObject({ year: jYear, month: jMonth, day: 1, calendar: persian });
  const end = new DateObject(start).toLastOfMonth();
  return {startISO:start.convert(gregorian).format("YYYY-MM-DD"),endISO:end.convert(gregorian).format("YYYY-MM-DD")};
}

export async function listTestHistoryForShamsiMonth(jYear:number,jMonth:number):Promise<TestHistoryEntry[]> {
  const {startISO,endISO}=shamsiMonthToGregorianRange(jYear,jMonth);
  const {rows}=await query(`SELECT id,company_id,company_name,company_catalog_code,company_province,company_city,company_phone,company_address,vessel_id,vessel_name,vessel_volume,vessel_type,vessel_details,test_date,result,cycle_count,created_at FROM test_history WHERE test_date BETWEEN $1 AND $2 ORDER BY company_name,test_date,vessel_type`,[startISO,endISO]);
  return rows.map(mapHistoryRow);
}

export async function listAvailableHistoryMonths():Promise<Array<{jYear:number;jMonth:number}>> {
  const {rows}=await query(`SELECT DISTINCT test_date FROM test_history ORDER BY test_date DESC`);
  const seen=new Set<string>();
  const months:Array<{jYear:number;jMonth:number}>=[];
  for (const row of rows) { const d=persianDate(row.test_date); const key=`${d.year}-${d.month.number}`; if (!seen.has(key)) {seen.add(key);months.push({jYear:d.year,jMonth:d.month.number});} }
  months.sort((a,b)=>a.jYear!==b.jYear?b.jYear-a.jYear:b.jMonth-a.jMonth);
  return months;
}
