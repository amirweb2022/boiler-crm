import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { getSmsProvider } from "../../../../lib/sms";
import { clearStaleCertificates } from "../../../../lib/db/companies.repository";

function tehranNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

function calendarDaysUntil(due: string, today: string) {
  return Math.round(
    (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  );
}

// GET /api/sms/send-reminders   Header: x-cron-secret: <CRON_SECRET>
// این روت باید روزی یک‌بار توسط یک Cron Job واقعی فراخوانی شود و دو
// وظیفه‌ی مستقل را انجام می‌دهد:
//   ۱) ارسال یادآوری از N روز مانده تا روز قبل از سررسید، فقط ۸ تا ۲۰ تهران
//   ۲) جدا کردن گواهی‌های قدیمی که مالکیت چرخه آن‌ها مشخص است
export async function GET(req: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  const authorization = req.headers.get("authorization");
  const authorized = Boolean(configuredSecret) && (
    headerSecret === configuredSecret ||
    authorization === `Bearer ${configuredSecret}`
  );
  if (!authorized) {
    console.warn("[sms-reminders] rejected request: invalid cron secret");
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const reminderDaysBefore = Number(
    process.env.SMS_REMINDER_DAYS_BEFORE ?? 2,
  );
  const certificateClearNearDueDays = Number(
    process.env.CERTIFICATE_CLEAR_NEAR_DUE_DAYS ?? 30,
  );

  const db = getSupabaseServerClient();
  const current = tehranNow(new Date());

  // --- بخش ۱: یادآوری پیامکی ---
  let sentCount = 0;
  let processed = 0;

  if (current.hour >= 8 && current.hour < 20) {
    const sms = getSmsProvider();
    const { data: pendingRecords, error } = await db
      .from("test_records")
      .select("*, companies(*)")
      .eq("status", "pending")
      .gt("test_date", current.date)
      .lte("test_date", new Date(Date.parse(`${current.date}T00:00:00Z`) + reminderDaysBefore * 86400000).toISOString().slice(0, 10));
    if (error) throw error;
    processed = pendingRecords?.length ?? 0;

    for (const record of pendingRecords ?? []) {
      const remaining = calendarDaysUntil(record.test_date, current.date);
      if (remaining < 1 || remaining > reminderDaysBefore) continue;

      const { data: claimed, error: claimError } = await db.rpc("claim_reminder", {
        record_id: record.id, due_date: record.test_date,
      });
      if (claimError) throw claimError;
      if (!claimed) continue;
      const company = record.companies;
      const message = `یادآوری: ${remaining} روز تا تاریخ آزمون دیگ بخار شرکت ${company.name} باقی مانده است. لطفاً هماهنگی لازم را انجام دهید.`;

      const sendTime = tehranNow(new Date());
      if (sendTime.date !== current.date || sendTime.hour < 8 || sendTime.hour >= 20) {
        const { error: releaseError } = await db.from("reminder_claims")
          .update({ status: "failed" }).eq("test_record_id", record.id).eq("test_date", record.test_date);
        if (releaseError) throw releaseError;
        break;
      }

      console.info("[sms-reminders] calling SMS provider", {
        provider: process.env.SMS_PROVIDER ?? "mock",
        testRecordId: record.id,
      });
      const result = await sms.send({ phone: company.phone, message });

      const { error: statusError } = await db.from("reminder_claims")
        .update({ status: result.success ? "sent" : "failed" })
        .eq("test_record_id", record.id).eq("test_date", record.test_date);
      if (statusError) throw statusError;

      const { error: insertError } = await db.from("notifications").insert({
        company_id: company.id,
        test_record_id: record.id,
        phone: company.phone,
        message,
        type: "reminder",
        status: result.success ? "sent" : "failed",
        provider_ref: result.providerRef ?? null,
        sent_at: result.success ? new Date().toISOString() : null,
      });
      if (insertError) throw insertError;

      if (result.success) sentCount++;
    }
  }

  // --- بخش ۲: پاک‌سازی خودکار گواهی‌های بیات ---
  const { cleared } = await clearStaleCertificates(
    certificateClearNearDueDays,
  );

  if (current.hour < 8 || current.hour >= 20) {
    console.info("[sms-reminders] skipped outside Tehran send window", {
      date: current.date,
      hour: current.hour,
    });
  }

  return NextResponse.json({
    reminderDaysBefore,
    processed,
    sent: sentCount,
    certificatesCleared: cleared.length,
  });
}
