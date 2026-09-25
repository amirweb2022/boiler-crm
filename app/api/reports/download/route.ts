import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { buildMonthlyReportWorkbook } from "../../../../lib/reports/monthly-report";
import { shamsiMonthLabel } from "../../../../lib/date/shamsi";
import { logAudit } from "../../../../lib/audit";
import { getClientIp } from "../../../../lib/rate-limit";

// GET /api/reports/download?jYear=1405&jMonth=5
export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole("admin");

    const sp = req.nextUrl.searchParams;
    const jYear = Number(sp.get("jYear"));
    const jMonth = Number(sp.get("jMonth"));

    if (!jYear || !jMonth || jMonth < 1 || jMonth > 12) {
      return NextResponse.json({ error: "سال/ماه نامعتبر است" }, { status: 400 });
    }

    const workbook = await buildMonthlyReportWorkbook(jYear, jMonth);
    const buffer = await workbook.xlsx.writeBuffer();

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "report.download_monthly",
      entityType: "report",
      metadata: { jYear, jMonth },
      ip: getClientIp(req),
    });

    const fileName = `گزارش-${shamsiMonthLabel(jYear, jMonth)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "خطای سرور در ساخت گزارش" }, { status: 500 });
  }
}
