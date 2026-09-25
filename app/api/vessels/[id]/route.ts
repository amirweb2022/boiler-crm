import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { updateVessel, deleteVessel } from "../../../../lib/db/vessels.repository";
import { updateVesselSchema, uuidSchema, parseOrThrow, ValidationError } from "../../../../lib/validation";
import { logAudit } from "../../../../lib/audit";
import { getClientIp } from "../../../../lib/rate-limit";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const id = parseOrThrow(uuidSchema, params.id);
    const body = parseOrThrow(updateVesselSchema, await req.json());

    const vessel = await updateVessel(id, body);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "vessel.update",
      entityType: "vessel",
      entityId: id,
      metadata: body,
      ip: getClientIp(req),
    });

    return NextResponse.json({ vessel });
  } catch (err: any) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const id = parseOrThrow(uuidSchema, params.id);

    await deleteVessel(id);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "vessel.delete",
      entityType: "vessel",
      entityId: id,
      ip: getClientIp(req),
    });

    return NextResponse.json({ ok: true });
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
