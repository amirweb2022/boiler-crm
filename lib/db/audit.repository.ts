import { getSupabaseServerClient } from "../supabase/server";

export interface AuditLogEntry {
  id: string;
  adminId: string | null;
  adminPhone: string | null;
  adminFullName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: string; // "all" یا یکی از company/vessel/test_record/admin
  action?: string; // "all" یا یک action خاص
  search?: string; // جستجو در شماره موبایل ادمین
  page?: number;
  pageSize?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function escapeForFilter(value: string): string {
  return value.replace(/[%,]/g, "\\$&");
}

export async function listAuditLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
  const db = getSupabaseServerClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // join سبک به admins برای گرفتن نام فعلی (اگر ادمین بعداً حذف/تغییرنام
  // شود، admin_phone که در لحظه‌ی ثبت ذخیره شده هم‌چنان قابل‌اتکاست)
  let query = db
    .from("audit_logs")
    .select("*, admins(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.action && filters.action !== "all") {
    query = query.eq("action", filters.action);
  }
  if (filters.search) {
    const s = escapeForFilter(filters.search.slice(0, 50));
    query = query.ilike("admin_phone", `%${s}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const items: AuditLogEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    adminId: row.admin_id,
    adminPhone: row.admin_phone,
    adminFullName: row.admins?.full_name ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }));

  return { data: items, total: count ?? items.length, page, pageSize };
}
