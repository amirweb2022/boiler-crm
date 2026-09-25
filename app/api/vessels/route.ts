import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../lib/auth";
import { createVessel } from "../../../lib/db/vessels.repository";
import { createVesselSchema, parseOrThrow, ValidationError } from "../../../lib/validation";
import { logAudit } from "../../../lib/audit";
import { getClientIp } from "../../../lib/rate-limit";

// فقط admin می‌تواند مخزن جدید بسازد؛ tester فقط اجازه toggle دارد.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const body = parseOrThrow(createVesselSchema, await req.json());

    const vessel = await createVessel(body);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "vessel.create",
      entityType: "vessel",
      entityId: vessel.id,
      metadata: { companyId: body.companyId, name: body.name },
      ip: getClientIp(req),
    });

    return NextResponse.json({ vessel }, { status: 201 });
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
