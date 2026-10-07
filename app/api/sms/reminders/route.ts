import { NextResponse } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { calendarDaysUntil, getTehranClock, reminderDateRange } from "../../../../lib/sms/reminder-policy";

export async function GET() {
  try {
    await requireRole("admin");
    const db = getSupabaseServerClient();
    const { date } = getTehranClock();
    const { tomorrow, dayAfterTomorrow } = reminderDateRange(date);
    const { data: records, error } = await db
      .from("test_records")
      .select("id, test_date, status, companies!inner(id, name, phone, status)")
      .eq("status", "pending")
      .eq("companies.status", "active")
      .gte("test_date", tomorrow)
      .lte("test_date", dayAfterTomorrow)
      .order("test_date", { ascending: true });
    if (error) throw error;

    const rows = records ?? [];
    const recordIds = rows.map((record: any) => record.id);
    const claimed = new Set<string>();
    if (recordIds.length) {
      const { data: claims, error: claimsError } = await db
        .from("reminder_claims")
        .select("test_record_id")
        .in("test_record_id", recordIds)
        .in("status", ["sent", "sending"]);
      if (claimsError) throw claimsError;
      for (const claim of claims ?? []) claimed.add(claim.test_record_id);
    }

    const reminders = rows
      .filter((record: any) => !claimed.has(record.id))
      .map((record: any) => {
        const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
        return {
          testRecordId: record.id,
          companyId: company.id,
          companyName: company.name,
          phone: company.phone,
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
