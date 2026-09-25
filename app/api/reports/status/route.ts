import { NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { getLastCompletedShamsiMonth, shamsiMonthLabel } from "../../../../lib/date/shamsi";
import { listAvailableHistoryMonths } from "../../../../lib/db/test-history.repository";

// GET /api/reports/status
// اطلاعاتی که فرانت برای ساخت دکمه‌ی «دانلود گزارش <ماه قبل>» و
// دراپ‌داون «ماه دیگر» لازم دارد.
export async function GET() {
  try {
    await requireRole("admin");

    const { jYear, jMonth } = getLastCompletedShamsiMonth();
    const availableMonths = await listAvailableHistoryMonths();

    return NextResponse.json({
      lastCompletedMonth: { jYear, jMonth, label: shamsiMonthLabel(jYear, jMonth) },
      availableMonths: availableMonths.map((m) => ({ ...m, label: shamsiMonthLabel(m.jYear, m.jMonth) })),
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
