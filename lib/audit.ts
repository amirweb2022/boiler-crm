import { query } from "./db/postgres";

// =====================================================================
// هر عملیات حساس (ساخت/ویرایش/حذف شرکت، مخزن، ثبت انجام، آپلود گواهی)
// اینجا لاگ می‌شود تا در صورت مشکل یا نیاز حسابرسی، مشخص باشد چه کسی،
// چه زمانی، چه کاری انجام داده است.
// =====================================================================

interface AuditLogInput {
  adminId: string;
  adminPhone: string;
  action: string; // مثال: "company.create", "test_record.mark_done"
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

export async function logAudit(input: AuditLogInput) {
  try {
    await query(`INSERT INTO audit_logs(admin_id,admin_phone,action,entity_type,entity_id,metadata,ip_address) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`, [
      input.adminId,input.adminPhone,input.action,input.entityType,input.entityId??null,
      input.metadata ? JSON.stringify(input.metadata) : null,input.ip??null,
    ]);
  } catch (err) {
    // لاگ کردن هرگز نباید عملیات اصلی کاربر را متوقف کند
    console.error("خطا در ثبت audit log:", err);
  }
}
