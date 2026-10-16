import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { getDashboardStats } from "../../../../lib/db/companies.repository";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getDashboardStats());
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
