import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../../lib/auth";
import { markTestDoneAndStartNextCycle } from "../../../../../lib/db/companies.repository";
import { uuidSchema, parseOrThrow, ValidationError } from "../../../../../lib/validation";
import { logAudit } from "../../../../../lib/audit";
import { getClientIp } from "../../../../../lib/rate-limit";

// POST /api/test-records/:companyId/mark-done
// توجه: پارامتر مسیر company_id است، چون هر شرکت دقیقاً یک رکورد تست فعال دارد.
// فقط admin مجاز است (tester نه).
//
// جریان کامل طبق نیازمندی:
// ۱) فقط اگر تاریخ فرارسیده، همه مخازن تیک خورده، و گواهی آپلود شده باشد مجاز است
// ۲) تاریخ آزمون یک سال شمسی جلو می‌رود (روی همان رکورد)
// ۳) گواهی فعلی نگه داشته می‌شود (حذف نمی‌شود) — فقط وقتی چرخه جدید به
//    وضعیت «نزدیک سررسید» برسد، به‌صورت خودکار توسط cron پاک می‌شود
//    (به app/api/sms/send-reminders/route.ts نگاه کنید)
// ۴) تیک تست همه مخازن ریست می‌شود تا برای چرخه جدید دوباره تست شوند
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const companyId = parseOrThrow(uuidSchema, params.id);

    const { testRecord } = await markTestDoneAndStartNextCycle(companyId);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "test_record.mark_done",
      entityType: "test_record",
      entityId: testRecord.id,
      metadata: { companyId, newTestDate: testRecord.testDate, cycleCount: testRecord.cycleCount },
      ip: getClientIp(req),
    });

    return NextResponse.json({ testRecord });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
