import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../../lib/auth";
import { toggleVesselTested } from "../../../../../lib/db/vessels.repository";
import { toggleVesselSchema, uuidSchema, parseOrThrow, ValidationError } from "../../../../../lib/validation";
import { logAudit } from "../../../../../lib/audit";
import { getClientIp } from "../../../../../lib/rate-limit";

// PATCH /api/vessels/:id/toggle
// این تنها عملیاتی است که نقش «tester» هم مجاز به انجامش است — دقیقاً
// طبق نیازمندی: تستر فقط می‌تواند تیک مخازن را بزند/بردارد.
// شرط «سررسید فرارسیده باشد» هم مستقل از نقش، در toggleVesselTested چک می‌شود.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin", "tester");
    const id = parseOrThrow(uuidSchema, params.id);
    const { tested } = parseOrThrow(toggleVesselSchema, await req.json());

    const vessel = await toggleVesselTested(id, tested);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "vessel.toggle",
      entityType: "vessel",
      entityId: id,
      metadata: { tested },
      ip: getClientIp(req),
    });

    return NextResponse.json({ vessel });
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
