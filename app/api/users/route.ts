import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, requireRole } from "../../../lib/auth";
import { createUser, DuplicateUserError } from "../../../lib/db/users.repository";
import { createUserSchema, parseOrThrow, ValidationError } from "../../../lib/validation";
import { getClientIp } from "../../../lib/rate-limit";
import { logAudit } from "../../../lib/audit";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole("admin");
    const body = parseOrThrow(createUserSchema, await req.json());
    const user = await createUser(body);
    await logAudit({
      adminId: actor.id,
      adminPhone: actor.phone,
      action: "user.create",
      entityType: "admin",
      entityId: user.id,
      metadata: { phone: user.phone, fullName: user.fullName, role: user.role },
      ip: getClientIp(req),
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof DuplicateUserError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
