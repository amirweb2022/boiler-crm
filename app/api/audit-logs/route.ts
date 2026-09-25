import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../lib/auth";
import { listAuditLogs } from "../../../lib/db/audit.repository";

// GET /api/audit-logs — فقط admin (نه tester) اجازه دیدن تاریخچه را دارد.
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");

    const sp = req.nextUrl.searchParams;
    const result = await listAuditLogs({
      entityType: sp.get("entityType") ?? "all",
      action: sp.get("action") ?? "all",
      search: sp.get("search")?.slice(0, 50) ?? undefined,
      page: Math.max(1, Number(sp.get("page") ?? 1) || 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
    });

    return NextResponse.json(result);
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
