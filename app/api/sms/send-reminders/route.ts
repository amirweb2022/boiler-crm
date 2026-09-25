import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { getSmsProvider } from "../../../../lib/sms";
import { daysUntil } from "../../../../lib/date/shamsi";
import { clearStaleCertificates } from "../../../../lib/db/companies.repository";

// GET /api/sms/send-reminders   Header: x-cron-secret: <CRON_SECRET>
// این روت باید روزی یک‌بار توسط یک Cron Job واقعی فراخوانی شود و دو
// وظیفه‌ی مستقل را انجام می‌دهد:
//   ۱) ارسال پیامک یادآوری دقیقاً N روز مانده به سررسید
//   ۲) پاک‌سازی خودکار گواهی‌های چرخه قبل وقتی چرخه جدید نزدیک سررسید شود
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const REMINDER_DAYS_BEFORE = Number(process.env.SMS_REMINDER_DAYS_BEFORE ?? 2);
  const CERTIFICATE_CLEAR_NEAR_DUE_DAYS = Number(process.env.CERTIFICATE_CLEAR_NEAR_DUE_DAYS ?? 30);

  const db = getSupabaseServerClient();
  const sms = getSmsProvider();

  // --- بخش ۱: یادآوری پیامکی ---
  const { data: pendingRecords, error } = await db
    .from("test_records")
    .select("*, companies(*)")
    .eq("status", "pending");
  if (error) throw error;

  let sentCount = 0;

  for (const record of pendingRecords ?? []) {
    const remaining = daysUntil(record.test_date);
    if (remaining !== REMINDER_DAYS_BEFORE) continue;

    const { data: alreadySent } = await db
      .from("notifications")
      .select("id")
      .eq("test_record_id", record.id)
      .eq("type", "reminder")
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .maybeSingle();
    if (alreadySent) continue;

    const company = record.companies;
    const message = `یادآوری: ${REMINDER_DAYS_BEFORE} روز تا تاریخ آزمون دیگ بخار شرکت ${company.name} باقی مانده است. لطفاً هماهنگی لازم را انجام دهید.`;

    const result = await sms.send({ phone: company.phone, message });

    await db.from("notifications").insert({
      company_id: company.id,
      test_record_id: record.id,
      phone: company.phone,
      message,
      type: "reminder",
      status: result.success ? "sent" : "failed",
      provider_ref: result.providerRef ?? null,
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (result.success) sentCount++;
  }

  // --- بخش ۲: پاک‌سازی خودکار گواهی‌های بیات ---
  const { cleared } = await clearStaleCertificates(CERTIFICATE_CLEAR_NEAR_DUE_DAYS);

  return NextResponse.json({
    reminderDaysBefore: REMINDER_DAYS_BEFORE,
    processed: pendingRecords?.length ?? 0,
    sent: sentCount,
    certificatesCleared: cleared.length,
  });
}
