import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { verifyPassword, createSession } from "../../../../lib/auth";
import { loginSchema, parseOrThrow, ValidationError } from "../../../../lib/validation";
import { isLoginRateLimited, recordLoginAttempt, getClientIp } from "../../../../lib/rate-limit";
import { logAudit } from "../../../../lib/audit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const body = parseOrThrow(loginSchema, await req.json());
    const { phone, password } = body;

    // بررسی rate limit قبل از هر کوئری دیگر — جلوی حمله brute-force را می‌گیرد
    if (await isLoginRateLimited(phone, ip)) {
      return NextResponse.json(
        { error: "تعداد تلاش‌های ناموفق زیاد بوده؛ لطفاً ۱۵ دقیقه دیگر تلاش کنید" },
        { status: 429 }
      );
    }

    const db = getSupabaseServerClient();
    const { data: admin, error } = await db
      .from("admins")
      .select("*")
      .eq("phone", phone)
      .eq("is_active", true)
      .single();

    // حتی اگر ادمین پیدا نشد هم verify روی یک هش ثابت اجرا می‌شود تا
    // زمان پاسخ برای «کاربر وجود ندارد» و «رمز اشتباه است» یکسان بماند
    // (جلوگیری از user enumeration از طریق timing attack)
    const passwordHash = admin?.password_hash ?? "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsa";
    const isValid = await verifyPassword(password, passwordHash);

    if (error || !admin || !isValid) {
      await recordLoginAttempt(phone, ip, false);
      return NextResponse.json({ error: "شماره موبایل یا رمزعبور نادرست است" }, { status: 401 });
    }

    await recordLoginAttempt(phone, ip, true);
    await createSession({ id: admin.id, phone: admin.phone });
    await db.from("admins").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
    await logAudit({ adminId: admin.id, adminPhone: admin.phone, action: "admin.login", entityType: "admin", entityId: admin.id, ip });

    return NextResponse.json({
      admin: { id: admin.id, phone: admin.phone, fullName: admin.full_name, role: admin.role },
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
