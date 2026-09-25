// اجرا برای دیدن نمونه‌ی دقیق متن پیامک یادآوری در کنسول (mock)، بدون
// نیاز به ساختن شرکت با تاریخ دقیق یا صبر کردن برای cron واقعی:
//
//   npx tsx --env-file=.env.local scripts/preview-sms.ts
//   npx tsx --env-file=.env.local scripts/preview-sms.ts 3 "پارس خزر"
//
// آرگومان اول: چند روز مانده (پیش‌فرض از SMS_REMINDER_DAYS_BEFORE یا 2)
// آرگومان دوم: نام شرکت نمونه (پیش‌فرض "شرکت نمونه")
import { config } from "dotenv";
config({ path: ".env.local" });

import { MockSmsProvider } from "../lib/sms/mock";

async function main() {
  const days = Number(process.argv[2] ?? process.env.SMS_REMINDER_DAYS_BEFORE ?? 2);
  const companyName = process.argv[3] ?? "شرکت نمونه";
  const samplePhone = "09121234567";

  // این دقیقاً همان قالب متنی است که app/api/sms/send-reminders/route.ts
  // در محیط واقعی می‌سازد — پیش‌نمایش، نه یک متن جداگانه.
  const message = `یادآوری: ${days} روز تا تاریخ آزمون دیگ بخار شرکت ${companyName} باقی مانده است. لطفاً هماهنگی لازم را انجام دهید.`;

  console.log("\n--- پیش‌نمایش پیامک یادآوری (Mock) ---\n");
  const provider = new MockSmsProvider();
  await provider.send({ phone: samplePhone, message });
  console.log("\n--------------------------------------\n");
}

main();
