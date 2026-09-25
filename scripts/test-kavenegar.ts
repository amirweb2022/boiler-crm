// تست مستقیم و سریع اتصال کاوه‌نگار، بدون نیاز به رفتن توی UI برنامه.
// اجرا: npx tsx --env-file=.env.local scripts/test-kavenegar.ts 09921103757
import { config } from "dotenv";
config({ path: ".env.local" });

import { KavenegarSmsProvider } from "../lib/sms/kavenegar";

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("استفاده: npx tsx --env-file=.env.local scripts/test-kavenegar.ts <phone>");
    process.exit(1);
  }

  console.log("در حال تست ارسال با تنظیمات:");
  console.log("KAVENEGAR_SENDER:", process.env.KAVENEGAR_SENDER);
  console.log("KAVENEGAR_API_KEY:", process.env.KAVENEGAR_API_KEY ? "تنظیم شده ✓" : "❌ خالی است");

  const provider = new KavenegarSmsProvider();
  const result = await provider.send({ phone, message: "پیام تستی از سامانه دیگ بخار" });

  console.log("\n--- نتیجه ---");
  console.log(result);
}

main();