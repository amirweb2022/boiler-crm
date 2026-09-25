import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

// =====================================================================
// این کلاینت فقط سمت سرور (API Routes) استفاده می‌شود و از
// SERVICE_ROLE_KEY بهره می‌برد که هرگز نباید به مرورگر ارسال شود.
// پکیج "ws" به‌عنوان transport پاس داده می‌شود چون Node.js < 22
// پیاده‌سازی native WebSocket ندارد و supabase-js برای راه‌اندازی
// کلاینت Realtime (حتی اگر استفاده نشود) به آن نیاز دارد.
// =====================================================================

let _client: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY تنظیم نشده‌اند");
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: ws as any },
  });

  return _client;
}
