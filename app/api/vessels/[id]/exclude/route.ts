import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../../lib/auth";
import { setVesselExclusion } from "../../../../../lib/db/vessels.repository";
import { excludeVesselSchema, uuidSchema, parseOrThrow, ValidationError } from "../../../../../lib/validation";
import { logAudit } from "../../../../../lib/audit";
import { getClientIp } from "../../../../../lib/rate-limit";

// PATCH /api/vessels/:id/exclude
// فقط admin (نه tester) — چون این تصمیم می‌تواند «همه مخازن تست‌شده‌اند»
// را برای شرکت True کند بدون تست واقعی، پس باید محدود و با دلیل ثبت‌شده باشد.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const id = parseOrThrow(uuidSchema, params.id);
    const { excluded, reason } = parseOrThrow(excludeVesselSchema, await req.json());

    const vessel = await setVesselExclusion(id, excluded, reason);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: excluded ? "vessel.exclude" : "vessel.include",
      entityType: "vessel",
      entityId: id,
      metadata: { reason: reason ?? null },
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
