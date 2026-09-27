import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { getCertificateFields } from "../../../../lib/certificates/field-schema";

// GET /api/certificates/fields?type=tank|boiler
// فرانت از این برای ساخت پویای فرم «تولید گواهی» استفاده می‌کند —
// فقط فیلدهایی که auto نیستند (یعنی باید توسط ادمین پر شوند) برگردانده می‌شود.
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");

    const type = req.nextUrl.searchParams.get("type");
    if (type !== "tank" && type !== "boiler") {
      return NextResponse.json({ error: "نوع تجهیز نامعتبر است" }, { status: 400 });
    }

    const fields = getCertificateFields(type).filter((f) => !f.auto);

    return NextResponse.json({
      fields: fields.map((f) => ({ key: f.key, label: f.label, required: f.required, group: f.group })),
    });
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