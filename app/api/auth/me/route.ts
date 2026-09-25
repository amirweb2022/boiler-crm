import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";

// GET /api/auth/me — فرانت از این برای تصمیم‌گیری نمایش/عدم‌نمایش
// دکمه‌های محدود به نقش «admin» استفاده می‌کند. توجه: این فقط برای UX
// است؛ کنترل واقعی امنیتی همیشه در خودِ هر API route (requireRole) است.
export async function GET() {
  try {
    const admin = await requireAdmin();
    return NextResponse.json({
      admin: { id: admin.id, phone: admin.phone, fullName: admin.fullName, role: admin.role },
    });
  } catch {
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  }
}
