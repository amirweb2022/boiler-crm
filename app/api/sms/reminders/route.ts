import { NextResponse } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { query } from "../../../../lib/db/postgres";
import { calendarDaysUntil, getTehranClock, reminderDateRange } from "../../../../lib/sms/reminder-policy";

export async function GET() {
  try {
    await requireRole("admin");
    const { date } = getTehranClock();
    const { tomorrow, dayAfterTomorrow } = reminderDateRange(date);
    const { rows: records } = await query(`SELECT tr.id,tr.test_date,tr.status,c.id AS company_id,c.name,c.phone,c.status AS company_status FROM test_records tr JOIN companies c ON c.id=tr.company_id WHERE tr.status='pending' AND c.status='active' AND tr.test_date BETWEEN $1 AND $2 ORDER BY tr.test_date`, [tomorrow,dayAfterTomorrow]);

    const rows = records ?? [];
    const recordIds = rows.map((record: any) => record.id);
    const claimed = new Set<string>();
    if (recordIds.length) {
      const { rows: claims } = await query(`SELECT DISTINCT test_record_id FROM reminder_claims WHERE test_record_id=ANY($1::uuid[]) AND status IN ('sent','sending')`, [recordIds]);
      for (const claim of claims) claimed.add(claim.test_record_id);
    }

    const reminders = rows
      .filter((record: any) => !claimed.has(record.id))
      .map((record: any) => {
        return {
          testRecordId: record.id,
          companyId: record.company_id,
          companyName: record.name,
          phone: record.phone,
          testDate: record.test_date,
          remainingDays: calendarDaysUntil(record.test_date, date),
        };
      });

    return NextResponse.json({ reminders, date, serverTime: new Date().toISOString() });
  } catch (error: any) {
    return handleError(error);
  }
}

function handleError(error: any) {
  if (error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  }
  if (error.name === "ForbiddenError") {
    return NextResponse.json({ error: "شما اجازه انجام این عملیات را ندارید" }, { status: 403 });
  }
  console.error("Failed to list SMS reminders", error);
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}
