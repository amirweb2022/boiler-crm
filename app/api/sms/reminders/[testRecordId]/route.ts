import { NextResponse } from "next/server";
import { ForbiddenError, requireRole } from "../../../../../lib/auth";
import { getClientIp } from "../../../../../lib/rate-limit";
import { logAudit } from "../../../../../lib/audit";
import { getSmsProvider } from "../../../../../lib/sms";
import {
  calendarDaysUntil,
  getTehranClock,
  isReminderSendTime,
} from "../../../../../lib/sms/reminder-policy";
import { query } from "../../../../../lib/db/postgres";
import {
  parseOrThrow,
  uuidSchema,
  ValidationError,
} from "../../../../../lib/validation";
import { toShamsiDisplay } from "../../../../../lib/date/shamsi";

export async function POST(
  request: Request,
  { params }: { params: { testRecordId: string } },
) {
  try {
    const admin = await requireRole("admin");
    const testRecordId = parseOrThrow(uuidSchema, params.testRecordId);
    const now = new Date();
    if (!isReminderSendTime(now)) {
      return NextResponse.json(
        {
          error:
            "ارسال پیامک فقط از ساعت ۰۸:۰۰ تا پیش از ۲۲:۰۰ به وقت تهران امکان‌پذیر است",
        },
        { status: 403 },
      );
    }

    const { rows } = await query(
      `SELECT tr.id,tr.test_date,tr.status,c.id AS company_id,c.name,c.phone,c.status AS company_status FROM test_records tr JOIN companies c ON c.id=tr.company_id WHERE tr.id=$1`,
      [testRecordId],
    );
    const record = rows[0];
    if (!record || record.status !== "pending") {
      return NextResponse.json(
        { error: "این شرکت در چرخه آزمون جاری واجد شرایط یادآوری نیست" },
        { status: 404 },
      );
    }

    const company = {
      id: record.company_id,
      name: record.name,
      phone: record.phone,
      status: record.company_status,
    };
    const { date } = getTehranClock(now);
    const remainingDays = calendarDaysUntil(record.test_date, date);
    if (company.status !== "active" || remainingDays < 1 || remainingDays > 2) {
      return NextResponse.json(
        { error: "این شرکت در حال حاضر به پیامک یادآوری نیاز ندارد" },
        { status: 409 },
      );
    }

    const { rows: claimRows } = await query(
      `INSERT INTO reminder_claims(test_record_id,test_date,status) VALUES($1,$2,'sending') ON CONFLICT(test_record_id,test_date) DO UPDATE SET status='sending',claimed_at=now() WHERE reminder_claims.status='failed' RETURNING test_record_id`,
      [record.id, record.test_date],
    );
    if (!claimRows.length) {
      return NextResponse.json(
        { error: "یادآوری این چرخه قبلاً ارسال شده یا در حال ارسال است" },
        { status: 409 },
      );
    }

    const message = `مشتری گرامی، ${company.name}
مهلت تست سالانه ارزیابی ایمنی تجهیزات شما در تاریخ ${toShamsiDisplay(record.test_date)} فرا می‌رسد. جهت دریافت پیش‌فاکتور و هماهنگی زمان تست، با شماره 02833991320
https://rubika.ir/akhgar_industrial_group
آیدی روبیکا : @AkhgarSanat_Pooya
تماس بگیرید.
اخگر صنعت پویا`;
    let result: { success: boolean; providerRef?: string; error?: string };
    try {
      result = await getSmsProvider().send({ phone: company.phone, message });
    } catch (error: any) {
      result = {
        success: false,
        error: error?.message ?? "خطا در ارتباط با سرویس پیامک",
      };
    }

    try {
      await query(
        `UPDATE reminder_claims SET status=$3 WHERE test_record_id=$1 AND test_date=$2`,
        [record.id, record.test_date, result.success ? "sent" : "failed"],
      );
    } catch (error) {
      console.error("Failed to update SMS reminder claim", error);
    }

    try {
      await query(
        `INSERT INTO notifications(company_id,test_record_id,phone,message,type,status,provider_ref,sent_at) VALUES($1,$2,$3,$4,'reminder',$5,$6,$7)`,
        [
          company.id,
          record.id,
          company.phone,
          message,
          result.success ? "sent" : "failed",
          result.providerRef ?? null,
          result.success ? new Date() : null,
        ],
      );
    } catch (error) {
      console.error("Failed to record SMS reminder", error);
    }

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: result.success ? "sms.reminder.sent" : "sms.reminder.failed",
      entityType: "test_record",
      entityId: record.id,
      metadata: {
        testDate: record.test_date,
        providerRef: result.providerRef ?? null,
      },
      ip: getClientIp(request),
    });

    return NextResponse.json(
      {
        success: result.success,
        error: result.success
          ? undefined
          : (result.error ?? "ارسال پیامک ناموفق بود"),
        providerRef: result.providerRef,
      },
      { status: result.success ? 200 : 502 },
    );
  } catch (error: any) {
    if (error instanceof ValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 },
      );
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Failed to send SMS reminder", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
