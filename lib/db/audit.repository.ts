import { query } from "./postgres";

export interface AuditLogEntry { id:string; adminId:string|null; adminPhone:string|null; adminFullName:string|null; action:string; entityType:string; entityId:string|null; metadata:Record<string,unknown>|null; ipAddress:string|null; createdAt:string; }
export interface AuditLogFilters { entityType?:string; action?:string; search?:string; page?:number; pageSize?:number; }
export interface PaginatedAuditLogs { data:AuditLogEntry[]; total:number; page:number; pageSize:number; }

export async function listAuditLogs(filters:AuditLogFilters):Promise<PaginatedAuditLogs> {
  const page=filters.page??1,pageSize=Math.min(filters.pageSize??20,100),values:unknown[]=[],where:string[]=[];
  if(filters.entityType&&filters.entityType!=="all"){values.push(filters.entityType);where.push(`a.entity_type=$${values.length}`);}
  if(filters.action&&filters.action!=="all"){values.push(filters.action);where.push(`a.action=$${values.length}`);}
  if(filters.search){values.push(`%${filters.search.slice(0,50).replace(/[\\%_]/g,"\\$&")}%`);where.push(`a.admin_phone ILIKE $${values.length} ESCAPE '\\'`);}
  const whereSql=where.length?`WHERE ${where.join(" AND ")}`:"";
  const filterValues=values.slice();
  values.push(pageSize,(page-1)*pageSize);
  const [{rows},{rows:countRows}]=await Promise.all([
    query(`SELECT a.*,ad.full_name AS admin_full_name FROM audit_logs a LEFT JOIN admins ad ON ad.id=a.admin_id ${whereSql} ORDER BY a.created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values),
    query(`SELECT count(*)::text AS total FROM audit_logs a ${whereSql}`,filterValues),
  ]);
  return {data:rows.map((r:any)=>({id:r.id,adminId:r.admin_id,adminPhone:r.admin_phone,adminFullName:r.admin_full_name??null,action:r.action,entityType:r.entity_type,entityId:r.entity_id,metadata:r.metadata,ipAddress:r.ip_address,createdAt:r.created_at})),total:Number(countRows[0]?.total??0),page,pageSize};
}
