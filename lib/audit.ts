import { getSupabaseServerClient } from "./supabase/server";

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
    const db = getSupabaseServerClient();
    await db.from("audit_logs").insert({
      admin_id: input.adminId,
      admin_phone: input.adminPhone,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ip_address: input.ip ?? null,
    });
  } catch (err) {
    // لاگ کردن هرگز نباید عملیات اصلی کاربر را متوقف کند
    console.error("خطا در ثبت audit log:", err);
  }
}
