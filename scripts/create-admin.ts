// اجرا: npx tsx --env-file=.env.local scripts/create-admin.ts <phone> <password> ["نام"] [admin|tester]
// نمونه ساخت ادمین کامل:  npx tsx --env-file=.env.local scripts/create-admin.ts 09121234567 "MyPassword123!" "مدیر سیستم" admin
// نمونه ساخت تستر:        npx tsx --env-file=.env.local scripts/create-admin.ts 09129876543 "TesterPass123!" "تستر خط تولید" tester
import { config } from "dotenv";
config({ path: ".env.local" });

import { getSupabaseServerClient } from "../lib/supabase/server";
import { hashPassword } from "../lib/auth";

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const VALID_ROLES = ["admin", "tester"];

async function main() {
  const [, , phone, password, fullName, roleArg] = process.argv;
  const role = roleArg ?? "admin";

  if (!phone || !password) {
    console.error('استفاده: npx tsx --env-file=.env.local scripts/create-admin.ts <phone> <password> ["نام"] [admin|tester]');
    process.exit(1);
  }

  if (!/^09\d{9}$/.test(phone)) {
    console.error("خطا: شماره موبایل باید به‌صورت 09xxxxxxxxx باشد");
    process.exit(1);
  }

  if (!STRONG_PASSWORD_REGEX.test(password)) {
    console.error("خطا: رمزعبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد");
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`خطا: نقش باید یکی از این‌ها باشد: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const db = getSupabaseServerClient();
  const passwordHash = await hashPassword(password);

  const { data, error } = await db
    .from("admins")
    .insert({ phone, password_hash: passwordHash, full_name: fullName ?? null, role })
    .select()
    .single();

  if (error) {
    console.error("خطا:", error.message);
    process.exit(1);
  }

  console.log(`✓ کاربر «${role}» ساخته شد:`, data.id, data.phone);
}

main();
