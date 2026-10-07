import { NextResponse } from "next/server";
import { ForbiddenError, requireRole } from "../../../../../lib/auth";
import { getClientIp } from "../../../../../lib/rate-limit";
import { logAudit } from "../../../../../lib/audit";
import { getSmsProvider } from "../../../../../lib/sms";
import { calendarDaysUntil, getTehranClock, isReminderSendTime } from "../../../../../lib/sms/reminder-policy";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { testRecordId: string } },
) {
  try {
    const admin = await requireRole("admin");
    const now = new Date();
    if (!isReminderSendTime(now)) {
      return NextResponse.json({ error: "ارسال پیامک فقط از ساعت ۰۸:۰۰ تا پیش از ۲۲:۰۰ به وقت تهران امکان‌پذیر است" }, { status: 403 });
    }

    const db = getSupabaseServerClient();
    const { data: record, error: recordError } = await db
      .from("test_records")
      .select("id, test_date, status, companies!inner(id, name, phone, status)")
      .eq("id", params.testRecordId)
      .maybeSingle();
    if (recordError) throw recordError;
    if (!record || record.status !== "pending") {
      return NextResponse.json({ error: "این شرکت در چرخه آزمون جاری واجد شرایط یادآوری نیست" }, { status: 404 });
    }

    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    const { date } = getTehranClock(now);
    const remainingDays = calendarDaysUntil(record.test_date, date);
    if (company.status !== "active" || remainingDays < 1 || remainingDays > 2) {
      return NextResponse.json({ error: "این شرکت در حال حاضر به پیامک یادآوری نیاز ندارد" }, { status: 409 });
    }

    const { data: claimed, error: claimError } = await db.rpc("claim_reminder", {
      record_id: record.id,
      due_date: record.test_date,
    });
    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json({ error: "یادآوری این چرخه قبلاً ارسال شده یا در حال ارسال است" }, { status: 409 });
    }

    const message = `یادآوری: ${remainingDays} روز تا تاریخ آزمون دیگ بخار شرکت ${company.name} باقی مانده است. لطفاً هماهنگی لازم را انجام دهید.`;
    let result: { success: boolean; providerRef?: string; error?: string };
    try {
      result = await getSmsProvider().send({ phone: company.phone, message });
    } catch (error: any) {
      result = { success: false, error: error?.message ?? "خطا در ارتباط با سرویس پیامک" };
    }

    const { error: statusError } = await db.from("reminder_claims")
      .update({ status: result.success ? "sent" : "failed" })
      .eq("test_record_id", record.id)
      .eq("test_date", record.test_date);
    if (statusError) console.error("Failed to update SMS reminder claim", statusError);

    const { error: notificationError } = await db.from("notifications").insert({
      company_id: company.id,
      test_record_id: record.id,
      phone: company.phone,
      message,
      type: "reminder",
      status: result.success ? "sent" : "failed",
      provider_ref: result.providerRef ?? null,
      sent_at: result.success ? new Date().toISOString() : null,
    });
    if (notificationError) console.error("Failed to record SMS reminder", notificationError);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: result.success ? "sms.reminder.sent" : "sms.reminder.failed",
      entityType: "test_record",
      entityId: record.id,
      metadata: { testDate: record.test_date, providerRef: result.providerRef ?? null },
      ip: getClientIp(request),
    });

    return NextResponse.json({
      success: result.success,
      error: result.success ? undefined : result.error ?? "ارسال پیامک ناموفق بود",
      providerRef: result.providerRef,
    }, { status: result.success ? 200 : 502 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Failed to send SMS reminder", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
