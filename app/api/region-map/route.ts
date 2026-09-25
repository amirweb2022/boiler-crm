import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../lib/auth";
import { listRegionMap, upsertRegionMap } from "../../../lib/db/region-map.repository";
import { upsertRegionMapSchema, parseOrThrow, ValidationError } from "../../../lib/validation";
import { logAudit } from "../../../lib/audit";
import { getClientIp } from "../../../lib/rate-limit";

export async function GET() {
  try {
    await requireRole("admin");
    const items = await listRegionMap();
    return NextResponse.json({ items });
  } catch (err: any) {
    return handleError(err);
  }
}

// POST — ایجاد یا آپدیت نگاشت یک استان (upsert بر اساس نام استان)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const body = parseOrThrow(upsertRegionMapSchema, await req.json());

    const item = await upsertRegionMap(body.province, body.regionName);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "region_map.upsert",
      entityType: "region_map",
      entityId: item.id,
      metadata: body,
      ip: getClientIp(req),
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    return handleError(err);
  }
}

function handleError(err: any) {
  if (err.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}
