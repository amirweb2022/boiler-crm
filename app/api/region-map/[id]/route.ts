import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { deleteRegionMap } from "../../../../lib/db/region-map.repository";
import { uuidSchema, parseOrThrow, ValidationError } from "../../../../lib/validation";
import { logAudit } from "../../../../lib/audit";
import { getClientIp } from "../../../../lib/rate-limit";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const id = parseOrThrow(uuidSchema, params.id);

    await deleteRegionMap(id);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "region_map.delete",
      entityType: "region_map",
      entityId: id,
      ip: getClientIp(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
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
}
