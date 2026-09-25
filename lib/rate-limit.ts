import { getSupabaseServerClient } from "./supabase/server";

// =====================================================================
// Rate Limiting برای ورود ادمین — چون Next.js روی محیط سرورلس معمولاً
// چند اینستنس مستقل دارد، محدودسازی حافظه‌محور (in-memory) قابل‌اتکا
// نیست؛ به‌جایش هر تلاش ورود (موفق/ناموفق) در جدول login_attempts ثبت
// می‌شود و قبل از هر تلاش جدید، تعداد شکست‌های اخیر بررسی می‌گردد.
// =====================================================================

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function isLoginRateLimited(phone: string, ip: string | null): Promise<boolean> {
  const db = getSupabaseServerClient();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("success", false)
    .gte("created_at", windowStart);

  if (error) {
    // در صورت خطای دیتابیس، به‌صورت محتاطانه اجازه ورود می‌دهیم (fail-open)
    // تا یک مشکل زیرساختی باعث قفل‌شدن کامل دسترسی ادمین‌ها نشود؛ اما
    // خطا لاگ می‌شود تا بررسی شود.
    console.error("خطا در بررسی rate limit:", error.message);
    return false;
  }

  return (count ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(phone: string, ip: string | null, success: boolean) {
  const db = getSupabaseServerClient();
  await db.from("login_attempts").insert({ phone, ip_address: ip, success });
}

export function getClientIp(req: Request): string | null {
  // در Vercel/پروکسی‌های استاندارد این هدر ست می‌شود
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
